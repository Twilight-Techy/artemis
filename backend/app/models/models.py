import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


# ═══════════════════════════════════════════════
# User
# ═══════════════════════════════════════════════
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(String(512))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    rooms: Mapped[list["Room"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    devices: Mapped[list["Device"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    functions: Mapped[list["Function"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    automations: Mapped[list["Automation"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    chat_messages: Mapped[list["ChatMessage"]] = relationship(back_populates="user", cascade="all, delete-orphan")


# ═══════════════════════════════════════════════
# Room
# ═══════════════════════════════════════════════
class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50))
    color: Mapped[str | None] = mapped_column(String(20))
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="rooms")
    devices: Mapped[list["Device"]] = relationship(back_populates="room", cascade="all, delete-orphan")


# ═══════════════════════════════════════════════
# Device
# ═══════════════════════════════════════════════
class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    device_type: Mapped[str] = mapped_column(String(50), nullable=False)  # light, climate, security, sensor
    protocol: Mapped[str] = mapped_column(String(30), default="http")  # http, mqtt, ble
    endpoint: Mapped[str | None] = mapped_column(String(512))  # e.g., /api/v1/relays/fan/state
    is_online: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)  # current on/off state
    current_value: Mapped[str | None] = mapped_column(String(100))  # e.g., "75" for brightness
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id"), nullable=False)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="devices")
    room: Mapped["Room"] = relationship(back_populates="devices")
    sensor_readings: Mapped[list["SensorReading"]] = relationship(back_populates="device", cascade="all, delete-orphan")


# ═══════════════════════════════════════════════
# Sensor Reading (time-series telemetry)
# ═══════════════════════════════════════════════
class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"), nullable=False)
    reading_type: Mapped[str] = mapped_column(String(50), nullable=False)  # temperature, humidity, motion, light_level
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)  # °C, %, lux, bool
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    device: Mapped["Device"] = relationship(back_populates="sensor_readings")


# ═══════════════════════════════════════════════
# Function (Hardware / Software / Hybrid)
# ═══════════════════════════════════════════════
class Function(Base):
    __tablename__ = "functions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    function_type: Mapped[str] = mapped_column(String(20), nullable=False)  # hardware, software, hybrid
    method: Mapped[str] = mapped_column(String(10), default="GET")  # GET, POST, PUT, DELETE
    url: Mapped[str | None] = mapped_column(String(512))
    headers: Mapped[dict | None] = mapped_column(JSON)
    body_template: Mapped[dict | None] = mapped_column(JSON)
    parameters: Mapped[list | None] = mapped_column(JSON)  # [{name, type, default, required}]
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="functions")


# ═══════════════════════════════════════════════
# Automation (AAL Rules + Python Scripts)
# ═══════════════════════════════════════════════
class Automation(Base):
    __tablename__ = "automations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    automation_type: Mapped[str] = mapped_column(String(20), nullable=False)  # aal, python
    trigger: Mapped[str | None] = mapped_column(Text)  # WHEN clause or cron expression
    condition: Mapped[str | None] = mapped_column(Text)  # IF clause
    action: Mapped[str | None] = mapped_column(Text)  # THEN clause
    fallback: Mapped[str | None] = mapped_column(Text)  # ELSE clause
    script_content: Mapped[str | None] = mapped_column(Text)  # Python script body (for type=python)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="automations")


# ═══════════════════════════════════════════════
# Chat Message (Conversation History)
# ═══════════════════════════════════════════════
class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    meta_info: Mapped[dict | None] = mapped_column("metadata", JSON)  # intent, confidence, tools_used, etc.
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="chat_messages")


# ═══════════════════════════════════════════════
# Execution Log (Audit Trail)
# ═══════════════════════════════════════════════
class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)  # device_control, function_call, automation_run
    target_id: Mapped[str | None] = mapped_column(String(36))  # device_id, function_id, or automation_id
    target_name: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, success, failed
    request_payload: Mapped[dict | None] = mapped_column(JSON)
    response_payload: Mapped[dict | None] = mapped_column(JSON)
    triggered_by: Mapped[str] = mapped_column(String(20), nullable=False)  # user, automation, mcp
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
