from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Device, ExecutionLog, Function, User
from app.schemas import FunctionCreate, FunctionOut
from app.services.auth_service import get_current_user
from app.services import hardware_service
from app.services.hardware_service import HardwareError
import httpx

router = APIRouter(prefix="/functions", tags=["Functions"])


@router.get("/", response_model=list[FunctionOut])
async def list_functions(
    function_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Function).where(Function.owner_id == current_user.id)
    if function_type:
        query = query.where(Function.function_type == function_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=FunctionOut, status_code=status.HTTP_201_CREATED)
async def create_function(
    body: FunctionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = body.model_dump()
    # Serialise DeviceActionItem objects to plain dicts for JSON storage
    if data.get("device_actions"):
        data["device_actions"] = [
            da if isinstance(da, dict) else da.model_dump()
            for da in (body.device_actions or [])
        ]
    fn = Function(**data, owner_id=current_user.id)
    db.add(fn)
    await db.commit()
    await db.refresh(fn)
    return fn


@router.put("/{function_id}", response_model=FunctionOut)
async def update_function(
    function_id: str,
    body: FunctionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Function).where(Function.id == function_id, Function.owner_id == current_user.id)
    )
    fn = result.scalar_one_or_none()
    if not fn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Function not found")

    data = body.model_dump()
    if data.get("device_actions"):
        data["device_actions"] = [
            da if isinstance(da, dict) else da.model_dump()
            for da in (body.device_actions or [])
        ]
    for key, value in data.items():
        setattr(fn, key, value)

    await db.commit()
    await db.refresh(fn)
    return fn


from pydantic import BaseModel

class ExecutePayload(BaseModel):
    parameters: dict | None = None

@router.post("/{function_id}/execute")
async def execute_function(
    function_id: str,
    payload: ExecutePayload | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Execute a registered function: fires all device actions then dispatches the HTTP call."""
    from app.services import function_service
    params = payload.parameters if payload else None
    try:
        return await function_service.execute_function(db, function_id, current_user, parameters=params)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{function_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_function(
    function_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Function).where(Function.id == function_id, Function.owner_id == current_user.id)
    )
    fn = result.scalar_one_or_none()
    if not fn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Function not found")
    await db.delete(fn)
    await db.commit()
