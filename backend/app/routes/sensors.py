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
    from app.models import SensorReading

    readings = []
    for sensor_type in ["temperature", "humidity", "light_level", "motion"]:
        if sensor_type in payload:
            readings.append(SensorReading(
                reading_type=sensor_type,
                value=float(payload[sensor_type].get("value", 0)),
                unit=payload[sensor_type].get("unit", ""),
            ))

    for r in readings:
        db.add(r)
    await db.commit()

    return {"status": "ingested", "count": len(readings)}


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
