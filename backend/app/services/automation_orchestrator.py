import asyncio
import uuid
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models import Automation, ExecutionLog, User, ChatMessage
from app.services import context_engine, gemini_service, function_service
from app.services import executor as exec_service

async def evaluate_event(user_id: str, event_reason: str):
    """
    Called when a significant event occurs (sensor delta crossed, or time matched).
    Gathers context and asks the LLM if any automations should be triggered.
    """
    async with AsyncSessionLocal() as db:
        # Check if user has any active automations first to save LLM calls
        automations_result = await db.execute(
            select(Automation).where(Automation.owner_id == user_id, Automation.is_enabled == True)
        )
        automations = automations_result.scalars().all()
        if not automations:
            return  # No active automations, nothing to do

        # Gather current state
        context_str = await context_engine.gather_context(db, user_id)
        
        # System instructions specific for the evaluator
        evaluator_prompt = f"""
An event just occurred: {event_reason}.
You are the Artemis Background Evaluator. 
Review the CURRENT TIME and SENSOR READINGS against the ACTIVE AUTOMATIONS in the context.
If the WHEN and IF conditions for an automation are met by the current context, you MUST execute the action.
To execute an action, use the 'execute_function' or 'control_device' tools as appropriate.
If no conditions are met, reply with the exact text "NO_ACTION". Do not explain.
"""
        
        try:
            # We bypass chat history for background evaluation to keep it stateless and cheap
            response = await gemini_service.chat_with_artemis(evaluator_prompt, context_str, [])
        except Exception as e:
            print(f"Background evaluation failed: {e}")
            return
            
        if not response:
            return

        # If LLM returns NO_ACTION, we are done.
        if response.text and "NO_ACTION" in response.text.upper():
            return

        # If LLM decided to execute a tool, it will be in response.function_calls
        if response.function_calls:
            for function_call in response.function_calls:
                tool_name = function_call.name
                args = function_call.args

                target_name = args.get("device_name") or args.get("function_name", "unknown")

                # Read requires_approval directly from the automation's saved setting —
                # this is the toggle the user set when creating/editing the automation.
                matching = next(
                    (a for a in automations if target_name.lower() in (a.action or "").lower()),
                    None
                )
                requires_approval = matching.requires_approval if matching else True

                if not requires_approval:
                    # Silent execution — run immediately, log it, no UI modal
                    user_result = await db.execute(select(User).where(User.id == user_id))
                    user = user_result.scalar_one_or_none()
                    if user:
                        await exec_service.run_tool(
                            db=db,
                            user=user,
                            action_type=tool_name,
                            args=dict(args),
                            triggered_by="automation",
                            generate_summary=False,
                            event_reason=event_reason,
                        )
                        print(f"Silent automation executed for {user_id}: {target_name}")
                else:
                    # Requires approval — create a pending suggestion card
                    action_id = str(uuid.uuid4())
                    reasoning_text = response.text.strip() if response.text else f"Based on {event_reason}, I suggest triggering {target_name}."

                    pending_log = ExecutionLog(
                        id=action_id,
                        action_type=tool_name,
                        target_name=target_name,
                        status="pending",
                        request_payload={
                            **dict(args),
                            "_user_message": f"Event trigger: {event_reason}",
                            "_event_reason": event_reason,
                        },
                        response_payload={"reasoning": reasoning_text},
                        triggered_by="automation",
                        user_id=user_id
                    )
                    db.add(pending_log)
                    await db.commit()
                    print(f"Generated proactive suggestion for {user_id}: {target_name}")
