---
trigger: always_on
---

Project Overview: Artemis
Artemis is a mobile-first, AI-powered virtual assistant designed for smart home automation. Unlike traditional rule-based chatbots, Artemis acts as an ambient intelligence powered by the Model Context Protocol (MCP). It can understand natural language, evaluate sensor data, and seamlessly execute both hardware (e.g., turning on an Arduino-controlled fan) and software (e.g., sending an email) actions.

Core Identity & UX Philosophy
Visual Representation: Artemis is not a humanoid avatar; it is an abstract, reactive energy orb that communicates its state (idle, listening, processing, speaking, executing) entirely through fluid, sci-fi-inspired motion.

Color Palette: Deep cosmic purple (primary), electric blue (accents), and near-black gradient backgrounds.

Tone: Friendly, conversational, and calmly confident. It never nags or over-explains unless asked.

UI Layout: Dark-mode default, built with React Native + Expo. The main screen features the floating orb, a messenger-style chat history, and a dynamic voice input core.

Key Features
Proactive Suggestions: Artemis uses context (time, location, sensors) to suggest actions. Suggestions appear as glowing UI cards requiring explicit approval (Voice or Tap: Allow/Decline).

Extensible Custom Functions: Users can manually add new "skills" (APIs, tools, or smart home protocols) for Artemis to use.

MCP Transparency Overlay: An optional, sci-fi-styled diagnostic HUD that allows users to swipe up and see exactly why Artemis made a decision, what intent was detected, and which tools were selected.

Graceful Offline State: If internet access drops, the orb dims and informs the user calmly. No broken UI elements or endless loading spinners.

The Automation System
Automations dictate how Artemis operates without direct user prompts. The system is split into two tiers to cater to all technical levels:

1. Artemis Automation Language (AAL)
A custom, human-readable instruction language designed to feel like natural English rather than code.

Structure: WHEN [trigger] IF [condition] THEN [action] ELSE [fallback]

Example: WHEN temperature > 28°C IF someone is in the room THEN turn on the fan.

Approval Semantics: By default, AAL rules trigger a suggestion card. Users can explicitly write "THEN silently turn on the fan" to bypass manual approval.

Feedback: Artemis confirms new rules using plain conversational English (e.g., "Okay. When the temperature goes above 28 degrees, I'll suggest turning on the fan.")

2. Advanced Python Sandbox
For power users, automations can be written in Python. These scripts run in an isolated, sandboxed environment with limited API access, ensuring they can request actions through MCP but cannot silently override user approval or touch devices directly.

Technical Architecture
The system is separated into highly decoupled layers, which is excellent for a robust academic defense and future scalability.

1. Frontend (React Native + Expo)
The "dumb but beautiful" layer. It handles the UI, captures voice/text, renders the glowing orb animations, and acts as a permission gate. It does not process logic.

2. API Gateway (FastAPI)
The central routing layer. FastAPI is incredibly efficient for this, handling authentication, request validation, session context, and routing data from the mobile app to the MCP core.

3. MCP Core (The Brain)
The intelligence engine, featuring:

Intent & Context Engines: Parses what the user wants and merges it with current environmental data.

Planner & Permission Engines: Decides the sequence of actions and whether user approval is required.

Automation Engine: Evaluates AAL rules against incoming sensor data.

4. Execution Layer (The Hands)
The layer that actually interacts with the world.

Device Executor: Integrates with your hardware. This is where your Arduino-based sensors (temperature, light) and output devices (LEDs, fans) connect via your chosen protocols (HTTP, MQTT, etc.).

Function & Automation Executors: Handles software-based API calls and manages the Python sandbox.