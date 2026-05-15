import asyncio
from datetime import datetime
from sqlalchemy import select
from app.database import async_session_maker
from app.models import Automation
from app.services.automation_orchestrator import evaluate_event

async def run_time_scheduler():
    """
    Background task that runs continuously.
    It wakes up at the top of every minute, checks if any active automations
    have a time trigger that matches the current UTC time (e.g., '14:30'),
    and if so, fires an evaluation event for that user.
    """
    print("Time Scheduler starting...")
    while True:
        now = datetime.utcnow()
        # Sleep until the exact top of the next minute
        seconds_until_next_minute = 60 - now.second
        await asyncio.sleep(seconds_until_next_minute)
        
        # It's now the top of the minute, fetch exactly what minute it is
        current_time = datetime.utcnow()
        time_str = current_time.strftime("%H:%M")
        
        try:
            async with async_session_maker() as db:
                # Find all active automations where the trigger contains the current time string
                # Note: For simplicity, we assume triggers like "07:00" or "at 14:30"
                result = await db.execute(
                    select(Automation)
                    .where(Automation.is_enabled == True)
                    .where(Automation.trigger.like(f"%{time_str}%"))
                )
                matching_automations = result.scalars().all()
                
                if matching_automations:
                    # Group by user_id so we only evaluate once per user per minute
                    user_ids = {a.owner_id for a in matching_automations}
                    for uid in user_ids:
                        event_reason = f"Scheduled time reached: {time_str}"
                        # Fire and forget
                        asyncio.create_task(evaluate_event(uid, event_reason))
        except Exception as e:
            print(f"Error in time scheduler: {e}")
