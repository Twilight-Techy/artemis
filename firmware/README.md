# Artemis ESP32 Firmware

## Hardware Requirements
- ESP32 DevKit v1 (or any ESP32 board)
- DHT22 sensor (temperature + humidity)
- LDR (photoresistor) + 10kΩ resistor (voltage divider)
- PIR motion sensor (HC-SR501)
- 3-channel relay module (5V, active LOW)
- Breadboard + jumper wires

## Wiring Diagram

| Component | ESP32 Pin | Notes |
|-----------|-----------|-------|
| DHT22 Data | GPIO 4 | 10kΩ pull-up to 3.3V |
| LDR | GPIO 34 | Analog input (voltage divider) |
| PIR Signal | GPIO 27 | Digital input |
| Relay 1 (Fan) | GPIO 26 | Active LOW |
| Relay 2 (LED Strip) | GPIO 25 | Active LOW |
| Relay 3 (Spare) | GPIO 33 | Active LOW |

## Arduino IDE Setup
1. **Board:** ESP32 Dev Module
2. **Install Libraries** (via Library Manager):
   - `ArduinoJson` by Benoit Blanchon (v7+)
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor` (dependency)
3. **Update** `WIFI_SSID` and `WIFI_PASSWORD` in the sketch
4. **Upload** to your ESP32

## API Endpoints

### `GET /api/sensors`
Returns all sensor readings:
```json
{
  "temperature": { "value": 27.5, "unit": "°C" },
  "humidity": { "value": 65.0, "unit": "%" },
  "light_level": { "value": 72, "unit": "%" },
  "motion": { "value": true, "detected": "yes" }
}
```

### `GET /api/status`
Returns device health:
```json
{
  "device": "artemis-hub",
  "uptime_min": 142,
  "free_heap": 234567,
  "wifi_rssi": -45,
  "ip_address": "192.168.1.50",
  "status": "online"
}
```

### `GET /api/relays`
Returns state of all relays:
```json
{
  "relays": [
    { "pin": 26, "name": "fan", "state": "off" },
    { "pin": 25, "name": "led_strip", "state": "on" },
    { "pin": 33, "name": "spare", "state": "off" }
  ]
}
```

### `POST /api/relay/{pin}`
Control a specific relay:
```bash
curl -X POST http://artemis-hub.local/api/relay/26 \
  -H "Content-Type: application/json" \
  -d '{"state": "on"}'
```

## Network Discovery
The ESP32 registers itself via mDNS as `artemis-hub.local`.
