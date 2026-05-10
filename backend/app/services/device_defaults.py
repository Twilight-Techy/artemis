"""Default capabilities + state per device_type (aligned with mobile `capabilities.ts`)."""

from __future__ import annotations

from app.models.models import DeviceType

_DEFAULT_CAPS: dict[DeviceType, dict] = {
    DeviceType.LIGHT: {"power": True, "brightness": {"mode": "percentage", "min": 0, "max": 100}},
    DeviceType.FAN: {"power": True, "speed": {"mode": "steps", "count": 3}},
    DeviceType.CLIMATE: {"power": True, "temperature": {"min": 16, "max": 30, "step": 1}},
    DeviceType.MEDIA: {"power": True, "volume": {"mode": "percentage", "min": 0, "max": 100}},
    DeviceType.SENSOR: {},
    DeviceType.SECURITY: {"power": True},
    DeviceType.SWITCH: {"power": True},
    DeviceType.OTHER: {"power": True},
}


def _merge_specs(device_type: DeviceType, raw: dict | None) -> dict:
    base = dict(_DEFAULT_CAPS[device_type])
    if raw:
        base.update(raw)
    if isinstance(base.get("speed_steps"), int) and base.get("speed") is None:
        base["speed"] = {"mode": "steps", "count": int(base["speed_steps"])}
    return base


def default_capabilities(device_type: DeviceType, overrides: dict | None = None) -> dict:
    """Type defaults merged with optional per-device overrides."""
    return _merge_specs(device_type, overrides)


def default_state_for(device_type: DeviceType, merged_capabilities: dict) -> dict:
    """Initial state object for a device (keys match mobile + command handler)."""
    merged = merged_capabilities
    state: dict = {"is_on": False}

    if device_type == DeviceType.LIGHT:
        b = merged.get("brightness")
        if b is not False and b is not None:
            if isinstance(b, dict) and b.get("mode") == "steps":
                state["brightness"] = 1
            else:
                mx = 100
                if isinstance(b, dict):
                    mx = int(b.get("max", 100))
                state["brightness"] = mx
        ct = merged.get("color_temp")
        if ct:
            if isinstance(ct, dict):
                lo, hi = int(ct.get("min", 2700)), int(ct.get("max", 6500))
                state["color_temp"] = (lo + hi) // 2
            else:
                state["color_temp"] = 4000
        if merged.get("rgb_color") is True:
            state["color"] = "#FFFFFF"

    elif device_type == DeviceType.CLIMATE:
        state["temperature"] = 22

    elif device_type == DeviceType.FAN:
        s = merged.get("speed")
        if isinstance(s, dict) and s.get("mode") == "percentage":
            state["speed"] = int(s.get("min", 0))
        elif s is not False and s is not None:
            state["speed"] = 1

    elif device_type == DeviceType.MEDIA:
        if merged.get("volume"):
            state["volume"] = 50

    elif device_type == DeviceType.SENSOR:
        state["is_on"] = True
        state["reading"] = 0.0
        state["unit"] = "°C"

    elif device_type == DeviceType.SECURITY:
        state["is_on"] = True
        state["armed"] = False

    return state
