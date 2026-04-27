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
    
    prompt = f"""
You are an expert natural language parser for an AI smart home hub called Artemis.
Convert the following natural language automation rule into a structured JSON object with 4 fields:
1. trigger: The event or time (e.g., "time is 07:00" or "temperature > 28")
2. condition: Optional contextual gate (e.g., "someone is home")
3. action: What to do (e.g., "turn on the fan". If bypassing approval, prefix with "silently ")
4. fallback: Optional action if condition fails (e.g., "silently do nothing")

Text to parse: "{body.text}"

Ensure the output is ONLY valid JSON mapping exactly to these keys.
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
