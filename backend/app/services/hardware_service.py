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
    "ambient led strip": "bulb2",
    "fan main power": "socket1",
    "coffee maker plug": "socket2",
    "ceiling fan": "fan_speed",
    "studio fan": "fan_speed",
    
    # Aliases
    "bulb 1": "bulb1",
    "bulb 2": "bulb2",
    "socket 1": "socket1",
    "socket 2": "socket2",
    "fan": "fan_speed",
    "light": "bulb1",
    "ac unit": "socket1", # Legacy alias
    "smart tv": "socket2", # Legacy alias
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
                    
                    async with AsyncSessionLocal() as db:
                        db_cmd = await db.get(BridgeCommand, queued.id)
                        if db_cmd:
                            db_cmd.status = res.get("status", "completed")
                            db_cmd.result_payload = res
                            await db.commit()
                            
                    return {
                        "result": res.get("status", "unknown"),
                        "command_id": cmd_id_str,
                        "pin": pin,
                        "target_name": device_name,
                        "error": res.get("error")
                    }
                except asyncio.TimeoutError:
                    return {
                        "result": "queued",
                        "queued": True,
                        "command_id": cmd_id_str,
                        "pin": pin,
                        "target_name": device_name,
                        "warning": "MQTT timeout waiting for response, command may have executed."
                    }
        except Exception as e:
            return {
                "result": "queued",
                "queued": True,
                "command_id": cmd_id_str,
                "pin": pin,
                "target_name": device_name,
                "error": f"MQTT publish failed: {str(e)}"
            }

    if not settings.esp32_base_url:
        async with AsyncSessionLocal() as db:
            queued = BridgeCommand(
                target_name=device_name,
                pin=pin,
                action=action,
                value=None if isinstance(value, dict) or value is None else str(value),
                payload=payload,
                status="pending",
            )
            db.add(queued)
            await db.commit()
            await db.refresh(queued)

        return {
            "result": "queued",
            "queued": True,
            "command_id": queued.id,
            "pin": pin,
            "target_name": device_name,
        }

    try:
        async with esp32_client() as client:
            response = await client.post(
                f"/api/relay/{pin}",
                json=command_body,
            )
        response.raise_for_status()
        return response.json()
    except httpx.ConnectError:
        raise HardwareError("ESP32 unreachable — cannot send command")
    except httpx.TimeoutException:
        raise HardwareError("ESP32 command timed out — device may not have responded")
    except httpx.HTTPStatusError as e:
        raise HardwareError(f"ESP32 relay error: {e.response.text}", e.response.status_code)


async def is_online() -> bool:
    """Quick check if the ESP32 is reachable."""
    try:
        async with esp32_client() as client:
            response = await client.get("/api/status")
        return response.status_code == 200
    except (HardwareError, httpx.ConnectError, httpx.TimeoutException):
        return False
