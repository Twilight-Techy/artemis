"""
Permission Engine
─────────────────
Evaluates whether a tool call from the Gemini model can be auto-executed
or if it requires explicit user approval via the mobile app UI.
"""

def needs_approval(tool_name: str, args: dict) -> bool:
    """
    Returns True if the action requires explicit user approval.
    """
    # Read-only or informational queries are auto-approved
    auto_approve_tools = {
        "get_sensor_data",
        "list_devices",
        "check_device_status"
    }

    if tool_name in auto_approve_tools:
        return False

    # State-modifying actions (control_device, execute_function, etc.) require user approval
    return True

