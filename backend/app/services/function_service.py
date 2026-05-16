import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Device, Function, User, ExecutionLog
from app.services import hardware_service
from app.services.hardware_service import HardwareError


async def execute_function(db: AsyncSession, function_id: str, current_user: User, parameters: dict = None, triggered_by: str = "user"):
    """Executes a registered function (device actions + HTTP dispatch)."""
    result = await db.execute(
        select(Function).where(Function.id == function_id, Function.owner_id == current_user.id)
    )
    fn = result.scalar_one_or_none()
    if not fn:
        raise ValueError("Function not found")

    parameters = parameters or {}
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
            import json
            
            # Helper to replace {{key}} with value
            def render_template(text: str) -> str:
                if not text:
                    return text
                res = text
                for k, v in parameters.items():
                    res = res.replace(f"{{{{{k}}}}}", str(v))
                return res

            rendered_url = render_template(fn.url)
            
            rendered_headers = {}
            if isinstance(fn.headers, dict):
                for k, v in fn.headers.items():
                    if isinstance(v, str):
                        rendered_headers[k] = render_template(v)
                    else:
                        rendered_headers[k] = v
            elif isinstance(fn.headers, list):
                # The UI sometimes passes headers as a list of strings "Key: Value"
                for h in fn.headers:
                    if ":" in h:
                        parts = h.split(":", 1)
                        rendered_headers[parts[0].strip()] = render_template(parts[1].strip())
                        
            rendered_body = None
            if fn.body_template:
                # Assuming body_template might be a string (from text area) or dict
                if isinstance(fn.body_template, str):
                    rendered_body_str = render_template(fn.body_template)
                    try:
                        rendered_body = json.loads(rendered_body_str)
                    except json.JSONDecodeError:
                        rendered_body = {"_raw": rendered_body_str} # Fallback
                else:
                    body_str = json.dumps(fn.body_template)
                    rendered_body = json.loads(render_template(body_str))

            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.request(
                    method=fn.method or "GET",
                    url=rendered_url,
                    headers=rendered_headers,
                    json=rendered_body,
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
        triggered_by=triggered_by,
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
