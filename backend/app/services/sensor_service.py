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
    
    # 1. Fetch previous readings to calculate deltas
    sensor_types = ["temperature", "humidity", "light_level", "motion"]
    previous_readings = {}
    for stype in sensor_types:
        row = await db.execute(
            select(SensorReading)
            .where(SensorReading.reading_type == stype)
            .order_by(desc(SensorReading.recorded_at))
            .limit(1)
        )
        previous_readings[stype] = row.scalar_one_or_none()

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

    # --- Sensor Delta Filter & Event Trigger ---
    from app.services.automation_orchestrator import evaluate_event
    import asyncio
    
    events_triggered = []
    
    for r in readings:
        prev = previous_readings.get(r.reading_type)
        if prev is None:
            continue
            
        threshold_crossed = False
        
        # 1. Delta Checks
        if r.reading_type == "temperature" and abs(r.value - prev.value) >= 0.5:
            threshold_crossed = True
        elif r.reading_type == "humidity" and abs(r.value - prev.value) >= 5.0:
            threshold_crossed = True
        elif r.reading_type == "light_level" and abs(r.value - prev.value) >= 10.0:
            threshold_crossed = True
        elif r.reading_type == "motion" and r.value != prev.value:
            threshold_crossed = True
            
        # 2. Hard Boundary Crossing (Absolute max/min limits)
        if r.reading_type == "temperature":
            # Example hard limits: Too hot (>28) or Too cold (<18)
            if prev.value <= 28.0 and r.value > 28.0:
                threshold_crossed = True
                events_triggered.append("temperature crossed upper threshold to " + str(r.value))
            elif prev.value >= 18.0 and r.value < 18.0:
                threshold_crossed = True
                events_triggered.append("temperature crossed lower threshold to " + str(r.value))
                
        if r.reading_type == "humidity":
            # Example hard limits: Too dry (<30%) or Too humid (>70%)
            if prev.value <= 70.0 and r.value > 70.0:
                threshold_crossed = True
                events_triggered.append("humidity crossed upper threshold to " + str(r.value))
            elif prev.value >= 30.0 and r.value < 30.0:
                threshold_crossed = True
                events_triggered.append("humidity crossed lower threshold to " + str(r.value))
            
        if threshold_crossed and not any(r.reading_type in e for e in events_triggered):
            direction = "increased" if r.value > prev.value else "decreased"
            if r.reading_type == "motion":
                direction = "detected" if r.value == 1.0 else "cleared"
            events_triggered.append(f"{r.reading_type} {direction} to {r.value} {r.unit}")
            
    if events_triggered:
        event_reason = "Significant sensor changes: " + ", ".join(events_triggered)
        # Fire and forget the orchestrator
        asyncio.create_task(evaluate_event(owner_id, event_reason))

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
