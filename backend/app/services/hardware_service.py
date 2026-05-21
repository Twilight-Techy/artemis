"""
ESP32 Hardware Bridge Service
─────────────────────────────
Communicates with the Artemis ESP32 over the local network via REST.
Handles sensor reading, relay control, and device health checks.
"""

import httpx
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


def esp32_client() -> httpx.AsyncClient:
    if not settings.esp32_base_url:
        raise HardwareError(
            "ESP32_BASE_URL is not configured. For cloud deployments, set it to a public HTTPS tunnel/proxy URL for the ESP32, or use an outbound device channel."
        )

    return httpx.AsyncClient(
        base_url=settings.esp32_base_url.rstrip("/"),
        timeout=httpx.Timeout(connect=3.0, read=5.0, write=5.0, pool=5.0),
        headers={"Authorization": f"Bearer {settings.esp32_auth_token}"} if settings.esp32_auth_token else {},
    )


# ═══════════════════════════════════════════════
# Sensor Readings
# ═══════════════════════════════════════════════
async def get_sensors() -> dict:
    """
    Fetch all sensor readings from the ESP32.
    Returns dict with temperature, humidity, light_level, motion.
    """
    try:
        async with esp32_client() as client:
            response = await client.get("/api/sensors")
        response.raise_for_status()
        return response.json()
    except httpx.ConnectError:
        raise HardwareError("ESP32 unreachable — check Wi-Fi or IP address")
    except httpx.TimeoutException:
        raise HardwareError("ESP32 request timed out")
    except httpx.HTTPStatusError as e:
        raise HardwareError(f"ESP32 returned {e.response.status_code}", e.response.status_code)


# ═══════════════════════════════════════════════
# Device Status / Health
# ═══════════════════════════════════════════════
async def get_status() -> dict:
    """
    Fetch ESP32 health info (uptime, memory, Wi-Fi signal).
    """
    try:
        async with esp32_client() as client:
            response = await client.get("/api/status")
        response.raise_for_status()
        return response.json()
    except HardwareError as e:
        return {
            "device": "artemis-hub",
            "status": "offline",
            "error": e.message,
            "checked_at": datetime.utcnow().isoformat(),
        }
    except (httpx.ConnectError, httpx.TimeoutException):
        return {
            "device": "artemis-hub",
            "status": "offline",
            "error": "ESP32 unreachable",
            "checked_at": datetime.utcnow().isoformat(),
        }


# ═══════════════════════════════════════════════
# Relay State
# ═══════════════════════════════════════════════
async def get_relays() -> dict:
    """
    Get the current state of all relays.
    """
    try:
        async with esp32_client() as client:
            response = await client.get("/api/relays")
        response.raise_for_status()
        return response.json()
    except httpx.ConnectError:
        raise HardwareError("ESP32 unreachable — check Wi-Fi or IP address")
    except httpx.TimeoutException:
        raise HardwareError("ESP32 request timed out")


# ═══════════════════════════════════════════════
# Relay Control
# ═══════════════════════════════════════════════

# Map device names / types to ESP32 relay pins
DEVICE_PIN_MAP = {
    # Living Room
    "ceiling light": 10,
    "ambient led strip": 11,
    "ac unit": 12,
    "smart tv": 13,
    
    # Bedroom
    "bedside lamp": 20,
    "ceiling fan": 21,
    "security camera": 22,
    
    # Kitchen
    "kitchen downlights": 30,
    "coffee maker plug": 31,
    
    # Studio
    "studio fan": 40,
    "desk rgb strip": 41,
    "spare relay": 42,
    
    # Aliases
    "fan": 40,
    "led": 41,
    "led_strip": 41,
    "light": 10,
    "spare": 42,
}


async def send_command(device_name: str, action: str, value: str | int | float | bool | dict | None = None) -> dict:
    """
    Send a control command to a specific relay on the ESP32.

    Args:
        device_name: Human-readable name (e.g., "fan", "led_strip")
        action: "on" or "off"
        value: Optional scalar or capability payload for dimmers / richer simulated devices.

    Returns:
        ESP32 response dict with pin, name, state, result.
    """
    # Resolve device name to pin
    pin = DEVICE_PIN_MAP.get(device_name.lower())
    if pin is None:
        raise HardwareError(f"Unknown device: '{device_name}'. Known: {list(DEVICE_PIN_MAP.keys())}")

    # Normalize power actions without forcing richer "set" commands to off.
    normalized_action = action.lower()
    state = None
    if normalized_action in ("on", "true", "1", "activate"):
        state = "on"
    elif normalized_action in ("off", "false", "0", "deactivate"):
        state = "off"

    payload = value if isinstance(value, dict) else None
    scalar_value = None if isinstance(value, dict) else value

    command_body = {
        "action": action,
        "value": scalar_value,
        "payload": payload,
    }
    if state is not None:
        command_body["state"] = state

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
