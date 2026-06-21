# Artemis Smart Home Hub

Artemis is a mobile-first, AI-powered virtual assistant designed for smart home automation. Unlike traditional rule-based smart homes, Artemis acts as an ambient intelligence powered by the Model Context Protocol (MCP) and Gemini AI. It understands natural language (via text or voice), evaluates physical sensor data in real-time, and seamlessly executes both hardware and software actions.

## 🚀 Features

*   **Ambient Intelligence:** Driven by the Artemis Automation Language (AAL), allowing human-readable rules (e.g., `WHEN temperature > 28°C IF someone is in the room THEN turn on the fan`).
*   **Voice Control Pipeline:** Native integration using `expo-audio` to record voice commands, securely transcribed via Gemini 2.0 Flash, and executed as intelligent intents.
*   **Dual Hardware Modes:** Fully functional with physical ESP32 hardware, or a Python-based software simulator for rapid UI/Backend development.
*   **Event-Driven Sensor Architecture:** Edge-device monitoring (ESP32) that efficiently pushes state changes (Temperature, Humidity, Motion, Light) via REST/MQTT to the backend, preventing network flooding.
*   **Dynamic UI Capability Rendering:** Devices advertise their capabilities (e.g., RGB dimming, Fan speed, Climate steps), and the React Native UI dynamically renders the appropriate controllers.

---

## 🏗️ System Architecture

The project is decoupled into four primary layers:

### 1. `ui/` - The Frontend Client (React Native + Expo)
The presentation layer. It handles the dynamic UI, captures voice and text input, renders the glowing Artemis orb animations, and acts as a permission gate. It does not process logic locally.

### 2. `backend/` - The API Gateway & Intelligence Core (FastAPI)
The central brain. It handles:
*   Routing data from the mobile app to the Model Context Protocol (MCP) Core.
*   Natural language transcription and intent resolution using the Gemini API.
*   Database management (SQLite/SQLAlchemy) for devices, rooms, users, and automation rules.
*   Device discovery and health polling over MQTT and REST.

### 3. `firmware/` - The Edge Hardware (ESP32 C++)
The physical hands and eyes of Artemis. Runs on an ESP32 micro-controller.
*   **Sensors:** Monitors a DHT22 (Temp/Hum), LDR (Light), and PIR (Motion).
*   **Actuators:** Controls an onboard 4-channel relay for fans, lights, and appliances.
*   Communicates its capabilities and state securely to the backend via Wi-Fi (REST `POST`s and MQTT topics).

### 4. `simulator/` - The Virtual Hardware (Python)
A lightweight FastAPI and MQTT service that perfectly mimics the exact REST and MQTT footprint of the ESP32 firmware. Essential for testing the mobile UI and backend logic without needing a physical breadboard wired up.

---

## 🛠️ Getting Started

### Prerequisites
*   Node.js & npm (for the React Native UI)
*   Python 3.10+ (for Backend and Simulator)
*   Arduino IDE or PlatformIO (for ESP32 Firmware)
*   A HiveMQ Cloud MQTT Broker (or local mosquitto instance)

### 1. Running the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
# Copy .env.example to .env and fill in GEMINI_API_KEY and MQTT credentials
uvicorn app.main:app --reload --port 8000
```

### 2. Running the Simulator (If no physical hardware)
```bash
cd simulator
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Setup MQTT credentials in simulator if required
uvicorn main:app --reload --port 8001
```

### 3. Running the Mobile App
```bash
cd ui
npm install
# Ensure .env is set with EXPO_PUBLIC_API_URL pointing to your backend IP
npx expo start
```

---

## 🔌 Hardware Setup (Optional)
If you wish to build the physical Artemis Controller:
Please see the **Physical Demo Setup & Wiring Guide** located in the generated artifacts for a complete Bill of Materials (BOM), 5V low-voltage safety instructions, and breadboard schematics for connecting the ESP32 to the DHT22, LDR, PIR, and Relay modules.

---
*Built as a next-generation exploration into LLM-driven IoT environments.*
