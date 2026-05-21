from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import BridgeCommand

router = APIRouter(prefix="/bridge", tags=["ESP32 Bridge"])


class BridgeCommandResult(BaseModel):
    status: str
    result: dict | None = None
    error: str | None = None


def verify_esp32_token(authorization: str | None) -> None:
    settings = get_settings()
    if not settings.esp32_auth_token:
        return

    expected = f"Bearer {settings.esp32_auth_token}"
    if authorization != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ESP32 authorization token",
        )


@router.get("/commands/next")
async def get_next_command(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    verify_esp32_token(authorization)

    result = await db.execute(
        select(BridgeCommand)
        .where(BridgeCommand.status == "pending")
        .order_by(BridgeCommand.created_at)
        .limit(1)
    )
    command = result.scalar_one_or_none()
    if not command:
        return {"command": None}

    command.status = "dispatched"
    command.dispatched_at = datetime.utcnow()
    await db.commit()
    await db.refresh(command)

    return {
        "command": {
            "id": command.id,
            "target_name": command.target_name,
            "pin": command.pin,
            "action": command.action,
            "value": command.value,
            "payload": command.payload,
        }
    }


@router.post("/commands/{command_id}/result")
async def post_command_result(
    command_id: str,
    body: BridgeCommandResult,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    verify_esp32_token(authorization)

    result = await db.execute(select(BridgeCommand).where(BridgeCommand.id == command_id))
    command = result.scalar_one_or_none()
    if not command:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Command not found")

    command.status = "success" if body.status == "success" else "failed"
    command.result = body.result
    command.error = body.error
    command.completed_at = datetime.utcnow()
    await db.commit()

    return {"status": "recorded"}
