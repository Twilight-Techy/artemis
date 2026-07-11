from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Device, ExecutionLog, User
from app.schemas import DeviceCreate, DeviceOut, DeviceCommand
from app.services.auth_service import get_current_user
from app.services import hardware_service
from app.services.hardware_service import HardwareError
from app.services import device_defaults

import asyncio

router = APIRouter(prefix="/devices", tags=["Devices"])

import httpx
from app.config import get_settings

@router.get("/discover")
async def discover_devices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)):
    """
    Returns the fixed hardware nodes provided by the Home_Automation firmware.
    Filters out any devices that are already registered in the database by name.
    """
    network_nodes = [
        {"name": "Ceiling Light", "device_type": "light", "protocol": "mqtt", "endpoint": "bulb1", "capabilities": {}},
        {"name": "Ambient LED Strip", "device_type": "light", "protocol": "mqtt", "endpoint": "bulb2", "capabilities": {}},
        {"name": "AC Unit", "device_type": "switch", "protocol": "mqtt", "endpoint": "socket1", "capabilities": {}},
        {"name": "Smart TV", "device_type": "switch", "protocol": "mqtt", "endpoint": "socket2", "capabilities": {}},
        {"name": "Studio Fan", "device_type": "fan", "protocol": "mqtt", "endpoint": "fan_speed", "capabilities": {"speeds": 3}},
        {"name": "Temp Sensor", "device_type": "sensor", "protocol": "mqtt", "endpoint": None, "capabilities": {"reading_types": ["temperature"]}},
        {"name": "Humidity Sensor", "device_type": "sensor", "protocol": "mqtt", "endpoint": None, "capabilities": {"reading_types": ["humidity"]}},
        {"name": "Motion Sensor", "device_type": "sensor", "protocol": "mqtt", "endpoint": None, "capabilities": {"reading_types": ["motion"]}}
    ]

    # Get currently registered device names to filter
    result = await db.execute(select(Device.name).where(Device.owner_id == current_user.id))
    registered_names = {row[0].lower() for row in result.all() if row[0]}

    unregistered_nodes = [
        node for node in network_nodes
        if node.get("name").lower() not in registered_names
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


@router.get("/{device_id}", response_model=DeviceOut)
async def get_device(
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
    return device


@router.post("/", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
async def create_device(
    body: DeviceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = body.model_dump()
    caps = device_defaults.default_capabilities(body.device_type, data.get("capabilities"))
    state = data.get("state")
    if state is None:
        state = device_defaults.default_state_for(body.device_type, caps)
    device = Device(
        name=data["name"],
        device_type=data["device_type"],
        protocol=data["protocol"],
        endpoint=data.get("endpoint"),
        room_id=data["room_id"],
        capabilities=caps,
        state=state,
        owner_id=current_user.id,
    )
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
        # Forward the full capability payload so the simulator can mirror local state changes.
        hw_response = await hardware_service.send_command(device.name, body.action, body.payload)
    except HardwareError as e:
        # Log the failed attempt, but still update local state as fallback
        hw_response = {"error": e.message}

    # Update local DB state
    if not device.state:
        device.state = {}
        
    device_state_copy = device.state.copy()
    if body.action in ("on", "activate"):
        device_state_copy["is_on"] = True
    elif body.action in ("off", "deactivate"):
        device_state_copy["is_on"] = False
    elif body.action in ("set", "set_color", "set_brightness", "set_speed"):
        if body.payload:
            device_state_copy.update(body.payload)
            
    device.state = device_state_copy

    # Log execution
    log = ExecutionLog(
        action_type="device_control",
        target_id=device.id,
        target_name=device.name,
        status="success" if hw_response and "error" not in hw_response else "failed",
        request_payload={"action": body.action, "payload": body.payload},
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

    prev_type = device.device_type
    prev_on = bool((device.state or {}).get("is_on"))
    type_changed = prev_type != body.device_type

    device.name = body.name
    device.device_type = body.device_type
    device.room_id = body.room_id
    device.protocol = body.protocol
    device.endpoint = body.endpoint

    if body.capabilities is not None:
        device.capabilities = device_defaults.default_capabilities(body.device_type, body.capabilities)
    elif type_changed:
        device.capabilities = device_defaults.default_capabilities(body.device_type, None)

    if body.state is not None:
        device.state = body.state
    elif type_changed:
        st = device_defaults.default_state_for(body.device_type, device.capabilities or {})
        st["is_on"] = prev_on
        device.state = st

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
