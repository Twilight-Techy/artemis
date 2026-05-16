import asyncio
import json
import random
import time
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

app = FastAPI(title="Artemis Hardware Simulator")

# Mock State for Sensors
base_sensors = {
    "temperature": 24.5,
    "humidity": 45.0,
    "light_level": 800,
    "smoke": 0,
}

current_sensors = {
    "temperature": 24.5,
    "humidity": 45.0,
    "light_level": 800,
    "motion": False,
    "smoke": 0,
}

DEFAULT_CAPABILITIES: dict[str, dict[str, Any]] = {
    "light": {"power": True, "brightness": {"mode": "percentage", "min": 0, "max": 100}},
    "fan": {"power": True, "speed": {"mode": "steps", "count": 3}},
    "climate": {"power": True, "temperature": {"min": 16, "max": 30, "step": 1}},
    "media": {"power": True, "volume": {"mode": "percentage", "min": 0, "max": 100}},
    "sensor": {},
    "security": {"power": True},
    "switch": {"power": True},
    "other": {"power": True},
}

ROOM_IDS = {
    "Living Room": "room-living",
    "Bedroom": "room-bedroom",
    "Kitchen": "room-kitchen",
    "Studio": "room-studio",
}


def capabilities_for(device_type: str, overrides: dict[str, Any] | None = None) -> dict[str, Any]:
    capabilities = dict(DEFAULT_CAPABILITIES[device_type])
    if overrides:
        capabilities.update(overrides)
    if isinstance(capabilities.get("speed_steps"), int) and capabilities.get("speed") is None:
        capabilities["speed"] = {"mode": "steps", "count": capabilities["speed_steps"]}
    return capabilities


def relay_device(
    *,
    name: str,
    room: str,
    icon: str,
    device_type: str,
    state: dict[str, Any],
    capabilities: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "name": name,
        "room": room,
        "icon": icon,
        "type": device_type,
        "device_type": device_type,
        "capabilities": capabilities_for(device_type, capabilities),
        "device_state": dict(state),
    }


# Mock State for Devices. Pins mirror backend/seed.py and hardware_service.DEVICE_PIN_MAP.
devices: dict[str, dict[str, Any]] = {
    # Living Room (10-19)
    "10": relay_device(
        name="Ceiling Light",
        room="Living Room",
        icon="fa-lightbulb",
        device_type="light",
        capabilities={"brightness": True, "color_temp": True},
        state={"is_on": True, "brightness": 80, "color_temp": 4000},
    ),
    "11": relay_device(
        name="Ambient LED Strip",
        room="Living Room",
        icon="fa-wand-magic-sparkles",
        device_type="light",
        capabilities={"brightness": True, "rgb_color": True},
        state={"is_on": True, "brightness": 60, "color": "#74b1ff"},
    ),
    "12": relay_device(
        name="AC Unit",
        room="Living Room",
        icon="fa-snowflake",
        device_type="climate",
        capabilities={"temperature": True, "modes": ["cool", "heat", "auto"]},
        state={"is_on": True, "temperature": 22, "mode": "cool"},
    ),
    "13": relay_device(
        name="Smart TV",
        room="Living Room",
        icon="fa-tv",
        device_type="media",
        capabilities={"volume": True},
        state={"is_on": False, "volume": 35},
    ),
    # Bedroom (20-29)
    "20": relay_device(
        name="Bedside Lamp",
        room="Bedroom",
        icon="fa-lightbulb",
        device_type="light",
        capabilities={"brightness": True, "rgb_color": True},
        state={"is_on": False, "brightness": 40, "color": "#FF716C"},
    ),
    "21": relay_device(
        name="Ceiling Fan",
        room="Bedroom",
        icon="fa-fan",
        device_type="fan",
        capabilities={"speed_steps": 3},
        state={"is_on": True, "speed": 2},
    ),
    "22": relay_device(
        name="Security Camera",
        room="Bedroom",
        icon="fa-video",
        device_type="security",
        capabilities={"motion_detection": True, "night_vision": True},
        state={"is_on": True, "armed": True},
    ),
    # Kitchen (30-39)
    "30": relay_device(
        name="Kitchen Downlights",
        room="Kitchen",
        icon="fa-lightbulb",
        device_type="light",
        capabilities={"brightness": {"mode": "steps", "count": 3, "labels": ["Low", "Med", "High"]}},
        state={"is_on": True, "brightness": 2},
    ),
    "31": relay_device(
        name="Coffee Maker Plug",
        room="Kitchen",
        icon="fa-plug",
        device_type="switch",
        state={"is_on": False},
    ),
    # Studio (40-49)
    "40": relay_device(
        name="Studio Fan",
        room="Studio",
        icon="fa-fan",
        device_type="fan",
        capabilities={"speed": {"mode": "percentage", "min": 0, "max": 100}},
        state={"is_on": False, "speed": 35},
    ),
    "41": relay_device(
        name="Desk RGB Strip",
        room="Studio",
        icon="fa-wand-magic-sparkles",
        device_type="light",
        capabilities={"brightness": True, "rgb_color": True, "color_temp": True},
        state={"is_on": True, "brightness": 75, "color": "#b884ff", "color_temp": 4000},
    ),
    "42": relay_device(
        name="Spare Relay",
        room="Studio",
        icon="fa-plug",
        device_type="switch",
        state={"is_on": False},
    ),
}

sensor_devices: dict[str, dict[str, Any]] = {
    "temp-sensor": {
        "name": "Temp Sensor",
        "room": "Living Room",
        "icon": "fa-temperature-half",
        "type": "sensor",
        "device_type": "sensor",
        "capabilities": {"reading_types": ["temperature", "humidity"]},
        "device_state": {"is_on": True, "reading": 24.5, "unit": "deg C"},
    },
    "smoke-detector": {
        "name": "Smoke Detector",
        "room": "Kitchen",
        "icon": "fa-smog",
        "type": "sensor",
        "device_type": "sensor",
        "capabilities": {"reading_types": ["smoke"]},
        "device_state": {"is_on": True, "reading": 0, "unit": "ppm", "status": "Clear"},
    },
}

start_time = time.time()


@app.on_event("startup")
async def startup_event():
    async def sensor_fluctuation():
        while True:
            current_sensors["temperature"] = round(base_sensors["temperature"] + random.uniform(-0.3, 0.3), 1)
            current_sensors["humidity"] = round(base_sensors["humidity"] + random.uniform(-1.0, 1.0), 1)
            current_sensors["light_level"] = int(base_sensors["light_level"] + random.uniform(-15, 15))
            current_sensors["smoke"] = max(0, int(base_sensors["smoke"] + random.uniform(-2, 2)))
            sync_sensor_devices()
            await asyncio.sleep(2)

    asyncio.create_task(sensor_fluctuation())


class RelayCommand(BaseModel):
    state: Optional[str] = None
    action: Optional[str] = None
    value: Optional[Any] = None
    payload: Optional[dict[str, Any]] = None


class SensorUpdate(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    light_level: Optional[int] = None
    motion: Optional[bool] = None
    smoke: Optional[int] = None


def power_state(state: dict[str, Any]) -> str:
    return "on" if state.get("is_on") is True else "off"


def sync_sensor_devices() -> None:
    sensor_devices["temp-sensor"]["device_state"] = {
        "is_on": True,
        "reading": current_sensors["temperature"],
        "unit": "deg C",
        "humidity": current_sensors["humidity"],
    }
    sensor_devices["smoke-detector"]["device_state"] = {
        "is_on": True,
        "reading": current_sensors["smoke"],
        "unit": "ppm",
        "status": "Clear" if current_sensors["smoke"] < 10 else "Smoke detected",
    }


def serialize_relay(pin: str, device: dict[str, Any]) -> dict[str, Any]:
    device_state = dict(device["device_state"])
    return {
        "pin": int(pin),
        "name": device["name"],
        "room": device["room"],
        "state": power_state(device_state),
        "device_state": device_state,
        "capabilities": device["capabilities"],
        "device_type": device["device_type"],
        "type": device["type"],
        "icon": device["icon"],
        "last_action": device.get("last_action"),
        "last_payload": device.get("last_payload"),
    }


def serialize_backend_device(device_id: str, device: dict[str, Any], pin: int | None = None) -> dict[str, Any]:
    return {
        "id": device_id,
        "name": device["name"],
        "device_type": device["device_type"],
        "protocol": "http",
        "endpoint": f"/api/relay/{pin}" if pin is not None else None,
        "is_online": True,
        "capabilities": device["capabilities"],
        "state": dict(device["device_state"]),
        "room_id": ROOM_IDS.get(device["room"], device["room"].lower().replace(" ", "-")),
        "pin": pin,
    }


def numeric(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def clamp_number(value: Any, minimum: float, maximum: float, *, integer: bool = False) -> int | float | None:
    parsed = numeric(value)
    if parsed is None:
        return None
    parsed = max(minimum, min(maximum, parsed))
    return int(round(parsed)) if integer else parsed


def normalize_payload(cmd: RelayCommand, device_type: str) -> dict[str, Any]:
    if cmd.payload:
        return dict(cmd.payload)

    value = cmd.value
    if isinstance(value, str):
        try:
            decoded = json.loads(value)
            if isinstance(decoded, dict):
                return decoded
            value = decoded
        except json.JSONDecodeError:
            pass

    action = (cmd.action or "").lower()
    if action == "set_color":
        return {"color": value}
    if action == "set_brightness":
        return {"brightness": value}
    if action == "set_speed":
        return {"speed": value}
    if action == "set_temperature":
        return {"temperature": value}
    if action == "set_volume":
        return {"volume": value}
    if action == "set" and value is not None:
        key_by_type = {
            "light": "brightness",
            "fan": "speed",
            "climate": "temperature",
            "media": "volume",
        }
        key = key_by_type.get(device_type)
        return {key: value} if key else {}
    return {}


def apply_command(device: dict[str, Any], cmd: RelayCommand) -> None:
    action = (cmd.action or "").lower()
    state = dict(device["device_state"])

    if cmd.state is not None:
        state["is_on"] = cmd.state.lower() in ("on", "true", "1", "activate")

    if action in ("on", "activate"):
        state["is_on"] = True
    elif action in ("off", "deactivate"):
        state["is_on"] = False

    payload = normalize_payload(cmd, device["device_type"])
    if payload:
        state.update(payload)
        device["last_action"] = cmd.action or "set"
        device["last_payload"] = payload
    elif action:
        device["last_action"] = cmd.action
        device["last_payload"] = None

    device["device_state"] = normalize_state(device["device_type"], device["capabilities"], state)


def normalize_state(device_type: str, capabilities: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(state)
    normalized["is_on"] = normalized.get("is_on") is True

    if device_type == "light":
        brightness = capabilities.get("brightness")
        if brightness is not False and "brightness" in normalized:
            if isinstance(brightness, dict) and brightness.get("mode") == "steps":
                count = int(brightness.get("count", 3))
                normalized["brightness"] = clamp_number(normalized["brightness"], 1, count, integer=True)
            else:
                maximum = brightness.get("max", 100) if isinstance(brightness, dict) else 100
                minimum = brightness.get("min", 0) if isinstance(brightness, dict) else 0
                normalized["brightness"] = clamp_number(normalized["brightness"], minimum, maximum, integer=True)
        if "color_temp" in normalized:
            color_temp = capabilities.get("color_temp")
            minimum = color_temp.get("min", 2700) if isinstance(color_temp, dict) else 2700
            maximum = color_temp.get("max", 6500) if isinstance(color_temp, dict) else 6500
            normalized["color_temp"] = clamp_number(normalized["color_temp"], minimum, maximum, integer=True)
        if "color" in normalized and not isinstance(normalized["color"], str):
            normalized["color"] = "#FFFFFF"

    if device_type == "fan" and "speed" in normalized:
        speed = capabilities.get("speed")
        if isinstance(speed, dict) and speed.get("mode") == "percentage":
            normalized["speed"] = clamp_number(
                normalized["speed"],
                float(speed.get("min", 0)),
                float(speed.get("max", 100)),
                integer=True,
            )
        elif isinstance(speed, dict):
            normalized["speed"] = clamp_number(normalized["speed"], 1, int(speed.get("count", 3)), integer=True)

    if device_type == "climate" and "temperature" in normalized:
        temperature = capabilities.get("temperature")
        minimum = temperature.get("min", 16) if isinstance(temperature, dict) else 16
        maximum = temperature.get("max", 30) if isinstance(temperature, dict) else 30
        normalized["temperature"] = clamp_number(normalized["temperature"], minimum, maximum, integer=True)

    if device_type == "media" and "volume" in normalized:
        volume = capabilities.get("volume")
        minimum = volume.get("min", 0) if isinstance(volume, dict) else 0
        maximum = volume.get("max", 100) if isinstance(volume, dict) else 100
        normalized["volume"] = clamp_number(normalized["volume"], minimum, maximum, integer=True)

    return {k: v for k, v in normalized.items() if v is not None}


@app.get("/api/sensors")
def get_sensors():
    return current_sensors


@app.post("/api/sensors/update")
def update_sensors(update: SensorUpdate):
    if update.temperature is not None:
        base_sensors["temperature"] = update.temperature
    if update.humidity is not None:
        base_sensors["humidity"] = update.humidity
    if update.light_level is not None:
        base_sensors["light_level"] = update.light_level
    if update.smoke is not None:
        base_sensors["smoke"] = update.smoke
    if update.motion is not None:
        current_sensors["motion"] = update.motion
    sync_sensor_devices()
    return current_sensors


@app.get("/api/status")
def get_status():
    return {
        "device": "esp32-simulator",
        "status": "online",
        "uptime": int(time.time() - start_time),
        "capability_contract": "device_type/capabilities/state",
    }


@app.get("/api/relays")
def get_relays():
    return {pin: serialize_relay(pin, device) for pin, device in devices.items()}


@app.get("/api/devices")
def get_devices():
    relay_devices = [
        serialize_backend_device(f"sim-relay-{pin}", device, int(pin))
        for pin, device in devices.items()
    ]
    sensor_payloads = [
        serialize_backend_device(f"sim-{device_id}", device)
        for device_id, device in sensor_devices.items()
    ]
    return relay_devices + sensor_payloads


@app.post("/api/relay/{pin}")
def set_relay(pin: str, cmd: RelayCommand):
    if pin not in devices:
        raise HTTPException(status_code=404, detail="Invalid pin")

    apply_command(devices[pin], cmd)
    serialized = serialize_relay(pin, devices[pin])
    return {
        "pin": serialized["pin"],
        "name": serialized["name"],
        "state": serialized["state"],
        "device_state": serialized["device_state"],
        "capabilities": serialized["capabilities"],
        "result": "success",
    }


@app.get("/", response_class=HTMLResponse)
def dashboard():
    html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Artemis Hardware Simulator</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230e0e10'/%3E%3Crect x='10' y='10' width='12' height='12' rx='2' fill='none' stroke='%2374b1ff' stroke-width='1.8'/%3E%3Crect x='13' y='13' width='6' height='6' rx='1' fill='%2374b1ff' opacity='.9'/%3E%3Cline x1='13' y1='7' x2='13' y2='10' stroke='%2374b1ff' stroke-width='1.6' stroke-linecap='round'/%3E%3Cline x1='19' y1='7' x2='19' y2='10' stroke='%2374b1ff' stroke-width='1.6' stroke-linecap='round'/%3E%3Cline x1='13' y1='22' x2='13' y2='25' stroke='%2374b1ff' stroke-width='1.6' stroke-linecap='round'/%3E%3Cline x1='19' y1='22' x2='19' y2='25' stroke='%2374b1ff' stroke-width='1.6' stroke-linecap='round'/%3E%3Cline x1='7' y1='13' x2='10' y2='13' stroke='%2374b1ff' stroke-width='1.6' stroke-linecap='round'/%3E%3Cline x1='7' y1='19' x2='10' y2='19' stroke='%2374b1ff' stroke-width='1.6' stroke-linecap='round'/%3E%3Cline x1='22' y1='13' x2='25' y2='13' stroke='%2374b1ff' stroke-width='1.6' stroke-linecap='round'/%3E%3Cline x1='22' y1='19' x2='25' y2='19' stroke='%2374b1ff' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0e0e10;
            --surface: #16171b;
            --surface-high: #202229;
            --line: rgba(255, 255, 255, 0.09);
            --text: #fffbfe;
            --muted: rgba(255, 255, 255, 0.64);
            --primary: #74b1ff;
            --accent: #81ecff;
            --active: #00e3fd;
            --warn: #ff716c;
        }

        * { box-sizing: border-box; }
        body {
            font-family: 'Manrope', sans-serif;
            background: var(--bg);
            color: var(--text);
            margin: 0;
            min-height: 100vh;
        }

        h1, h2, h3 {
            font-family: 'Space Grotesk', sans-serif;
            margin: 0;
        }

        .shell {
            width: min(1280px, calc(100vw - 32px));
            margin: 0 auto;
            padding: 32px 0;
        }

        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 24px;
            border-bottom: 1px solid var(--line);
            margin-bottom: 24px;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .brand-icon {
            width: 42px;
            height: 42px;
            border-radius: 8px;
            display: grid;
            place-items: center;
            background: rgba(116, 177, 255, 0.12);
            color: var(--primary);
            border: 1px solid rgba(116, 177, 255, 0.26);
        }

        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 1px solid rgba(0, 227, 253, 0.28);
            color: var(--accent);
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        .layout {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
        }

        .panel {
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 8px;
            padding: 20px;
        }

        .section-title {
            color: var(--primary);
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
        }

        .rooms {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 16px;
        }

        .room {
            background: rgba(255, 255, 255, 0.025);
            border: 1px solid var(--line);
            border-radius: 8px;
            padding: 14px;
        }

        .room-title {
            color: var(--muted);
            font-size: 0.76rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            margin-bottom: 12px;
        }

        .device {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            background: var(--surface-high);
            border: 1px solid var(--line);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
        }

        .device.on {
            border-color: rgba(0, 227, 253, 0.28);
            background: rgba(0, 227, 253, 0.055);
        }

        .device-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            display: grid;
            place-items: center;
            background: rgba(255, 255, 255, 0.06);
            color: var(--muted);
            flex: 0 0 auto;
        }

        .device.on .device-icon {
            color: var(--active);
            background: rgba(0, 227, 253, 0.13);
        }

        .device-info { min-width: 0; flex: 1; }
        .device-name { font-weight: 800; margin-bottom: 4px; }
        .device-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 8px;
        }

        .tag {
            font-size: 0.7rem;
            color: var(--muted);
            border: 1px solid var(--line);
            border-radius: 999px;
            padding: 2px 7px;
        }

        .tag.active { color: var(--active); border-color: rgba(0, 227, 253, 0.25); }

        .state-line {
            color: var(--muted);
            font-size: 0.78rem;
            line-height: 1.45;
            word-break: break-word;
        }

        .sensor-inputs {
            display: flex;
            gap: 8px;
            margin-top: 8px;
            flex-wrap: wrap;
        }
        
        .sensor-inputs input[type="number"] {
            width: 70px;
            background: rgba(0, 0, 0, 0.22);
            border: 1px solid var(--line);
            border-radius: 4px;
            color: var(--text);
            padding: 4px;
            font-size: 0.8rem;
        }
        
        .sensor-inputs button {
            border: 0;
            border-radius: 4px;
            background: rgba(116, 177, 255, 0.15);
            color: var(--primary);
            cursor: pointer;
            padding: 4px 8px;
            font-size: 0.8rem;
        }

    </style>
</head>
<body>
    <main class="shell">
        <div class="topbar">
            <div class="brand">
                <div class="brand-icon"><i class="fa-solid fa-microchip"></i></div>
                <div>
                    <h1>Artemis Hardware Simulator</h1>
                </div>
            </div>
            <div class="status-pill"><i class="fa-solid fa-circle"></i> Online</div>
        </div>

        <div class="layout">
            <section class="panel">
                <h2 class="section-title"><i class="fa-solid fa-server"></i> Rooms & Devices</h2>
                <div class="rooms" id="rooms-container"></div>
            </section>
        </div>
    </main>

    <script>
        function formatState(deviceState) {
            return Object.entries(deviceState)
                .filter(([key]) => key !== 'is_on')
                .map(([key, value]) => `${key}: ${value}`)
                .join(' | ');
        }

        async function updateSensorReading(type, valueId) {
            const val = parseFloat(document.getElementById(valueId).value);
            const data = {};
            data[type] = val;
            await fetch('/api/sensors/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            fetchDevices();
        }

        function getRoomDisplayName(roomId) {
            const parts = roomId.replace('room-', '').split('-');
            return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
        }

        let isEditing = false;

        async function fetchDevices() {
            if (isEditing) return; // don't redraw if user is typing
            
            const res = await fetch('/api/devices');
            const devices = await res.json();

            const rooms = {};
            for (const dev of devices) {
                const r = dev.room_id || 'unknown';
                if (!rooms[r]) rooms[r] = [];
                rooms[r].push(dev);
            }

            const container = document.getElementById('rooms-container');
            let html = '';

            for (const [roomId, devs] of Object.entries(rooms)) {
                html += `<div class="room"><h3 class="room-title">${getRoomDisplayName(roomId)}</h3>`;
                for (const d of devs) {
                    const is_on = d.state && d.state.is_on;
                    const details = formatState(d.state || {});
                    
                    let icon = 'fa-plug';
                    if(d.device_type === 'light') icon = 'fa-lightbulb';
                    if(d.device_type === 'fan') icon = 'fa-fan';
                    if(d.device_type === 'climate') icon = 'fa-snowflake';
                    if(d.device_type === 'sensor') icon = 'fa-temperature-half';
                    if(d.device_type === 'security') icon = 'fa-video';
                    if(d.device_type === 'media') icon = 'fa-tv';

                    let inputsHtml = '';
                    if (d.device_type === 'sensor') {
                        if (d.capabilities.reading_types.includes('temperature')) {
                            const val = d.state.reading || 24.5;
                            inputsHtml += `<input type="number" id="inp-t-${d.id}" value="${val.toFixed(1)}" step="0.1" onfocus="isEditing=true" onblur="isEditing=false"><button onclick="updateSensorReading('temperature', 'inp-t-${d.id}')">Set °C</button>`;
                        }
                        if (d.capabilities.reading_types.includes('humidity')) {
                            const val = d.state.humidity || 45.0;
                            inputsHtml += `<input type="number" id="inp-h-${d.id}" value="${val.toFixed(1)}" step="1" onfocus="isEditing=true" onblur="isEditing=false"><button onclick="updateSensorReading('humidity', 'inp-h-${d.id}')">Set %</button>`;
                        }
                        if (d.capabilities.reading_types.includes('smoke')) {
                            const val = d.state.reading || 0;
                            inputsHtml += `<input type="number" id="inp-s-${d.id}" value="${val}" step="1" onfocus="isEditing=true" onblur="isEditing=false"><button onclick="updateSensorReading('smoke', 'inp-s-${d.id}')">Set PPM</button>`;
                        }
                    }

                    html += `
                    <div class="device ${is_on ? 'on' : ''}">
                        <div class="device-icon"><i class="fa-solid ${icon}"></i></div>
                        <div class="device-info">
                            <div class="device-name">${d.name}</div>
                            <div class="device-meta">
                                <span class="tag ${is_on ? 'active' : ''}">${is_on ? 'ON' : 'OFF'}</span>
                                <span class="tag">${d.device_type}</span>
                                ${d.pin ? `<span class="tag">Pin ${d.pin}</span>` : ''}
                            </div>
                            <div class="state-line">${details || 'power only'}</div>
                            ${inputsHtml ? `<div class="sensor-inputs">${inputsHtml}</div>` : ''}
                        </div>
                    </div>`;
                }
                html += `</div>`;
            }
            container.innerHTML = html;
        }

        setInterval(() => {
            fetchDevices();
        }, 2000);

        fetchDevices();
    </script>
</body>
</html>
"""
    return html
