# Artemis Automation Language (AAL) Specification

## 1. Core Philosophy
Artemis Automation Language (AAL) is a human-first, declarative automation grammar designed to bridge the gap between plain-English natural language processing (NLP) and deterministic pseudo-code. It defines strict logical constructs that map directly to JSON payloads capable of executing Model Context Protocol (MCP) tool calls securely without raw code.

## 2. Structural Syntax

AAL follows a strict, 4-tier evaluation structure:
`WHEN [trigger] IF [condition] THEN [action] ELSE [fallback]`

* **WHEN (Trigger):** The event listener or schedule initiator. (Status: Required)
* **IF (Condition/Context):** Contextual gates checked at the time of the Trigger. (Status: Optional)
* **THEN (Action):** The executor. Dispatches a software or hardware directive. (Status: Required)
* **ELSE (Fallback):** An alternative executor if the `IF` condition returns `False`. (Status: Optional)

### 2.1 User Approval Semantics
By default, AAL rules trigger **approval requests** (Proactive Suggestions) via the Mobile App HUD rather than blindly acting.
To bypass manual user approval, the **"Require User Approval" toggle** must be disabled when creating or editing the automation in the app. This is a per-automation setting stored in the database — not a keyword in the rule text.

## 3. Data Types & Identifiers

### Event Identifiers (For `WHEN` and `IF`)
* **Time:** Parses standard colloquial time (`07:00`, `7 AM`, `sunset`, `sunrise`).
* **Sensor Values:** Uses simple comparators combined with known sensor IDs. (`temperature > 28`, `living_room_motion == true`).
* **Presence:** Relies on registered mobile network connections or GPS geofencing (`someone is home`, `alex leaves home`).

### Target Identifiers (For `THEN` and `ELSE`)
* **Device Targets:** Names mapped inside PostgreSQL (e.g., `Studio Fan`, `Ambient LED Strip`).
* **Function Targets:** Named software macros (e.g., `execute Deep Shield`, `suggest Morning Summary Email`).

## 4. Examples

#### Example 1: Basic Hardware Condition (No Modifier)
> `WHEN temperature > 28°C IF someone is in the room THEN turn on the Studio Fan.`

Artemis Behavior: Emits a UI "Suggestion Card" to the user, waiting for Allow/Decline.

#### Example 2: Modified Execution (Silent Modifier)
> `WHEN time is 07:00 IF someone is home THEN execute Wake Up Living Room.`

Artemis Behavior: Triggers the `Wake Up Living Room` function at exactly 7 AM. Whether a suggestion card is shown depends on the automation's "Require User Approval" setting.

#### Example 3: Full IF/ELSE Branching
> `WHEN exterior_door_lock opens IF time is after 22:00 THEN turn on the hallway lights ELSE do nothing.`

## 5. Parser Compilation (AAL -> JSON)
When an AAL string is analyzed by the backend (via `POST /automations`), it is parsed into the following executable JSON AST (Abstract Syntax Tree):

```json
{
  "trigger": {
    "type": "state_change",
    "target": "temperature",
    "operator": ">",
    "value": "28"
  },
  "condition": {
    "type": "presence",
    "target": "any_user",
    "operator": "==",
    "value": "home"
  },
  "action": {
    "type": "hardware_control",
    "target": "Studio Fan",
    "command": "turn_on",
    "requires_approval": false 
  },
  "fallback": null
}
```

## 6. Execution Flow
1. **Network Sync:** Hardware triggers report data back to `app/services/hardware_service.py`.
2. **Context Check:** The `automation_engine` checks the `trigger` queue and verifies the `condition` queue against cached state.
3. **Execution Routing:** If the automation's `requires_approval` setting is `true`, a push-event is routed through FastAPI WebSockets to the React Native App as a Suggestion Card. If `false` (the "Require User Approval" toggle was disabled by the user), it skips the client entirely and fires a command back down the HTTP/MQTT bridge.
