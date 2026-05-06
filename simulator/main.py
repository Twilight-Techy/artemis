import asyncio
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
import time
import random

app = FastAPI(title="Artemis Hardware Simulator")

# Mock State for Sensors
base_sensors = {
    "temperature": 24.5,
    "humidity": 45.0,
    "light_level": 800,
    "smoke": 0
}

current_sensors = {
    "temperature": 24.5,
    "humidity": 45.0,
    "light_level": 800,
    "motion": False,
    "smoke": 0
}

# Mock State for Devices
devices = {
    # Living Room (10-19)
    "10": {"name": "Ceiling Light", "room": "Living Room", "state": "off", "icon": "fa-lightbulb", "type": "light"},
    "11": {"name": "Ambient LED", "room": "Living Room", "state": "off", "icon": "fa-wand-magic-sparkles", "type": "led"},
    "12": {"name": "AC Unit", "room": "Living Room", "state": "off", "icon": "fa-snowflake", "type": "climate"},
    "13": {"name": "Smart TV", "room": "Living Room", "state": "off", "icon": "fa-tv", "type": "media"},
    
    # Bedroom (20-29)
    "20": {"name": "Bedside Lamp", "room": "Bedroom", "state": "off", "icon": "fa-lightbulb", "type": "light"},
    "21": {"name": "Ceiling Fan", "room": "Bedroom", "state": "off", "icon": "fa-fan", "type": "fan"},
    "22": {"name": "Security Camera", "room": "Bedroom", "state": "on", "icon": "fa-video", "type": "security"},
    
    # Kitchen (30-39)
    "30": {"name": "Downlights", "room": "Kitchen", "state": "off", "icon": "fa-lightbulb", "type": "light"},
    "31": {"name": "Coffee Maker", "room": "Kitchen", "state": "off", "icon": "fa-plug", "type": "plug"},
    
    # Studio (40-49)
    "40": {"name": "Studio Fan", "room": "Studio", "state": "off", "icon": "fa-fan", "type": "fan"},
    "41": {"name": "Desk RGB Strip", "room": "Studio", "state": "off", "icon": "fa-wand-magic-sparkles", "type": "led"},
    "42": {"name": "Spare Relay", "room": "Studio", "state": "off", "icon": "fa-plug", "type": "switch"}
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
            await asyncio.sleep(2)
    
    asyncio.create_task(sensor_fluctuation())

class RelayCommand(BaseModel):
    state: str
    action: Optional[str] = None
    value: Optional[str] = None

class SensorUpdate(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    light_level: Optional[int] = None
    motion: Optional[bool] = None
    smoke: Optional[int] = None

@app.get("/api/sensors")
def get_sensors():
    return current_sensors

@app.post("/api/sensors/update")
def update_sensors(update: SensorUpdate):
    if update.temperature is not None: base_sensors["temperature"] = update.temperature
    if update.humidity is not None: base_sensors["humidity"] = update.humidity
    if update.light_level is not None: base_sensors["light_level"] = update.light_level
    if update.smoke is not None: base_sensors["smoke"] = update.smoke
    if update.motion is not None: current_sensors["motion"] = update.motion
    return current_sensors

@app.get("/api/status")
def get_status():
    return {
        "device": "esp32-simulator",
        "status": "online",
        "uptime": int(time.time() - start_time)
    }

@app.get("/api/relays")
def get_relays():
    return devices

@app.post("/api/relay/{pin}")
def set_relay(pin: str, cmd: RelayCommand):
    if pin in devices:
        devices[pin]["state"] = cmd.state
        if cmd.action and cmd.action not in ("on", "off", "activate", "deactivate"):
            devices[pin]["last_action"] = cmd.action
            if cmd.value:
                devices[pin]["last_value"] = cmd.value
        return {"pin": int(pin), "name": devices[pin]["name"], "state": devices[pin]["state"], "result": "success"}
    return {"error": "Invalid pin"}, 400

@app.get("/", response_class=HTMLResponse)
def dashboard():
    html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Artemis Hardware Simulator</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Manrope:wght@400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --obsidian: #0e0e10;
            --surface-low: #141418;
            --surface-high: #1c1c22;
            --text-primary: #fffbfe;
            --text-secondary: rgba(255, 255, 255, 0.6);
            --primary: #74b1ff;
            --secondary: #b884ff;
            --tertiary: #81ecff;
            --active: #00e3fd;
            --error: #ff716c;
        }

        body { 
            font-family: 'Manrope', sans-serif; 
            background: var(--obsidian); 
            color: var(--text-primary); 
            margin: 0; 
            padding: 40px; 
            min-height: 100vh;
        }

        h1, h2, h3 { font-family: 'Space Grotesk', sans-serif; font-weight: 600; letter-spacing: 0.5px; }
        
        .header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 40px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            padding-bottom: 20px;
        }

        .header-icon {
            color: var(--primary);
            font-size: 2rem;
            text-shadow: 0 0 15px rgba(116, 177, 255, 0.5);
        }

        .grid { 
            display: grid; 
            grid-template-columns: 350px 1fr; 
            gap: 40px; 
        }

        .card { 
            background: var(--surface-low); 
            padding: 30px; 
            border-radius: 24px; 
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.03);
            position: relative;
            overflow: hidden;
        }

        .card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }

        .section-title {
            color: var(--primary);
            margin-top: 0;
            margin-bottom: 24px;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .sensor-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }

        .sensor-box {
            background: var(--surface-high);
            padding: 15px;
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.05);
        }

        .sensor-label { font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .sensor-value-display { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: 700; color: var(--tertiary); margin-bottom: 10px; text-shadow: 0 0 10px rgba(129, 236, 255, 0.2); transition: color 0.3s; }
        
        input[type="number"] { 
            background: rgba(0,0,0,0.3); 
            color: white; 
            border: 1px solid rgba(255,255,255,0.1); 
            padding: 8px 12px; 
            border-radius: 8px; 
            width: 100%; 
            box-sizing: border-box;
            font-family: 'Space Grotesk', sans-serif;
        }

        input[type="checkbox"] { transform: scale(1.2); }

        .btn-inject {
            background: linear-gradient(45deg, var(--primary), var(--secondary));
            color: #000;
            border: none;
            padding: 12px 24px;
            border-radius: 100px;
            cursor: pointer;
            font-weight: bold;
            font-family: 'Manrope', sans-serif;
            width: 100%;
            transition: all 0.2s ease;
            box-shadow: 0 4px 15px rgba(116, 177, 255, 0.3);
        }

        .btn-inject:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(116, 177, 255, 0.5); }

        .rooms-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 25px;
        }

        .room-section {
            background: rgba(0,0,0,0.2);
            border-radius: 20px;
            padding: 20px;
            border: 1px solid rgba(255,255,255,0.02);
        }

        .room-title {
            font-size: 1rem;
            color: var(--text-secondary);
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .device-item {
            display: flex;
            align-items: center;
            background: var(--surface-high);
            padding: 15px;
            border-radius: 16px;
            margin-bottom: 10px;
            border: 1px solid rgba(255,255,255,0.03);
            transition: all 0.3s ease;
            position: relative;
        }

        .device-item.on {
            background: rgba(0, 227, 253, 0.05);
            border-color: rgba(0, 227, 253, 0.2);
            box-shadow: 0 0 20px rgba(0, 227, 253, 0.05) inset;
        }

        .device-icon {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            margin-right: 15px;
            background: rgba(255,255,255,0.05);
            color: var(--text-secondary);
            transition: all 0.3s ease;
        }

        .device-item.on .device-icon {
            background: rgba(0, 227, 253, 0.15);
            color: var(--active);
            text-shadow: 0 0 10px rgba(0, 227, 253, 0.5);
        }

        .device-info { flex: 1; }
        .device-name { font-weight: 600; font-size: 1rem; margin-bottom: 4px; }
        .device-status { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; }
        .device-item.on .device-status { color: var(--active); }
        
        .device-settings {
            font-size: 0.75rem;
            color: var(--secondary);
            margin-top: 6px;
            font-family: 'Space Grotesk', monospace;
            background: rgba(184, 132, 255, 0.1);
            padding: 4px 8px;
            border-radius: 6px;
            display: inline-block;
        }

    </style>
</head>
<body>
    <div class="header">
        <i class="fa-solid fa-microchip header-icon"></i>
        <div>
            <h1 style="margin: 0; color: white;">Artemis Hardware Simulator</h1>
            <span style="color: var(--text-secondary); font-size: 0.9rem;">ESP32 Bridge & Sensor Array Mock</span>
        </div>
    </div>
    
    <div class="grid">
        <div class="card">
            <h2 class="section-title"><i class="fa-solid fa-tower-broadcast"></i> Telemetry & Sensors</h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 20px;">Values stream automatically. Adjust inputs below to shift the baseline.</p>
            
            <div class="sensor-grid">
                <div class="sensor-box">
                    <div class="sensor-label">Temperature</div>
                    <div class="sensor-value-display" id="val-temp">--°C</div>
                    <input type="number" id="inp-temp" step="0.1" value="24.5">
                </div>
                <div class="sensor-box">
                    <div class="sensor-label">Humidity</div>
                    <div class="sensor-value-display" id="val-hum">--%</div>
                    <input type="number" id="inp-hum" step="1" value="45">
                </div>
                <div class="sensor-box">
                    <div class="sensor-label">Light Level</div>
                    <div class="sensor-value-display" id="val-light">-- lux</div>
                    <input type="number" id="inp-light" step="10" value="800">
                </div>
                <div class="sensor-box">
                    <div class="sensor-label">Smoke</div>
                    <div class="sensor-value-display" id="val-smoke">-- ppm</div>
                    <input type="number" id="inp-smoke" step="1" value="0">
                </div>
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <span style="font-weight: 600;">Motion Trigger</span>
                <input type="checkbox" id="inp-motion" onchange="updateSensors()">
            </div>
            
            <button class="btn-inject" onclick="updateSensors()"><i class="fa-solid fa-upload"></i> Override Baselines</button>
        </div>
        
        <div class="card">
            <h2 class="section-title"><i class="fa-solid fa-server"></i> Hardware Relays & Control</h2>
            <div class="rooms-container" id="rooms-container">
            </div>
        </div>
    </div>

    <script>
        async function fetchSensors() {
            const res = await fetch('/api/sensors');
            const data = await res.json();
            document.getElementById('val-temp').innerText = data.temperature.toFixed(1) + '°C';
            document.getElementById('val-hum').innerText = data.humidity.toFixed(1) + '%';
            document.getElementById('val-light').innerText = data.light_level + ' lux';
            document.getElementById('val-smoke').innerText = data.smoke + ' ppm';
            
            const motionEl = document.getElementById('inp-motion');
            if (motionEl.checked !== data.motion) {
                motionEl.checked = data.motion;
            }
        }

        async function updateSensors() {
            const data = {
                temperature: parseFloat(document.getElementById('inp-temp').value),
                humidity: parseFloat(document.getElementById('inp-hum').value),
                light_level: parseInt(document.getElementById('inp-light').value),
                smoke: parseInt(document.getElementById('inp-smoke').value),
                motion: document.getElementById('inp-motion').checked
            };
            await fetch('/api/sensors/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        async function fetchDevices() {
            const res = await fetch('/api/relays');
            const devices = await res.json();
            
            const rooms = {};
            for (const [pin, dev] of Object.entries(devices)) {
                if (!rooms[dev.room]) rooms[dev.room] = [];
                rooms[dev.room].push({...dev, pin});
            }

            const container = document.getElementById('rooms-container');
            let html = '';
            
            for (const [roomName, devs] of Object.entries(rooms)) {
                html += `<div class="room-section"><h3 class="room-title">${roomName}</h3>`;
                for (const d of devs) {
                    const settingsText = (d.last_action && d.state === 'on') 
                        ? `<div class="device-settings"><i class="fa-solid fa-sliders"></i> ${d.last_action}: ${d.last_value || 'N/A'}</div>` 
                        : '';
                        
                    html += `
                    <div class="device-item ${d.state}">
                        <div class="device-icon"><i class="fa-solid ${d.icon}"></i></div>
                        <div class="device-info">
                            <div class="device-name">${d.name} <span style="font-size:0.7em; color:var(--text-secondary)">[Pin ${d.pin}]</span></div>
                            <div class="device-status">${d.state.toUpperCase()}</div>
                            ${settingsText}
                        </div>
                    </div>`;
                }
                html += `</div>`;
            }
            container.innerHTML = html;
        }

        setInterval(() => {
            fetchSensors();
            fetchDevices();
        }, 1000);
        
        fetchSensors();
        fetchDevices();
    </script>
</body>
</html>
"""
    return html
