"""
ESP32 Hardware Bridge Service
─────────────────────────────
Communicates with the Artemis ESP32 over MQTT (HiveMQ Cloud).
Handles relay control and device health stubbing.
"""

import json
import asyncio
import aiomqtt
import uuid
from datetime import datetime
from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models import BridgeCommand

settings = get_settings()

class HardwareError(Exception):
    """Raised when ESP32 communication fails."""
    def __init__(self, message: str, status_code: int | None = None):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


# ═══════════════════════════════════════════════
# Device Status / Health
# ═══════════════════════════════════════════════
async def get_status() -> dict:
    """
    Fetch ESP32 health info.
    Since we are purely MQTT now, we assume online if broker is configured.
    """
    if settings.mqtt_broker:
        return {
            "device": "artemis-hub",
            "status": "online",
            "mode": "mqtt-only",
            "checked_at": datetime.utcnow().isoformat(),
        }
    return {
        "device": "artemis-hub",
        "status": "offline",
        "error": "MQTT Broker not configured",
        "checked_at": datetime.utcnow().isoformat(),
    }


# ═══════════════════════════════════════════════
# Relay Control
# ═══════════════════════════════════════════════

# Map device names / types to ESP32 payload keys
DEVICE_KEY_MAP = {
    "ceiling light": "bulb1",
    "desk lamp": "bulb2",
    "smart tv plug": "socket1",
    "coffee maker plug": "socket2",
    "standing fan": "fan_speed",
    
    # Aliases
    "bulb 1": "bulb1",
    "bulb 2": "bulb2",
    "socket 1": "socket1",
    "socket 2": "socket2",
    "fan": "fan_speed",
    "light": "bulb1",
    "smart tv": "socket1",
    "coffee maker": "socket2",
}


async def send_command(device_name: str, action: str, value: str | int | float | bool | dict | None = None) -> dict:
    """
    Send a control command to the ESP32 via MQTT to `room/command`.

    Args:
        device_name: Human-readable name (e.g., "ceiling light", "studio fan")
        action: "on" or "off"
        value: Optional scalar (e.g. fan speed 1, 2, 3)

    Returns:
        ESP32 response dict.
    """
    # Resolve device name to JSON key
    target_key = DEVICE_KEY_MAP.get(device_name.lower())
    if target_key is None:
        raise HardwareError(f"Unknown device: '{device_name}'. Known: {list(DEVICE_KEY_MAP.keys())}")

    # Normalize power actions
    normalized_action = action.lower()
    
    cmd_payload = {}
    
    if target_key == "fan_speed":
        # Handle fan speed specifically
        if normalized_action in ("off", "false", "0", "deactivate"):
            cmd_payload["fan_speed"] = 0
        else:
            # Default to speed 3 if turned on without value, otherwise use value
            speed = 3
            if value is not None:
                try:
                    speed = int(value)
                except (ValueError, TypeError):
                    pass
            cmd_payload["fan_speed"] = speed
    else:
        cmd_payload[target_key] = True if normalized_action in ("on", "true", "1", "activate") else False

    if not settings.mqtt_broker:
        return {
            "result": "simulated",
            "device": device_name,
            "payload": cmd_payload,
            "warning": "MQTT Broker not configured, action simulated."
        }

    try:
        tls_params = aiomqtt.TLSParameters() if settings.mqtt_port in (8883, 8884) else None
        async with aiomqtt.Client(
            hostname=settings.mqtt_broker,
            port=settings.mqtt_port,
            username=settings.mqtt_user or None,
            password=settings.mqtt_pass or None,
            tls_params=tls_params
        ) as client:
            await client.publish("room/command", payload=json.dumps(cmd_payload), qos=1)
        
        return {
            "result": "success",
            "device": device_name,
            "payload": cmd_payload,
        }
    except Exception as e:
        return {
            "result": "failed",
            "device": device_name,
            "payload": cmd_payload,
            "error": f"MQTT publish failed: {str(e)}"
        }

async def is_online() -> bool:
    """Quick check if the ESP32 is reachable."""
    return bool(settings.mqtt_broker)
