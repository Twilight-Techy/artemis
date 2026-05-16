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

router = APIRouter(prefix="/mcp", tags=["MCP Core"])

class ChatRequest(BaseModel):
    message: str

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
    context_str = await context_engine.gather_context(db, current_user.id)
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
        function_call = response.function_calls[0]
        tool_name = function_call.name
        args = function_call.args

        requires_approval = permission_engine.needs_approval(tool_name, args)

        if requires_approval:
            # We must ask the user
            action_id = str(uuid.uuid4())
            target_name = args.get("device_name") or args.get("function_name", "unknown")
            
            # Log as pending
            pending_log = ExecutionLog(
                id=action_id,
                action_type=tool_name,
                target_name=target_name,
                status="pending",
                # Store the original user message alongside args so approve_action
                # can reconstruct the full context for summarise_tool_result.
                request_payload={**args, "_user_message": body.message},
                triggered_by="mcp",
                user_id=current_user.id
            )
            db.add(pending_log)
            
            # Gemini returns a text part alongside the function call (per the system prompt rule).
            # Use it as the modal's question text — don't persist it to the DB so it never
            # appears in the chat history as a separate message.
            reasoning_text = (
                response.text.strip()
                if response.text
                else f"Want me to {tool_name.replace('_', ' ')} {target_name}?"
            )

            await db.commit()

            reasoning_trace = args.get("reasoning_trace")

            return ChatResponse(
                reply="",
                requires_approval=True,
                proactive_action=ProactiveActionResponse(
                    action_id=action_id,
                    action_type=tool_name,
                    target_name=target_name,
                    payload=args,
                    reasoning=reasoning_text,
                    reasoning_trace=reasoning_trace,
                )
            )
        else:
            # Auto-approve (silently modifier) — execute immediately and log it
            result = await exec_service.run_tool(
                db=db,
                user=current_user,
                action_type=tool_name,
                args=args,
                triggered_by="mcp",
                generate_summary=True,
                original_message=body.message,
            )
            reply_text = result["summary"]
            ast_msg = ChatMessage(
                role="assistant",
                content=reply_text,
                meta_info={"status": result["status"], "action_id": result["log_id"]},
                user_id=current_user.id
            )
            db.add(ast_msg)
            await db.commit()
            return ChatResponse(reply=reply_text, requires_approval=False)

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
    """Executes a previously pending tool call."""
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

    result = await exec_service.run_tool(
        db=db,
        user=current_user,
        action_type=log.action_type,
        args={k: v for k, v in args.items() if not k.startswith("_")},
        triggered_by="mcp",
        generate_summary=True,
        original_message=args.get("_user_message", f"{log.action_type} {log.target_name}"),
    )

    # Update the original pending log to reflect the outcome
    log.status = result["status"]
    log.response_payload = result["hw_response"]
    log.response_payload["summary"] = result["summary"]
    await db.commit()

    # Save the LLM confirmation as an assistant message
    sys_msg = ChatMessage(
        role="assistant",
        content=result["summary"],
        meta_info={"status": result["status"], "action_id": action_id},
        user_id=current_user.id
    )
    db.add(sys_msg)
    await db.commit()

    return {"status": result["status"], "action_id": action_id, "confirmation": result["summary"]}

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

