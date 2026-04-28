from datetime import datetime
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Device, SensorReading, Automation, ChatMessage
from app.services import sensor_service

async def gather_context(db: AsyncSession, user_id: str) -> str:
    """
    Gathers environment context for the AI, formatted as a readable string.
    Includes time, device states, sensor readings, and automations.
    """
    now = datetime.utcnow()
    context_lines = [
        f"CURRENT TIME: {now.strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"DAY OF WEEK: {now.strftime('%A')}"
    ]

    # Gather latest sensor readings
    context_lines.append("\n--- SENSOR READINGS ---")
    latest_sensors = await sensor_service.get_latest_readings(db)
    if latest_sensors:
        for stype, data in latest_sensors.items():
            if data:
                context_lines.append(f"{stype.capitalize()}: {data['value']} {data['unit']}")
            else:
                context_lines.append(f"{stype.capitalize()}: Unknown")
    else:
        context_lines.append("No sensor data available.")

    # Gather device states
    context_lines.append("\n--- DEVICE STATES ---")
    devices_result = await db.execute(select(Device).where(Device.owner_id == user_id))
    devices = devices_result.scalars().all()
    if devices:
        for d in devices:
            safe_type = getattr(d.device_type, "value", d.device_type)
            state_str = str(d.state) if d.state else "OFF"
            context_lines.append(f"{d.name} ({safe_type}): State={state_str} - Online: {d.is_online}")
    else:
        context_lines.append("No devices registered.")

    # Gather automations
    context_lines.append("\n--- ACTIVE AUTOMATIONS ---")
    automations_result = await db.execute(
        select(Automation).where(Automation.owner_id == user_id, Automation.is_enabled == True)
    )
    automations = automations_result.scalars().all()
    if automations:
        for a in automations:
            context_lines.append(f"Rule '{a.name}': WHEN {a.trigger} IF {a.condition} THEN {a.action}")
    else:
        context_lines.append("No active automations.")

    return "\n".join(context_lines)

async def get_recent_history(db: AsyncSession, user_id: str, limit: int = 10) -> list[dict]:
    """Retrieve the recent conversation history to provide to the model."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .order_by(desc(ChatMessage.created_at))
        .limit(limit)
    )
    messages = result.scalars().all()
    messages.reverse()  # Chronological order
    
    formatted_history = []
    for msg in messages:
        formatted_history.append({
            "role": "model" if msg.role == "assistant" else (msg.role if msg.role != "system" else "model"),
            "parts": [{"text": msg.content}]
        })
    return formatted_history
