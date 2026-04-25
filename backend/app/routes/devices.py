from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Device, User
from app.schemas import DeviceCreate, DeviceOut, DeviceCommand
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("/", response_model=list[DeviceOut])
async def list_devices(
    room_id: str | None = None,
    device_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Device).where(Device.owner_id == current_user.id)
    if room_id:
        query = query.where(Device.room_id == room_id)
    if device_type:
        query = query.where(Device.device_type == device_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
async def create_device(
    body: DeviceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    device = Device(**body.model_dump(), owner_id=current_user.id)
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return device


@router.post("/{device_id}/command", response_model=DeviceOut)
async def send_command(
    device_id: str,
    body: DeviceCommand,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a control command to a device (on/off/set value)."""
    result = await db.execute(
        select(Device).where(Device.id == device_id, Device.owner_id == current_user.id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    # TODO: Dispatch actual command to hardware bridge via HTTP/MQTT
    # For now, update the local state
    if body.action == "on":
        device.is_active = True
    elif body.action == "off":
        device.is_active = False
    elif body.action == "set":
        device.current_value = body.value

    await db.commit()
    await db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device).where(Device.id == device_id, Device.owner_id == current_user.id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    await db.delete(device)
    await db.commit()
