from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import ExecutionLog, User
from app.services.auth_service import get_current_user
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/logs", tags=["Logs"])

class ExecutionLogOut(BaseModel):
    id: str
    action_type: str
    target_id: Optional[str] = None
    target_name: Optional[str] = None
    status: str
    request_payload: Optional[dict] = None
    response_payload: Optional[dict] = None
    triggered_by: str
    user_id: str
    executed_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

@router.get("/", response_model=list[ExecutionLogOut])
async def get_history_logs(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(ExecutionLog)
        .where(ExecutionLog.user_id == current_user.id)
        .order_by(ExecutionLog.executed_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()
