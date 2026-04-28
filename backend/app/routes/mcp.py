from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import uuid

from app.database import get_db
from app.models import User, ChatMessage, ExecutionLog
from app.services.auth_service import get_current_user
from app.services import gemini_service, context_engine, permission_engine, hardware_service

router = APIRouter(prefix="/mcp", tags=["MCP Core"])

class ChatRequest(BaseModel):
    message: str

class ProactiveActionResponse(BaseModel):
    action_id: str
    action_type: str
    target_name: str
    payload: dict
    reasoning: str

class ChatResponse(BaseModel):
    reply: str
    requires_approval: bool = False
    proactive_action: ProactiveActionResponse | None = None

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
    response = await gemini_service.chat_with_artemis(body.message, context_str, history)
    
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
                request_payload=args,
                triggered_by="mcp",
                user_id=current_user.id
            )
            db.add(pending_log)
            
            # Also save a placeholder assistant message so history flows
            ast_msg = ChatMessage(
                role="assistant",
                content=f"I've evaluated the situation and suggest we call `{tool_name}` for `{target_name}`.",
                meta_info={"action_id": action_id},
                user_id=current_user.id
            )
            db.add(ast_msg)
            await db.commit()

            return ChatResponse(
                reply=ast_msg.content,
                requires_approval=True,
                proactive_action=ProactiveActionResponse(
                    action_id=action_id,
                    action_type=tool_name,
                    target_name=target_name,
                    payload=args,
                    reasoning=f"Based on your request, I propose adjusting {target_name}." # Simple reasoning
                )
            )
        else:
            # Auto-approve (e.g. read sensors). Ideally we'd recursively call the model with the tool output.
            # Simplified for now: just return a canned response that we executed an auto tool.
            # In a full flow we'd await the tool and pass back to Gemini.
            pass

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
    from sqlalchemy import select
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

    args = log.request_payload
    
    try:
        if log.action_type == "execute_function":
            function_name = args.get("function_name")
            parameters = args.get("parameters", {})
            # Add execution logic here or dispatch to automation engine
            hw_response = {"status": "Function executed locally", "function": function_name, "params": parameters}
            log.status = "success"
            log.response_payload = hw_response
            log.target_name = function_name
            
        elif log.action_type == "control_device":
            device_name = args.get("device_name")
            action = args.get("action")
            payload = args.get("payload")
            hw_response = await hardware_service.send_command(device_name, action, payload)
            log.status = "success"
            log.response_payload = hw_response
            log.target_name = device_name
            
        else:
            raise hardware_service.HardwareError(f"Unknown action type {log.action_type}")
            
    except hardware_service.HardwareError as e:
        log.status = "failed"
        log.response_payload = {"error": e.message}

    # Save system diagnostic message
    sys_msg = ChatMessage(
        role="system",
        content=f"Executed: {log.target_name} -> {log.action_type}",
        meta_info={"status": log.status, "action_id": action_id},
        user_id=current_user.id
    )
    db.add(sys_msg)
    await db.commit()

    return {"status": log.status, "action_id": action_id}

@router.post("/decline/{action_id}")
async def decline_action(
    action_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Declines and dismisses a pending tool call."""
    from sqlalchemy import select
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

