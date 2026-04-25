"""
ESP32 Hardware Bridge Service
─────────────────────────────
Communicates with the Artemis ESP32 over the local network via REST.
Handles sensor reading, relay control, and device health checks.
"""

import httpx
from datetime import datetime
from app.config import get_settings

settings = get_settings()

# Shared async client with reasonable timeouts for local network
_client = httpx.AsyncClient(
    base_url=settings.esp32_base_url,
    timeout=httpx.Timeout(connect=3.0, read=5.0, write=5.0, pool=5.0),
    headers={"Authorization": f"Bearer {settings.esp32_auth_token}"} if settings.esp32_auth_token else {},
)


class HardwareError(Exception):
    """Raised when ESP32 communication fails."""
    def __init__(self, message: str, status_code: int | None = None):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


# ═══════════════════════════════════════════════
# Sensor Readings
# ═══════════════════════════════════════════════
async def get_sensors() -> dict:
    """
    Fetch all sensor readings from the ESP32.
    Returns dict with temperature, humidity, light_level, motion.
    """
    try:
        response = await _client.get("/api/sensors")
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
        response = await _client.get("/api/status")
        response.raise_for_status()
        return response.json()
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
        response = await _client.get("/api/relays")
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
    "fan": 26,
    "studio_fan": 26,
    "led": 25,
    "led_strip": 25,
    "light": 25,
    "spare": 33,
}


async def send_command(device_name: str, action: str, value: str | None = None) -> dict:
    """
    Send a control command to a specific relay on the ESP32.

    Args:
        device_name: Human-readable name (e.g., "fan", "led_strip")
        action: "on" or "off"
        value: Optional value (unused for relays, reserved for dimmers)

    Returns:
        ESP32 response dict with pin, name, state, result.
    """
    # Resolve device name to pin
    pin = DEVICE_PIN_MAP.get(device_name.lower())
    if pin is None:
        raise HardwareError(f"Unknown device: '{device_name}'. Known: {list(DEVICE_PIN_MAP.keys())}")

    # Normalize action
    state = "on" if action.lower() in ("on", "true", "1", "activate") else "off"

    try:
        response = await _client.post(
            f"/api/relay/{pin}",
            json={"state": state},
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
        response = await _client.get("/api/status")
        return response.status_code == 200
    except (httpx.ConnectError, httpx.TimeoutException):
        return False
