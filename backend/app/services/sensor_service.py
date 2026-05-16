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


async def process_and_store_readings(db: AsyncSession, owner_id: str, data: dict) -> None:
    """
    Parses a dictionary of sensor data, stores it in the database,
    and runs delta/threshold evaluations to trigger automations.
    """
    # 0. Fetch sensor devices for this owner to map readings
    sensor_devices_result = await db.execute(
        select(Device).where(Device.owner_id == owner_id, Device.device_type == "sensor")
    )
    sensor_devices = sensor_devices_result.scalars().all()
    
    def get_device_id_for_reading(rtype: str) -> str | None:
        for d in sensor_devices:
            if d.capabilities and rtype in d.capabilities.get("reading_types", []):
                return d.id
        return None

    def parse_reading(key: str, default_unit: str) -> tuple[float, str] | None:
        if key not in data:
            return None
        raw = data[key]
        if isinstance(raw, dict):
            return float(raw.get("value", 0)), raw.get("unit", default_unit)
        else:
            return float(raw), default_unit

    # 1. Fetch previous readings to calculate deltas
    sensor_types = ["temperature", "humidity", "light_level", "motion", "smoke"]
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

    temp_data = parse_reading("temperature", "°C")
    if temp_data:
        readings.append(SensorReading(
            device_id=get_device_id_for_reading("temperature"),
            reading_type="temperature",
            value=temp_data[0], unit=temp_data[1]
        ))

    hum_data = parse_reading("humidity", "%")
    if hum_data:
        readings.append(SensorReading(
            device_id=get_device_id_for_reading("humidity"),
            reading_type="humidity",
            value=hum_data[0], unit=hum_data[1]
        ))

    light_data = parse_reading("light_level", "%")
    if light_data:
        readings.append(SensorReading(
            device_id=get_device_id_for_reading("light_level"),
            reading_type="light_level",
            value=light_data[0], unit=light_data[1]
        ))

    motion_data = parse_reading("motion", "bool")
    if motion_data:
        readings.append(SensorReading(
            device_id=get_device_id_for_reading("motion"),
            reading_type="motion",
            value=1.0 if motion_data[0] else 0.0, unit="bool"
        ))
        
    smoke_data = parse_reading("smoke", "ppm")
    if smoke_data:
        readings.append(SensorReading(
            device_id=get_device_id_for_reading("smoke"),
            reading_type="smoke",
            value=smoke_data[0], unit=smoke_data[1]
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

async def poll_and_store(db: AsyncSession, owner_id: str) -> dict | None:
    """
    Read sensors from ESP32 and store the readings in the database.
    Returns the sensor data dict, or None if ESP32 is unreachable.
    """
    try:
        data = await hardware_service.get_sensors()
    except HardwareError:
        return None
        
    await process_and_store_readings(db, owner_id, data)
    return data


async def get_latest_readings(db: AsyncSession) -> dict:
    """
    Fetch the most recent reading for each sensor type from the database,
    along with the device and room it belongs to.
    """
    from sqlalchemy.orm import selectinload
    sensor_types = ["temperature", "humidity", "light_level", "motion", "smoke"]
    result = {}

    for stype in sensor_types:
        query = (
            select(SensorReading)
            .where(SensorReading.reading_type == stype)
            .options(
                selectinload(SensorReading.device).selectinload(Device.room)
            )
            .order_by(desc(SensorReading.recorded_at))
            .limit(1)
        )
        row = await db.execute(query)
        reading = row.scalar_one_or_none()
        if reading:
            device_name = reading.device.name if reading.device else "Unknown Sensor"
            room_name = (reading.device.room.name if reading.device and reading.device.room else "Unknown Room")
            result[stype] = {
                "value": reading.value,
                "unit": reading.unit,
                "recorded_at": reading.recorded_at.isoformat(),
                "device_name": device_name,
                "room_name": room_name,
            }
        else:
            result[stype] = None

    return result
