from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/dummy", tags=["Dummy"])

class AlertPayload(BaseModel):
    adminEmail: Optional[str] = "admin@artemis.local"
    reportDate: Optional[str] = None

@router.post("/alerts")
async def send_morning_alert(body: AlertPayload = None):
    return {
        "status": "success",
        "message": "Morning summary emailed successfully.",
        "data": {
            "events_logged": 3,
            "notable_events": ["Motion detected in Living Room at 03:00 AM"],
            "recipient": body.adminEmail if body and body.adminEmail else "admin"
        }
    }

class PlexPayload(BaseModel):
    userId: Optional[str] = "default"

@router.post("/plex/movie-mode")
async def plex_movie_mode(body: PlexPayload = None):
    return {
        "status": "success",
        "message": "Plex media server configured for movie mode.",
        "data": {
            "plex_status": "ready",
            "active_profile": body.userId if body and body.userId else "default"
        }
    }
