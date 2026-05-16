"""
executor.py
───────────
Shared execution layer for Artemis.

Handles the actual dispatching of device control commands and function calls,
creates a human-readable ExecutionLog, and optionally generates a natural-language
confirmation via Gemini.

Called from:
  - mcp.py  /chat          (auto-execute when requires_approval is False)
  - mcp.py  /approve       (user-approved pending action)
  - automation_orchestrator (silent automation trigger)
"""

import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import ExecutionLog, Function, User
from app.services import hardware_service, gemini_service

logger = logging.getLogger(__name__)


def _human_label(action_type: str, target_name: str, args: dict, status: str) -> str:
    """Build a short, readable summary line for the log."""
    action = args.get("action", "")
    if action_type == "control_device":
        verb = {"on": "Turned on", "off": "Turned off", "set": "Adjusted"}.get(action, "Controlled")
        label = f"{verb} {target_name}"
        # include any payload attributes e.g. brightness=75
        payload = args.get("payload") or {}
        if payload:
            attrs = ", ".join(f"{k}={v}" for k, v in payload.items())
            label += f" ({attrs})"
    elif action_type == "execute_function":
        label = f"Executed function: {target_name}"
    else:
        label = f"{action_type.replace('_', ' ').title()}: {target_name}"

    if status == "failed":
        label += " — failed"
    return label


async def run_tool(
    db: AsyncSession,
    user: User,
    action_type: str,
    args: dict,
    triggered_by: str,
    *,
    generate_summary: bool = False,
    original_message: str = "",
    event_reason: str = "",
) -> dict:
    """
    Execute a tool call (control_device or execute_function) and persist an
    ExecutionLog with a human-readable summary.

    Returns a dict with keys:
        log_id, status, target_name, summary (if generate_summary=True)
    """
    target_name = args.get("device_name") or args.get("function_name") or "Unknown"
    hw_response: dict = {}
    overall_status = "failed"
    log_id = str(uuid.uuid4())

    try:
        if action_type == "control_device":
            device_name = args.get("device_name")
            action = args.get("action")
            payload = args.get("payload")
            hw_response = await hardware_service.send_command(device_name, action, payload)
            overall_status = "failed" if "error" in hw_response else "success"

            # Build human-readable label
            human_label = _human_label(action_type, target_name, args, overall_status)

            # Build context payloads
            request_context: dict = {**args}
            if original_message:
                request_context["_user_message"] = original_message
            if event_reason:
                request_context["_event_reason"] = event_reason

            response_context: dict = {**hw_response}
            response_context["summary"] = human_label

            if generate_summary:
                try:
                    trigger_msg = original_message or event_reason or f"execute {action_type} on {target_name}"
                    gemini_summary = await gemini_service.summarise_tool_result(
                        user_message=trigger_msg,
                        tool_name=action_type,
                        tool_args=args,
                        tool_result=hw_response,
                        succeeded=(overall_status == "success"),
                    )
                    response_context["reasoning"] = gemini_summary
                    human_label = gemini_summary
                except Exception:
                    logger.warning("Gemini summary failed, using fallback")

            log = ExecutionLog(
                id=log_id,
                action_type=action_type,
                target_name=target_name,
                status=overall_status,
                request_payload=request_context,
                response_payload=response_context,
                triggered_by=triggered_by,
                user_id=user.id,
            )
            db.add(log)
            await db.commit()

        elif action_type == "execute_function":
            function_name = args.get("function_name")
            parameters = args.get("parameters") or {}
            fn_query = await db.execute(
                select(Function).where(Function.name == function_name, Function.owner_id == user.id)
            )
            fn = fn_query.scalar_one_or_none()
            if not fn:
                hw_response = {"error": f"Function '{function_name}' not found."}
                overall_status = "failed"
                # Still need to log the failure
                log = ExecutionLog(
                    id=log_id,
                    action_type=action_type,
                    target_name=function_name or "unknown",
                    status="failed",
                    request_payload={**args},
                    response_payload=hw_response,
                    triggered_by=triggered_by,
                    user_id=user.id,
                )
                db.add(log)
                await db.commit()
            else:
                # Delegate entirely to function_service — it creates the single log.
                # Pass triggered_by so attribution is correct ("mcp", "automation", etc.)
                from app.services import function_service
                result = await function_service.execute_function(
                    db, fn.id, user,
                    parameters=parameters,
                    triggered_by=triggered_by,
                )
                hw_response = result
                overall_status = result.get("status", "success")
                target_name = function_name
                log_id = result.get("log_id", log_id)  # Use the log already created
                human_label = _human_label(action_type, target_name, args, overall_status)

        else:
            hw_response = {"error": f"Unknown action type: {action_type}"}
            overall_status = "failed"
            log = ExecutionLog(
                id=log_id,
                action_type=action_type,
                target_name=target_name,
                status="failed",
                request_payload={**args},
                response_payload=hw_response,
                triggered_by=triggered_by,
                user_id=user.id,
            )
            db.add(log)
            await db.commit()

    except Exception as e:
        logger.exception("Executor error running %s on %s", action_type, target_name)
        hw_response = {"error": str(e)}
        overall_status = "failed"
        log = ExecutionLog(
            id=log_id,
            action_type=action_type,
            target_name=target_name,
            status="failed",
            request_payload={**args},
            response_payload={"error": str(e)},
            triggered_by=triggered_by,
            user_id=user.id,
        )
        db.add(log)
        await db.commit()

    human_label = _human_label(action_type, target_name, args, overall_status)

    return {
        "log_id": log_id,
        "status": overall_status,
        "target_name": target_name,
        "summary": human_label,
        "hw_response": hw_response,
    }
