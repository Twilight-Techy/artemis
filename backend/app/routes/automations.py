from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Automation, User
from app.schemas import AutomationCreate, AutomationOut
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/automations", tags=["Automations"])


@router.get("/", response_model=list[AutomationOut])
async def list_automations(
    automation_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Automation).where(Automation.owner_id == current_user.id)
    if automation_type:
        query = query.where(Automation.automation_type == automation_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=AutomationOut, status_code=status.HTTP_201_CREATED)
async def create_automation(
    body: AutomationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    automation = Automation(**body.model_dump(), owner_id=current_user.id)
    db.add(automation)
    await db.commit()
    await db.refresh(automation)
    return automation


@router.put("/{automation_id}", response_model=AutomationOut)
async def update_automation(
    automation_id: str,
    body: AutomationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Automation).where(Automation.id == automation_id, Automation.owner_id == current_user.id)
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found")

    for key, value in body.model_dump().items():
        setattr(automation, key, value)

    await db.commit()
    await db.refresh(automation)
    return automation


@router.patch("/{automation_id}/toggle", response_model=AutomationOut)
async def toggle_automation(
    automation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Enable or disable an automation."""
    result = await db.execute(
        select(Automation).where(Automation.id == automation_id, Automation.owner_id == current_user.id)
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found")

    automation.is_enabled = not automation.is_enabled
    await db.commit()
    await db.refresh(automation)
    return automation


@router.delete("/{automation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_automation(
    automation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Automation).where(Automation.id == automation_id, Automation.owner_id == current_user.id)
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found")
    await db.delete(automation)
    await db.commit()
