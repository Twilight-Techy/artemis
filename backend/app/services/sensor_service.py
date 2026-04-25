"""
Sensor Service
──────────────
Polls the ESP32 for sensor data and persists readings to the database.
Also provides a push endpoint for the ESP32 to report readings directly.
"""

from datetime import datetime
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import SensorReading, Device
from app.services import hardware_service
from app.services.hardware_service import HardwareError


async def poll_and_store(db: AsyncSession, owner_id: str) -> dict | None:
    """
    Read sensors from ESP32 and store the readings in the database.
    Returns the sensor data dict, or None if ESP32 is unreachable.
    """
    try:
        data = await hardware_service.get_sensors()
    except HardwareError:
        return None

    # Find devices that are sensors for this owner
    # We store readings keyed by type regardless of specific device
    readings = []

    if "temperature" in data:
        readings.append(SensorReading(
            device_id=None,  # Will be linked if a sensor device exists
            reading_type="temperature",
            value=data["temperature"]["value"],
            unit=data["temperature"].get("unit", "°C"),
        ))

    if "humidity" in data:
        readings.append(SensorReading(
            device_id=None,
            reading_type="humidity",
            value=data["humidity"]["value"],
            unit=data["humidity"].get("unit", "%"),
        ))

    if "light_level" in data:
        readings.append(SensorReading(
            device_id=None,
            reading_type="light_level",
            value=data["light_level"]["value"],
            unit=data["light_level"].get("unit", "%"),
        ))

    if "motion" in data:
        readings.append(SensorReading(
            device_id=None,
            reading_type="motion",
            value=1.0 if data["motion"]["value"] else 0.0,
            unit="bool",
        ))

    for r in readings:
        db.add(r)
    await db.commit()

    return data


async def get_latest_readings(db: AsyncSession) -> dict:
    """
    Fetch the most recent reading for each sensor type from the database.
    """
    sensor_types = ["temperature", "humidity", "light_level", "motion"]
    result = {}

    for stype in sensor_types:
        query = (
            select(SensorReading)
            .where(SensorReading.reading_type == stype)
            .order_by(desc(SensorReading.recorded_at))
            .limit(1)
        )
        row = await db.execute(query)
        reading = row.scalar_one_or_none()
        if reading:
            result[stype] = {
                "value": reading.value,
                "unit": reading.unit,
                "recorded_at": reading.recorded_at.isoformat(),
            }
        else:
            result[stype] = None

    return result
