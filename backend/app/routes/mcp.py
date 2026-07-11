from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
import uuid

from app.database import get_db
from app.models import User, ChatMessage, ExecutionLog
from app.services.auth_service import get_current_user
from app.services import gemini_service, context_engine, permission_engine, hardware_service, executor as exec_service
from app.services.gemini_service import GeminiQuotaError, GeminiServiceError
from app.services import notification_service

router = APIRouter(prefix="/mcp", tags=["MCP Core"])

class ChatRequest(BaseModel):
    message: str
    current_room_id: str | None = None

class ProactiveActionResponse(BaseModel):
    action_id: str
    action_type: str
    target_name: str
    payload: dict
    reasoning: str
    reasoning_trace: str | None = None

class ChatResponse(BaseModel):
    reply: str
    requires_approval: bool = False
    proactive_action: ProactiveActionResponse | None = None

@router.post("/transcribe")
async def transcribe_endpoint(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Transcribe audio upload using Gemini API."""
    try:
        audio_bytes = await audio.read()
        mime_type = audio.content_type or "audio/mp4"
        transcript = await gemini_service.transcribe_audio(audio_bytes, mime_type)
        if not transcript:
            raise HTTPException(status_code=500, detail="Transcription returned empty or failed.")
        return {"transcript": transcript}
    except GeminiQuotaError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except GeminiServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_history(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve chat history + execution logs as a merged timeline."""
    # 1. Fetch chat messages
    chat_query = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
    )
    chat_msgs = chat_query.scalars().all()

    # 2. Fetch execution logs
    log_query = await db.execute(
        select(ExecutionLog)
        .where(ExecutionLog.user_id == current_user.id)
        .order_by(ExecutionLog.executed_at.asc())
        .limit(limit)
    )
    exec_logs = log_query.scalars().all()

    # 3. Build a unified timeline
    timeline = []

    for m in chat_msgs:
        ts = m.created_at.strftime("%I:%M %p").lstrip("0")
        timeline.append({
            "id": m.id,
            "role": m.role,
            "text": m.content,
            "timestamp": ts,
            "meta_info": m.meta_info,
            "sort_key": m.created_at.isoformat(),
        })

    # Track which action IDs are already represented by system chat messages
    existing_action_ids = set()
    for m in chat_msgs:
        if m.role in ("system", "assistant") and m.meta_info and m.meta_info.get("action_id"):
            existing_action_ids.add(m.meta_info["action_id"])

    # Add execution logs that don't already have a matching system message
    for log in exec_logs:
        if log.id in existing_action_ids:
            continue

        ts = log.executed_at.strftime("%I:%M %p").lstrip("0")
        description = log.response_payload.get("description", "") if log.response_payload else ""
        status_emoji = "✓" if log.status == "success" else ("✗" if log.status == "failed" else "⏳")

        timeline.append({
            "id": f"action-{log.id}",
            "role": "action",
            "text": f"{status_emoji} {log.target_name or log.action_type}",
            "timestamp": ts,
            "meta_info": {
                "action_type": log.action_type,
                "status": log.status,
                "triggered_by": log.triggered_by,
                "description": description,
            },
            "sort_key": log.executed_at.isoformat(),
        })

    # 4. Sort by time
    timeline.sort(key=lambda x: x["sort_key"])

    # Remove sort_key before sending to client
    for item in timeline:
        item.pop("sort_key", None)

    return {"messages": timeline}

@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Permanently delete all chat messages for the authenticated user."""
    await db.execute(
        delete(ChatMessage).where(ChatMessage.user_id == current_user.id)
    )
    await db.commit()


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Save user message
    user_msg = ChatMessage(
        role="user",
        content=body.message,
        user_id=current_user.id
    )
    db.add(user_msg)
    await db.commit()

    # 2. Gather context
    context_str = await context_engine.gather_context(db, current_user.id, body.current_room_id)
    history = await context_engine.get_recent_history(db, current_user.id, limit=5)

    # 3. Call Gemini
    try:
        response = await gemini_service.chat_with_artemis(body.message, context_str, history)
    except GeminiQuotaError as e:
        raise HTTPException(
            status_code=429,
            detail=str(e)
        )
    except GeminiServiceError as e:
        raise HTTPException(
            status_code=503,
            detail=str(e)
        )
    
    if not response:
        raise HTTPException(status_code=503, detail="Gemini service unavailable.")

    # 4. Check for function calls
    if response.function_calls:
        # Check if ANY function requires approval
        requires_approval = any(
            permission_engine.needs_approval(call.name, call.args) 
            for call in response.function_calls
        )

        actions_list = [
            {"tool_name": call.name, "args": dict(call.args)}
            for call in response.function_calls
        ]
        
        target_names = [call.args.get("device_name") or call.args.get("function_name", "unknown") for call in response.function_calls]
        target_name_str = ", ".join(target_names)
        
        # Determine the primary action type for logging/display
        tool_name_str = "batch_execution" if len(actions_list) > 1 else actions_list[0]["tool_name"]

        if requires_approval:
            # We must ask the user
            action_id = str(uuid.uuid4())
            
            # Log as pending
            pending_log = ExecutionLog(
                id=action_id,
                action_type=tool_name_str,
                target_name=target_name_str,
                status="pending",
                request_payload={"actions": actions_list, "_user_message": body.message},
                triggered_by="mcp",
                user_id=current_user.id
            )
            db.add(pending_log)
            
            # Gemini returns a text part alongside the function call (per the system prompt rule).
            reasoning_text = (
                response.text.strip()
                if response.text
                else f"Want me to execute these actions on {target_name_str}?"
            )

            await db.commit()

            reasoning_trace = response.function_calls[0].args.get("reasoning_trace") if response.function_calls else None

            # Fire push notification so the user can approve even if outside the app
            if current_user.push_token:
                await notification_service.send_push_notification(
                    token=current_user.push_token,
                    title="🤖 Artemis needs your approval",
                    body=reasoning_text,
                    data={
                        "action_id": action_id,
                        "action_type": tool_name_str,
                        "target_name": target_name_str,
                        "reasoning": reasoning_text,
                        "reasoning_trace": reasoning_trace or "",
                    }
                )

            return ChatResponse(
                reply="",
                requires_approval=True,
                proactive_action=ProactiveActionResponse(
                    action_id=action_id,
                    action_type=tool_name_str,
                    target_name=target_name_str,
                    payload={"actions": actions_list}, # Send the list to the UI
                    reasoning=reasoning_text,
                    reasoning_trace=reasoning_trace,
                )
            )
        else:
            # Auto-approve (silently modifier) — execute all immediately and log them
            combined_summaries = []
            final_status = "success"
            
            for idx, action in enumerate(actions_list):
                result = await exec_service.run_tool(
                    db=db,
                    user=current_user,
                    action_type=action["tool_name"],
                    args=action["args"],
                    triggered_by="mcp",
                    generate_summary=(idx == len(actions_list) - 1), # Only ask LLM to summarize on the last one
                    original_message=body.message,
                    history=history,
                )
                
                # If we're not generating a summary for this step, just append a basic success msg
                if not result.get("summary"):
                    result["summary"] = f"Executed {action['tool_name']} on {action['args'].get('device_name') or action['args'].get('function_name', 'unknown')}."
                    
                combined_summaries.append(result["summary"])
                if result["status"] == "failed":
                    final_status = "failed"

            reply_text = " ".join(combined_summaries)

            # Save the combined summary as an assistant message
            ast_msg = ChatMessage(
                role="assistant",
                content=reply_text,
                meta_info={"status": final_status, "tools_used": len(actions_list)},
                user_id=current_user.id
            )
            db.add(ast_msg)
            await db.commit()

            return ChatResponse(
                reply=reply_text,
                requires_approval=False
            )

    # 5. It's a text reply
    reply_text = response.text if response.text else "I've handled that for you."
    
    ast_msg = ChatMessage(
        role="assistant",
        content=reply_text,
        user_id=current_user.id
    )
    db.add(ast_msg)
    await db.commit()

    return ChatResponse(
        reply=reply_text,
        requires_approval=False
    )

@router.post("/approve/{action_id}")
async def approve_action(
    action_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Executes a previously pending tool call (or batch of tool calls)."""
    log_query = await db.execute(
        select(ExecutionLog).where(
            ExecutionLog.id == action_id,
            ExecutionLog.user_id == current_user.id,
            ExecutionLog.status == "pending"
        )
    )
    log = log_query.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Pending action not found")

    args = log.request_payload or {}
    
    # Check if this is a new batch format or an old single-action format
    actions_to_run = args.get("actions", [{"tool_name": log.action_type, "args": {k: v for k, v in args.items() if not k.startswith("_")}}])
    
    combined_summaries = []
    combined_responses = []
    final_status = "success"

    # Fetch history for context
    history = await context_engine.get_recent_history(db, current_user.id, limit=5)
    
    for idx, action in enumerate(actions_to_run):
        result = await exec_service.run_tool(
            db=db,
            user=current_user,
            action_type=action["tool_name"],
            args=action["args"],
            triggered_by="mcp",
            generate_summary=(idx == len(actions_to_run) - 1), # Only summarize on the last one
            original_message=args.get("_user_message", f"{log.action_type} {log.target_name}"),
            history=history,
        )
        
        if not result.get("summary"):
            result["summary"] = f"Executed {action['tool_name']} on {action['args'].get('device_name') or action['args'].get('function_name', 'unknown')}."
            
        combined_summaries.append(result["summary"])
        combined_responses.append(result["hw_response"])
        if result["status"] == "failed":
            final_status = "failed"

    # Update the original pending log to reflect the outcome
    log.status = final_status
    log.response_payload = {"responses": combined_responses, "summary": " ".join(combined_summaries)}
    await db.commit()

    # Save the LLM confirmation as an assistant message
    sys_msg = ChatMessage(
        role="assistant",
        content=" ".join(combined_summaries),
        meta_info={"status": final_status, "action_id": action_id},
        user_id=current_user.id
    )
    db.add(sys_msg)
    await db.commit()

    return {"status": final_status, "action_id": action_id, "confirmation": " ".join(combined_summaries)}

@router.post("/decline/{action_id}")
async def decline_action(
    action_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Declines and dismisses a pending tool call."""
    log_query = await db.execute(
        select(ExecutionLog).where(
            ExecutionLog.id == action_id,
            ExecutionLog.user_id == current_user.id,
            ExecutionLog.status == "pending"
        )
    )
    log = log_query.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Pending action not found")

    log.status = "declined"
    
    sys_msg = ChatMessage(
        role="system",
        content="Action declined by user.",
        meta_info={"status": "declined", "action_id": action_id},
        user_id=current_user.id
    )
    db.add(sys_msg)
    await db.commit()
    
    return {"status": "declined", "action_id": action_id}


@router.get("/pending/{action_id}")
async def get_pending_action(
    action_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetches a pending action by ID — used by the app when woken via a push notification."""
    log_query = await db.execute(
        select(ExecutionLog).where(
            ExecutionLog.id == action_id,
            ExecutionLog.user_id == current_user.id,
        )
    )
    log = log_query.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Action not found")

    args = log.request_payload or {}
    return {
        "action_id": log.id,
        "action_type": log.action_type,
        "target_name": log.target_name,
        "status": log.status,
        "payload": {k: v for k, v in args.items() if not k.startswith("_")},
        "reasoning": args.get("_reasoning", f"Artemis wants to {log.action_type.replace('_', ' ')} {log.target_name}"),
        "reasoning_trace": args.get("reasoning_trace"),
    }
