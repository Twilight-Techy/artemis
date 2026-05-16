from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Automation, User
from app.schemas import AutomationCreate, AutomationOut
from app.services.auth_service import get_current_user
from pydantic import BaseModel
from google import genai
from google.genai import types
from app.config import get_settings

router = APIRouter(prefix="/automations", tags=["Automations"])
settings = get_settings()

class AALParseRequest(BaseModel):
    text: str

class AALParseResponse(BaseModel):
    trigger: str
    condition: str | None = None
    action: str
    fallback: str | None = None

@router.post("/parse", response_model=AALParseResponse)
async def parse_aal_text(
    body: AALParseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Parse natural language into structured AAL JSON using the user's actual devices/functions."""
    from app.models import Device, Function
    from sqlalchemy.orm import joinedload

    # Fetch the user's registered devices and functions so the LLM can reference them by name
    devices_result = await db.execute(
        select(Device).options(joinedload(Device.room)).where(Device.owner_id == current_user.id)
    )
    devices = devices_result.scalars().all()

    functions_result = await db.execute(
        select(Function).where(Function.owner_id == current_user.id)
    )
    functions = functions_result.scalars().all()

    device_list = "\n".join(
        f'  - [DEVICE] "{d.name}" in room: {d.room.name if d.room else "Unknown"} (type: {d.device_type.value})'
        for d in devices
    ) or "  (no devices registered)"

    function_list = "\n".join(
        f'  - [FUNCTION] "{f.name}"'
        for f in functions
    ) or "  (no functions registered)"

    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = f"""You are an expert parser for the Artemis Automation Language (AAL).
Your job is to decompose a plain-English automation description into a strict 4-part JSON structure.

== AAL CLAUSE MEANINGS ==

- WHEN (Trigger): The sensor event or time schedule that STARTS the automation.
  Examples: "temperature > 28", "time is 07:00", "motion detected", "door opens"
  IMPORTANT: This is a measurable event, NOT a presence check. Temperature, time, and sensor readings go here.

- IF (Condition): An OPTIONAL gate that is checked at trigger time. Usually presence or secondary state.
  Examples: "someone is in the living room", "someone is home", "time is after 22:00"

- THEN (Action): What to DO. Must reference a DEVICE or FUNCTION from the registered list below.
  For a device: "turn on [Device Name]" or "turn off [Device Name]" or "set [Device Name] brightness to 50%"
  For a function: "execute [Function Name]"

- ELSE (Fallback): OPTIONAL. What to do if the IF condition is false.
  Example: "do nothing"

== HOW TO DECOMPOSE A SENTENCE ==

Step 1 — Find the TRIGGER (WHEN): What is the measurable event that starts this? (temperature too high = "temperature > 28", it's morning = "time is 07:00")
Step 2 — Find the CONDITION (IF): Is there a presence or secondary check? ("I'm in the living room" = "someone is in the living room")
Step 3 — Find the ACTION (THEN): What device or function should activate? Match to the registered list.
Step 4 — Find the FALLBACK (ELSE): Is there an alternative? Usually null.

== REGISTERED DEVICES & FUNCTIONS ==
Use ONLY names from this list in the "action" and "fallback" fields.

{device_list}

{function_list}

== WORKED EXAMPLES ==

Input: "If I'm in the living room and it's too hot, turn on the fan"
Decomposition:
  WHEN → "it's too hot" = sensor trigger → "temperature > 28"
  IF   → "I'm in the living room" = presence check → "someone is in the living room"
  THEN → "turn on the fan" = device action → match to registered device list
Output: {{"trigger": "temperature > 28", "condition": "someone is in the living room", "action": "turn on the [Fan device name from list]", "fallback": null}}

Input: "When it gets hot in the studio, suggest turning on the fan if someone is there"
Output: {{"trigger": "temperature > 28", "condition": "someone is in the room", "action": "turn on the Studio Fan", "fallback": null}}

Input: "At 7am, if someone is home, start the wake up routine"
Output: {{"trigger": "time is 07:00", "condition": "someone is home", "action": "execute Wake Up Living Room", "fallback": null}}

Input: "When the front door opens after 10pm, turn on the hallway lights, otherwise do nothing"
Output: {{"trigger": "exterior_door_lock opens", "condition": "time is after 22:00", "action": "turn on the hallway lights", "fallback": "do nothing"}}

== OUTPUT FORMAT ==
Return ONLY a valid JSON object with exactly these 4 keys:
- "trigger": string — the WHEN clause
- "condition": string or null — the IF clause, or null if none
- "action": string — the THEN clause, using the exact device/function name from the registered list above
- "fallback": string or null — the ELSE clause, or null if none

== USER INPUT ==
"{body.text}"

Return ONLY valid JSON. No explanation, no markdown code fences.
"""
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        import json
        data = json.loads(response.text)
        return AALParseResponse(**data)
    except Exception as e:
        # Fallback to naive parse if LLM fails
        print(f"LLM parse failed: {e}")
        text = body.text.replace('\n', ' ')
        import re
        when_match = re.search(r'WHEN\s+(.*?)(?=\s+IF|\s+THEN|\s+ELSE|$)', text, re.I)
        if_match = re.search(r'IF\s+(.*?)(?=\s+THEN|\s+ELSE|$)', text, re.I)
        then_match = re.search(r'THEN\s+(.*?)(?=\s+ELSE|$)', text, re.I)
        else_match = re.search(r'ELSE\s+(.*)$', text, re.I)
        return AALParseResponse(
            trigger=when_match.group(1).strip() if when_match else "unknown",
            condition=if_match.group(1).strip() if if_match else None,
            action=then_match.group(1).strip() if then_match else "do nothing",
            fallback=else_match.group(1).strip() if else_match else None
        )


@router.get("/", response_model=list[AutomationOut])
async def list_automations(
    automation_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Automation).where(Automation.owner_id == current_user.id)
    if automation_type:
        query = query.where(Automation.automation_type == automation_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=AutomationOut, status_code=status.HTTP_201_CREATED)
async def create_automation(
    body: AutomationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    automation = Automation(**body.model_dump(), owner_id=current_user.id)
    db.add(automation)
    await db.commit()
    await db.refresh(automation)
    return automation


@router.put("/{automation_id}", response_model=AutomationOut)
async def update_automation(
    automation_id: str,
    body: AutomationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Automation).where(Automation.id == automation_id, Automation.owner_id == current_user.id)
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found")

    for key, value in body.model_dump().items():
        setattr(automation, key, value)

    await db.commit()
    await db.refresh(automation)
    return automation


@router.patch("/{automation_id}/toggle", response_model=AutomationOut)
async def toggle_automation(
    automation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Enable or disable an automation."""
    result = await db.execute(
        select(Automation).where(Automation.id == automation_id, Automation.owner_id == current_user.id)
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found")

    automation.is_enabled = not automation.is_enabled
    await db.commit()
    await db.refresh(automation)
    return automation


@router.delete("/{automation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_automation(
    automation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Automation).where(Automation.id == automation_id, Automation.owner_id == current_user.id)
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found")
    await db.delete(automation)
    await db.commit()
