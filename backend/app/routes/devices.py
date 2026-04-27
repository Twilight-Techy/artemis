from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Device, ExecutionLog, User
from app.schemas import DeviceCreate, DeviceOut, DeviceCommand
from app.services.auth_service import get_current_user
from app.services import hardware_service
from app.services.hardware_service import HardwareError

import asyncio

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("/discover")
async def discover_devices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)):
    """
    Scans the local network for available hardware nodes.
    Filters out any devices that are already registered in the database.
    """
    # Simulate network sweep delay
    await asyncio.sleep(2.5) 
    
    # 1. Mock physical devices discovered on the network
    network_nodes = [
       {
           "id": "esp32-node-b49",
           "name": "ESP32 Relay Node",
           "device_type": "switch",
           "protocol": "http",
           "endpoint": "http://10.27.73.155:80"
       },
       {
           "id": "zigbee-bridge-1",
           "name": "Lumina Smart Bulb",
           "device_type": "light",
           "protocol": "mqtt",
           "endpoint": "mqtt://10.27.73.100:1883"
       }
    ]

    # 2. Get currently registered device endpoints
    result = await db.execute(select(Device.endpoint).where(Device.owner_id == current_user.id))
    registered_endpoints = {row[0] for row in result.all() if row[0]}

    # 3. Filter out nodes we already know about
    unregistered_nodes = [
        node for node in network_nodes
        if node["endpoint"] not in registered_endpoints
    ]

    return unregistered_nodes


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

    # Dispatch to ESP32 hardware bridge
    hw_response = None
    try:
        hw_response = await hardware_service.send_command(device.name, body.action, body.value)
    except HardwareError as e:
        # Log the failed attempt, but still update local state as fallback
        hw_response = {"error": e.message}

    # Update local DB state
    if body.action in ("on", "activate"):
        device.is_active = True
    elif body.action in ("off", "deactivate"):
        device.is_active = False
    elif body.action == "set":
        device.current_value = body.value

    # Log execution
    log = ExecutionLog(
        action_type="device_control",
        target_id=device.id,
        target_name=device.name,
        status="success" if hw_response and "error" not in hw_response else "failed",
        request_payload={"action": body.action, "value": body.value},
        response_payload=hw_response,
        triggered_by="user",
        user_id=current_user.id,
    )
    db.add(log)

    await db.commit()
    await db.refresh(device)
    return device

@router.put("/{device_id}", response_model=DeviceOut)
async def update_device(
    device_id: str,
    body: DeviceCreate, # Using DeviceCreate as we update all fields
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device).where(Device.id == device_id, Device.owner_id == current_user.id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    
    device.name = body.name
    device.device_type = body.device_type
    device.room_id = body.room_id
    device.protocol = body.protocol
    device.endpoint = body.endpoint
    
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
