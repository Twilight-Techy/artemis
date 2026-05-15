import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Device, Function, User, ExecutionLog
from app.services import hardware_service
from app.services.hardware_service import HardwareError


async def execute_function(db: AsyncSession, function_id: str, current_user: User):
    """Executes a registered function (device actions + HTTP dispatch)."""
    result = await db.execute(
        select(Function).where(Function.id == function_id, Function.owner_id == current_user.id)
    )
    fn = result.scalar_one_or_none()
    if not fn:
        raise ValueError("Function not found")

    device_results = []
    overall_status = "success"

    # 1. Execute hardware device actions
    for da in (fn.device_actions or []):
        device_id = da.get("device_id")
        action = da.get("action")
        value = da.get("value")

        dev_result = await db.execute(
            select(Device).where(Device.id == device_id, Device.owner_id == current_user.id)
        )
        device = dev_result.scalar_one_or_none()
        if not device:
            device_results.append({"device_id": device_id, "status": "not_found"})
            overall_status = "partial"
            continue

        hw_action = action
        payload = None

        if action == "turn_on":
            hw_action = "on"
        elif action == "turn_off":
            hw_action = "off"
        elif action == "toggle":
            current_on = bool((device.state or {}).get("is_on", False))
            hw_action = "off" if current_on else "on"
        elif action == "set_brightness":
            hw_action = "set_brightness"
            payload = {"brightness": int(value)} if value else {}
        elif action == "set_temperature":
            hw_action = "set"
            payload = {"temperature": float(value)} if value else {}
        elif action == "lock":
            hw_action = "on"
        elif action == "unlock":
            hw_action = "off"

        hw_response = None
        try:
            hw_response = await hardware_service.send_command(device.name, hw_action, payload)
        except HardwareError as e:
            hw_response = {"error": e.message}
            overall_status = "partial"

        state_copy = (device.state or {}).copy()
        if hw_action in ("on", "activate"):
            state_copy["is_on"] = True
        elif hw_action in ("off", "deactivate"):
            state_copy["is_on"] = False
        elif payload:
            state_copy.update(payload)
        device.state = state_copy

        device_results.append({
            "device_id": device_id,
            "device_name": device.name,
            "action": action,
            "status": "success" if hw_response and "error" not in hw_response else "failed",
        })

    # 2. Dispatch HTTP call
    http_response = None
    if fn.function_type in ("software", "hybrid") and fn.url:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.request(
                    method=fn.method or "GET",
                    url=fn.url,
                    headers=fn.headers or {},
                    json=fn.body_template or None,
                )
            http_response = {"status_code": resp.status_code, "body": resp.text[:500]}
        except Exception as e:
            http_response = {"error": str(e)}
            overall_status = "partial"

    # 3. Log execution
    log = ExecutionLog(
        action_type="function_call",
        target_id=fn.id,
        target_name=fn.name,
        status=overall_status,
        request_payload={"device_actions": fn.device_actions, "url": fn.url},
        response_payload={"device_results": device_results, "http_response": http_response},
        triggered_by="user",  # Overwritten in MCP if triggered by AI
        user_id=current_user.id,
    )
    db.add(log)
    await db.commit()

    return {
        "status": overall_status,
        "function": fn.name,
        "device_results": device_results,
        "http_response": http_response,
        "log_id": log.id
    }
