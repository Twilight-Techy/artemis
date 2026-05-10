# Artemis ESP32 Firmware

Firmware for an ESP32-based Artemis hardware node. It exposes the same device
capability contract used by the backend simulator:

- `device_type`
- `capabilities`
- `device_state`
- logical Artemis pins such as `40`, `41`, and `42`

Only three logical devices are wired to GPIO by default. The rest are state-only
so the backend can use the same command payloads against firmware and simulator.

## Hardware Requirements

- ESP32 DevKit v1 or compatible ESP32 board
- DHT22 sensor for temperature and humidity
- LDR photoresistor with 10k resistor
- PIR motion sensor such as HC-SR501
- 3-channel active-LOW relay module
- Breadboard and jumper wires

## Wiring

| Component | ESP32 Pin | Artemis Logical Device |
|-----------|-----------|------------------------|
| DHT22 Data | GPIO 4 | Temp Sensor |
| LDR | GPIO 34 | Light telemetry |
| PIR Signal | GPIO 27 | Motion telemetry |
| Relay 1 | GPIO 26 | Studio Fan, logical pin `40` |
| Relay 2 | GPIO 25 | Desk RGB Strip, logical pin `41` |
| Relay 3 | GPIO 33 | Spare Relay, logical pin `42` |

Logical pins `10`, `11`, `12`, `13`, `20`, `21`, `22`, `30`, and `31` are
accepted as state-only devices unless you wire and map them in the sketch.

## Arduino IDE Setup

1. Board: `ESP32 Dev Module`
2. Install libraries:
   - `ArduinoJson` by Benoit Blanchon, v7+
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor`
3. Update `WIFI_SSID` and `WIFI_PASSWORD` in `artemis_esp32.ino`
4. Upload to the ESP32

## API

### `GET /api/sensors`

Returns sensor readings in the shape expected by the backend poller.

```json
{
  "temperature": { "value": 27.5, "unit": "deg C" },
  "humidity": { "value": 65.0, "unit": "%" },
  "light_level": { "value": 72, "unit": "%" },
  "motion": { "value": true, "detected": "yes" },
  "smoke": { "value": 0, "unit": "ppm" }
}
```

### `GET /api/status`

Returns ESP32 health plus the supported contract marker.

```json
{
  "device": "artemis-hub",
  "uptime_min": 142,
  "free_heap": 234567,
  "wifi_rssi": -45,
  "ip_address": "192.168.1.50",
  "firmware": "1.1.0",
  "status": "online",
  "capability_contract": "device_type/capabilities/state"
}
```

### `GET /api/relays`

Returns logical controllable devices keyed by Artemis logical pin.

```json
{
  "40": {
    "pin": 40,
    "gpio_pin": 26,
    "name": "Studio Fan",
    "room": "Studio",
    "state": "off",
    "device_type": "fan",
    "wired": true,
    "capabilities": {
      "power": true,
      "speed": { "mode": "percentage", "min": 0, "max": 100 }
    },
    "device_state": { "is_on": false, "speed": 35 }
  }
}
```

### `GET /api/devices`

Returns backend-like device objects, including state-only sensors, useful for
diagnostics or direct firmware discovery.

### `POST /api/relay/{logical_pin}`

Power commands:

```bash
curl -X POST http://artemis-hub.local/api/relay/40 \
  -H "Content-Type: application/json" \
  -d "{\"state\":\"on\"}"
```

Capability updates:

```bash
curl -X POST http://artemis-hub.local/api/relay/40 \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"set\",\"payload\":{\"speed\":65}}"
```

```bash
curl -X POST http://artemis-hub.local/api/relay/41 \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"set\",\"payload\":{\"brightness\":80,\"color\":\"#74b1ff\",\"color_temp\":4000}}"
```

The firmware also accepts the old direct GPIO paths for the three wired relays,
for example `/api/relay/26`, but backend traffic should use logical pins.

## Network Discovery

The ESP32 registers itself with mDNS as `artemis-hub.local`.
