from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import ChatMessage, ExecutionLog, User
from app.schemas import ChatMessageCreate, ChatMessageOut, ExecutionLogOut
from app.services.auth_service import get_current_user

router = APIRouter(tags=["Chat & History"])


# ═══════════════════════════════════════════════
# Chat Messages
# ═══════════════════════════════════════════════
@router.get("/chat", response_model=list[ChatMessageOut])
async def list_messages(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(desc(ChatMessage.created_at))
        .limit(limit)
    )
    messages = result.scalars().all()
    return list(reversed(messages))  # Return oldest-first for chat display


@router.post("/chat", response_model=ChatMessageOut, status_code=201)
async def create_message(
    body: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    msg = ChatMessage(**body.model_dump(), user_id=current_user.id)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


# ═══════════════════════════════════════════════
# Execution Logs (Audit Trail)
# ═══════════════════════════════════════════════
@router.get("/history", response_model=list[ExecutionLogOut])
async def list_execution_logs(
    limit: int = 50,
    action_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(ExecutionLog)
        .where(ExecutionLog.user_id == current_user.id)
        .order_by(desc(ExecutionLog.executed_at))
        .limit(limit)
    )
    if action_type:
        query = query.where(ExecutionLog.action_type == action_type)
    result = await db.execute(query)
    return result.scalars().all()
