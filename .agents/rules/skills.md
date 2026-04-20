---
trigger: always_on
---

# Artemis: Skills & Features Specification (React Native Implementation)

## 1. Core Intelligence (MCP Client)
The mobile app acts as a **Model Context Protocol (MCP) Client**. It does not process logic locally but maintains a persistent state of the environment.

### 1.1 Intent Orchestration
*   **Voice/Text Processing:** Capture raw input and stream to the FastAPI Gateway.
*   **State Synchronization:** Listen for state changes (Idle -> Thinking -> Executing) and trigger corresponding animations in the central energy orb.

## 2. Dynamic Component Skills

### 2.1 The Proactive Suggestion Engine
*   **Skill:** `renderProactiveCard(payload)`
*   **Functionality:** Dynamically generates high-priority UI cards when the MCP Core identifies a high-confidence intent (e.g., "It's 28°C, suggesting fan").
*   **Action Handlers:**
    *   `onAllow(actionID)`: Sends execution confirmation to the `Execution Layer`.
    *   `onDecline(actionID)`: Dismisses the card and logs the preference to the `Context Engine`.

### 2.2 Device Manual Control (Bridge)
*   **Skill:** `deviceRegistry`
*   **Rooms Layout:** Grouping devices by `room_id`.
*   **Manual Override:** Toggle switches and sliders send direct HTTP/MQTT commands through the `Device Executor`.
*   **Filtering:** Local filtering by `device_type` (Lights, Climate, Security) using memoized state.

## 3. Automation Interfaces

### 3.1 AAL (Artemis Automation Language) Editor
*   **Skill:** `AALParser` & `SyntaxHighlighter`
*   **Features:**
    *   Natural language input field that translates to structured JSON: `{ "trigger": "", "condition": "", "action": "" }`.
    *   Validation feedback: Visual cues if the `WHEN/IF/THEN` structure is incomplete.

### 3.2 Python Sandbox (Advanced)
*   **Skill:** `ScriptRuntime`
*   **Environment:** Secure WebView or remote execution environment.
*   **Permissions:** Scripts can only call `mcp.requestAction()`, ensuring all automated actions pass through the `Permission Engine`.

## 4. Transparency & Diagnostics (MCP HUD)

### 4.1 HUD Skill
*   **Visualizer:** A transparent overlay showing the "Chain of Thought."
*   **Data Fields:**
    *   `Detected Intent`: string
    *   `Confidence Score`: float (0.0 - 1.0)
    *   `Evaluated Context`: JSON object (Sensors, Time, User Presence)
    *   `Tool Selection`: ID of the executor selected (e.g., `Arduino_Executor.v2`)

## 5. Offline Resilience
*   **Skill:** `LocalPersistence`
*   **Behavior:** On `connection_drop`, the app switches to a "Local-Only" mode. 
*   **UI Update:** Central orb dims; non-local functions (External APIs) are greyed out, while local hardware controls (Arduino via LAN) remain active.

## 6. Technical Stack Requirements
*   **Framework:** React Native + Expo
*   **State Management:** TanStack Query (for server state) + Zustand (for UI state).
*   **Animations:** Reanimated 3 (for the fluid orb motion).
*   **Communication:** WebSockets (for real-time MCP feedback) + REST (for settings/history).