import asyncio
import uuid
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models import Automation, ExecutionLog, User, ChatMessage
from app.services import context_engine, gemini_service, function_service

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
                
                # Check if the triggered automation requires user approval. 
                # (For now, we default to requiring approval for safety, turning it into a proactive suggestion)
                requires_approval = True 
                
                # We could attempt to look up the specific Automation to see if `requires_approval` is False,
                # but since the LLM just calls the tool directly, we treat background triggers as proactive suggestions.

                if requires_approval:
                    action_id = str(uuid.uuid4())
                    
                    reasoning_text = response.text.strip() if response.text else f"Based on {event_reason}, I suggest triggering {target_name}."

                    pending_log = ExecutionLog(
                        id=action_id,
                        action_type=tool_name,
                        target_name=target_name,
                        status="pending",
                        request_payload={**args, "_user_message": f"Event trigger: {event_reason}"},
                        triggered_by="automation",
                        user_id=user_id
                    )
                    db.add(pending_log)
                    
                    # Instead of saving a ChatMessage (which pollutes history), we just log it.
                    # The mobile app should poll for 'pending' execution logs to show suggestion cards.
                    await db.commit()
                    print(f"Generated proactive suggestion for {user_id}: {target_name}")
