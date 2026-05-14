from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.models import DeviceType


# ═══════════════════════════════════════════════
# Auth
# ═══════════════════════════════════════════════
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)
    display_name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


# ═══════════════════════════════════════════════
# Room
# ═══════════════════════════════════════════════
class RoomCreate(BaseModel):
    name: str = Field(..., max_length=100)
    icon: str | None = None
    color: str | None = None


class RoomOut(BaseModel):
    id: str
    name: str
    icon: str | None
    color: str | None
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════
# Device
# ═══════════════════════════════════════════════
class DeviceCreate(BaseModel):
    name: str = Field(..., max_length=100)
    device_type: DeviceType
    protocol: str = "http"
    endpoint: str | None = None
    room_id: str
    capabilities: dict | None = None
    state: dict | None = None


class DeviceOut(BaseModel):
    id: str
    name: str
    device_type: DeviceType
    protocol: str | None = None
    endpoint: str | None
    is_online: bool
    capabilities: dict | None
    state: dict | None
    room_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeviceCommand(BaseModel):
    """Payload for controlling a device."""
    action: str  # "on", "off", "set_color", "set_brightness"
    payload: dict | None = None  # Arbitrary payload mapping to capabilities


# ═══════════════════════════════════════════════
# Function
# ═══════════════════════════════════════════════
class DeviceActionItem(BaseModel):
    device_id: str
    action: str
    value: str | None = None


class FunctionCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: str | None = None
    function_type: str  # hardware, software, hybrid
    method: str = "GET"
    url: str | None = None
    headers: dict | None = None
    body_template: dict | None = None
    parameters: list | None = None
    device_actions: list[DeviceActionItem] | None = None


class FunctionOut(BaseModel):
    id: str
    name: str
    description: str | None
    function_type: str
    method: str
    url: str | None
    headers: dict | None
    body_template: dict | None
    parameters: list | None
    device_actions: list | None
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════
# Automation
# ═══════════════════════════════════════════════
class AutomationCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: str | None = None
    automation_type: str  # aal, python
    trigger: str | None = None
    condition: str | None = None
    action: str | None = None
    fallback: str | None = None
    script_content: str | None = None
    requires_approval: bool = True


class AutomationOut(BaseModel):
    id: str
    name: str
    description: str | None
    automation_type: str
    trigger: str | None
    condition: str | None
    action: str | None
    fallback: str | None
    script_content: str | None
    requires_approval: bool
    is_enabled: bool
    last_triggered_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════
# Chat
# ═══════════════════════════════════════════════
class ChatMessageCreate(BaseModel):
    role: str  # user, assistant, system
    content: str
    meta_info: dict | None = None


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    meta_info: dict | None
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════
# Execution Log
# ═══════════════════════════════════════════════
class ExecutionLogOut(BaseModel):
    id: str
    action_type: str
    target_id: str | None
    target_name: str | None
    status: str
    request_payload: dict | None
    response_payload: dict | None
    triggered_by: str
    executed_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════
# User (public profile)
# ═══════════════════════════════════════════════
class UserOut(BaseModel):
    id: str
    username: str
    email: str
    display_name: str | None
    avatar_url: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
