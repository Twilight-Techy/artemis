from datetime import datetime
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
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
                room = data.get('room_name', 'Unknown Room')
                dev = data.get('device_name', 'Unknown Sensor')
                context_lines.append(f"{stype.capitalize()} ({dev} in {room}): {data['value']} {data['unit']}")
            else:
                context_lines.append(f"{stype.capitalize()}: Unknown")
    else:
        context_lines.append("No sensor data available.")

    # Gather device states
    context_lines.append("\n--- DEVICE STATES ---")
    devices_result = await db.execute(
        select(Device)
        .where(Device.owner_id == user_id)
        .options(selectinload(Device.room))
    )
    devices = devices_result.scalars().all()
    if devices:
        for d in devices:
            safe_type = getattr(d.device_type, "value", d.device_type)
            state_str = str(d.state) if d.state else "OFF"
            room_name = d.room.name if d.room else "Unknown Room"
            context_lines.append(
                f"{d.name} ({safe_type}) in {room_name}: State={state_str} - Online: {d.is_online}"
            )
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
            desc_str = f" - {a.description}" if a.description else ""
            context_lines.append(f"Rule '{a.name}': WHEN {a.trigger} IF {a.condition} THEN {a.action}{desc_str}")
    else:
        context_lines.append("No active automations.")

    # Gather functions
    context_lines.append("\n--- AVAILABLE FUNCTIONS ---")
    from app.models import Function
    functions_result = await db.execute(
        select(Function).where(Function.owner_id == user_id, Function.is_enabled == True)
    )
    functions = functions_result.scalars().all()
    if functions:
        for f in functions:
            fn_desc = f"Function '{f.name}': Type={f.function_type}, Description={f.description or 'None'}"
            if f.triggers:
                fn_desc += f", Triggers={', '.join(f.triggers)}"
            if f.conditions:
                fn_desc += f", Conditions={', '.join(f.conditions)}"
            if f.device_actions:
                action_strs = []
                for da in f.device_actions:
                    dev_id = da.get("device_id")
                    dev_name = next((d.name for d in devices if d.id == dev_id), "Unknown Device")
                    action_str = f"{dev_name} -> {da.get('action')}"
                    if da.get("value"):
                        action_str += f" ({da.get('value')})"
                    action_strs.append(action_str)
                if action_strs:
                    fn_desc += f", Actions=[{', '.join(action_strs)}]"
            
            if f.function_type in ("software", "hybrid") and f.url:
                fn_desc += f", HTTP=[{f.method} {f.url}]"
                
            if f.parameters:
                fn_desc += f", Required Parameters=[{', '.join(f.parameters)}]"

            context_lines.append(fn_desc)
    else:
        context_lines.append("No functions available.")

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
