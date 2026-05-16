from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
from app.services.auth_service import get_current_user
from app.services import hardware_service, sensor_service
from app.services.hardware_service import HardwareError

router = APIRouter(prefix="/sensors", tags=["Sensors & ESP32"])


@router.get("/live")
async def get_live_sensors(current_user: User = Depends(get_current_user)):
    """Proxy live sensor data directly from the ESP32 (no DB)."""
    try:
        return await hardware_service.get_sensors()
    except HardwareError as e:
        raise HTTPException(status_code=503, detail=e.message)


@router.get("/latest")
async def get_latest_sensors(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch the most recent stored reading for each sensor type."""
    return await sensor_service.get_latest_readings(db)


@router.post("/poll")
async def poll_sensors(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger a sensor poll from the ESP32 and store readings."""
    data = await sensor_service.poll_and_store(db, current_user.id)
    if data is None:
        raise HTTPException(status_code=503, detail="ESP32 unreachable")
    return {"status": "stored", "data": data}


@router.post("/ingest")
async def ingest_sensors(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Push endpoint for the ESP32 to report readings directly.
    No auth required (used by the microcontroller on the LAN).
    """
    # Since this is an unauthenticated push from the LAN, we need an owner_id 
    # to evaluate automations against. For simplicity, we grab the first user
    # (assuming single-tenant local hub for now).
    from app.models import User
    from sqlalchemy import select
    
    user_query = await db.execute(select(User).limit(1))
    admin_user = user_query.scalar_one_or_none()
    
    if admin_user:
        await sensor_service.process_and_store_readings(db, admin_user.id, payload)
        count = sum(1 for k in payload.keys() if k in ["temperature", "humidity", "light_level", "motion"])
        return {"status": "ingested", "count": count}
    
    return {"status": "failed", "detail": "No users configured to receive sensors"}


@router.get("/esp32/status")
async def get_esp32_status(current_user: User = Depends(get_current_user)):
    """Fetch ESP32 health info (uptime, memory, Wi-Fi signal)."""
    return await hardware_service.get_status()


@router.get("/esp32/relays")
async def get_esp32_relays(current_user: User = Depends(get_current_user)):
    """Get the current state of all relays on the ESP32."""
    try:
        return await hardware_service.get_relays()
    except HardwareError as e:
        raise HTTPException(status_code=503, detail=e.message)
