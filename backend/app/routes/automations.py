from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Automation, User
from app.schemas import AutomationCreate, AutomationOut
from app.services.auth_service import get_current_user
from pydantic import BaseModel
import os
from google import genai
from google.genai import types

router = APIRouter(prefix="/automations", tags=["Automations"])

class AALParseRequest(BaseModel):
    text: str

class AALParseResponse(BaseModel):
    trigger: str
    condition: str | None = None
    action: str
    fallback: str | None = None

@router.post("/parse", response_model=AALParseResponse)
async def parse_aal_text(body: AALParseRequest, current_user: User = Depends(get_current_user)):
    """Parse natural language into structured AAL JSON."""
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", "mock-key"))
    
    prompt = f"""You are an expert parser for the Artemis Automation Language (AAL). Your job is to convert a user's plain-English description into a structured AAL JSON object.

== AAL SPECIFICATION ==

AAL follows a strict 4-tier evaluation structure:
  WHEN [trigger] IF [condition] THEN [action] ELSE [fallback]

CLAUSES:
- WHEN (Trigger): Required. The event or schedule that initiates the automation.
- IF (Condition): Optional. A contextual gate checked at trigger time.
- THEN (Action): Required. The executor — a hardware or software directive.
- ELSE (Fallback): Optional. An alternative action if the IF condition is false.

THE "SILENTLY" MODIFIER:
- By default, ALL actions generate an approval request (a Suggestion Card) in the mobile app.
- To bypass user approval and execute immediately, the THEN clause MUST start with the word "silently".
- Example: "THEN silently turn on the living room lights"
- IMPORTANT: Only add "silently" if the user EXPLICITLY wants automatic execution with no approval. Default to requiring approval.

EVENT IDENTIFIERS (for WHEN and IF):
- Time: Standard time formats (e.g., "time is 07:00", "time is 7 AM")
- Sensor Values: Simple comparators (e.g., "temperature > 28", "humidity < 30", "motion detected in living room")
- Presence: Network/GPS-based (e.g., "someone is home", "alex leaves home")

TARGET IDENTIFIERS (for THEN and ELSE):
- Device Targets: Device names as stored in the system (e.g., "turn on the Studio Fan", "turn off the Ambient LED Strip")
- Function Targets: Named software macros (e.g., "execute Morning Summary Email", "suggest Deep Shield")

OUTPUT FORMAT:
Return ONLY a valid JSON object with exactly these 4 keys:
- "trigger": string — the WHEN clause (e.g., "temperature > 28")
- "condition": string or null — the IF clause, or null if none
- "action": string — the THEN clause (e.g., "turn on the Studio Fan" or "silently turn on the Studio Fan")
- "fallback": string or null — the ELSE clause, or null if none

EXAMPLES:
Input: "When it gets hot in the studio, suggest turning on the fan if someone is there"
Output: {{"trigger": "temperature > 28", "condition": "someone is in the room", "action": "turn on the Studio Fan", "fallback": null}}

Input: "At 7am, if someone is home, automatically start the wake up routine"
Output: {{"trigger": "time is 07:00", "condition": "someone is home", "action": "silently execute Wake Up Living Room", "fallback": null}}

Input: "When the front door opens after 10pm, quietly turn on the hallway lights, otherwise do nothing"
Output: {{"trigger": "exterior_door_lock opens", "condition": "time is after 22:00", "action": "silently turn on the hallway lights", "fallback": "silently do nothing"}}

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
            action=then_match.group(1).strip() if then_match else "silently do nothing",
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
