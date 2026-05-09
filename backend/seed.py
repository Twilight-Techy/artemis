import asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal, engine, Base
from app.models import User, Room, Device, Automation, DeviceType, Function, ExecutionLog, ChatMessage
from app.services.auth_service import hash_password

async def seed_database():
    print("Initializing Database...")
    
    # Ensure tables exist (drop and recreate for dev schema changes)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        print("Creating User...")
        # 1. Create User
        user = User(
            id="test-user-id",
            username="alex",
            email="alex@artemis.local",
            hashed_password=hash_password("password123"),
            display_name="Alex"
        )
        db.add(user)
        await db.flush()  # Ensure user exists for FK references

        print("Creating Rooms...")
        # 2. Create Rooms
        rooms = [
            Room(id="room-living",  name="Living Room",  icon="sofa-outline",   color="#74b1ff", owner_id="test-user-id"),
            Room(id="room-bedroom", name="Bedroom",      icon="bed-outline",    color="#b884ff", owner_id="test-user-id"),
            Room(id="room-kitchen", name="Kitchen",       icon="cafe-outline",   color="#81ecff", owner_id="test-user-id"),
            Room(id="room-studio",  name="Studio",        icon="desktop-outline",color="#00e3fd", owner_id="test-user-id"),
        ]
        for r in rooms:
            db.add(r)
        await db.flush()  # Ensure rooms exist for device FK references

        print("Creating Devices...")
        # 3. Create Devices — diverse types with proper capabilities & state
        devices = [
            # ── Living Room ──────────────────────────────────
            Device(
                id="dev-lr-ceiling", name="Ceiling Light",
                device_type=DeviceType.LIGHT, room_id="room-living", owner_id="test-user-id", pin=10,
                capabilities={"power": True, "brightness": True, "color_temp": True},
                state={"is_on": True, "brightness": 80, "color_temp": 4000}
            ),
            Device(
                id="dev-lr-ledstrip", name="Ambient LED Strip",
                device_type=DeviceType.LIGHT, room_id="room-living", owner_id="test-user-id", pin=11,
                capabilities={"power": True, "brightness": True, "rgb_color": True},
                state={"is_on": True, "brightness": 60, "color": "#74b1ff"}
            ),
            Device(
                id="dev-lr-ac", name="AC Unit",
                device_type=DeviceType.CLIMATE, room_id="room-living", owner_id="test-user-id", pin=12,
                capabilities={"power": True, "temperature": True, "modes": ["cool", "heat", "auto"]},
                state={"is_on": True, "temperature": 22, "mode": "cool"}
            ),
            Device(
                id="dev-lr-tv", name="Smart TV",
                device_type=DeviceType.MEDIA, room_id="room-living", owner_id="test-user-id", pin=13,
                capabilities={"power": True, "volume": True},
                state={"is_on": False, "volume": 35}
            ),
            Device(
                id="dev-lr-temp", name="Temp Sensor",
                device_type=DeviceType.SENSOR, room_id="room-living", owner_id="test-user-id", pin=None,
                capabilities={"reading_types": ["temperature", "humidity"]},
                state={"is_on": True, "reading": 22.5, "unit": "°C"}
            ),

            # ── Bedroom ──────────────────────────────────────
            Device(
                id="dev-bd-lamp", name="Bedside Lamp",
                device_type=DeviceType.LIGHT, room_id="room-bedroom", owner_id="test-user-id", pin=20,
                capabilities={"power": True, "brightness": True, "rgb_color": True},
                state={"is_on": False, "brightness": 40, "color": "#FF716C"}
            ),
            Device(
                id="dev-bd-fan", name="Ceiling Fan",
                device_type=DeviceType.FAN, room_id="room-bedroom", owner_id="test-user-id", pin=21,
                capabilities={"power": True, "speed_steps": 3},
                state={"is_on": True, "speed": 2}
            ),
            Device(
                id="dev-bd-cam", name="Security Camera",
                device_type=DeviceType.SECURITY, room_id="room-bedroom", owner_id="test-user-id", pin=22,
                capabilities={"power": True, "motion_detection": True, "night_vision": True},
                state={"is_on": True, "armed": True}
            ),

            # ── Kitchen ──────────────────────────────────────
            Device(
                id="dev-kt-light", name="Kitchen Downlights",
                device_type=DeviceType.LIGHT, room_id="room-kitchen", owner_id="test-user-id", pin=30,
                capabilities={"power": True, "brightness": True},
                state={"is_on": True, "brightness": 100}
            ),
            Device(
                id="dev-kt-smoke", name="Smoke Detector",
                device_type=DeviceType.SENSOR, room_id="room-kitchen", owner_id="test-user-id", pin=None,
                capabilities={"reading_types": ["smoke"]},
                state={"is_on": True, "reading": 0, "unit": "ppm", "status": "Clear"}
            ),
            Device(
                id="dev-kt-plug", name="Coffee Maker Plug",
                device_type=DeviceType.SWITCH, room_id="room-kitchen", owner_id="test-user-id", pin=31,
                capabilities={"power": True},
                state={"is_on": False}
            ),

            # ── Studio ───────────────────────────────────────
            Device(
                id="dev-st-fan", name="Studio Fan",
                device_type=DeviceType.FAN, room_id="room-studio", owner_id="test-user-id", pin=40,
                capabilities={"power": True, "speed_steps": 3},
                state={"is_on": False, "speed": 1}
            ),
            Device(
                id="dev-st-led", name="Desk RGB Strip",
                device_type=DeviceType.LIGHT, room_id="room-studio", owner_id="test-user-id", pin=41,
                capabilities={"power": True, "brightness": True, "rgb_color": True, "color_temp": True},
                state={"is_on": True, "brightness": 75, "color": "#b884ff"}
            ),
            Device(
                id="dev-st-relay", name="Spare Relay",
                device_type=DeviceType.SWITCH, room_id="room-studio", owner_id="test-user-id", pin=42,
                capabilities={"power": True},
                state={"is_on": False}
            ),
        ]
        
        for d in devices:
            db.add(d)
        await db.flush()  # Ensure devices exist before logs

        print("Creating Core Automations...")
        # 4. Automations Example
        automations = [
            Automation(
                id="test-auto-id",
                name="Auto Cooling",
                automation_type="aal",
                trigger="temperature > 28",
                condition="true",
                action="silently turn on fan",
                is_enabled=True,
                owner_id="test-user-id"
            ),
            Automation(
                id="test-auto-id-2",
                name="Morning Routine",
                automation_type="aal",
                trigger="time is 07:00",
                condition="someone is home",
                action="suggest wake up living room",
                is_enabled=True,
                owner_id="test-user-id"
            ),
        ]
        for a in automations:
            db.add(a)

        print("Creating Core Functions...")
        
        functions = [
            Function(
                id="test-func-1",
                name="Wake Up Living Room",
                description="Gradual light increase, temperature adjustment, and coffee initiation sequence.",
                function_type="hardware",
                method="GET",
                url=None,
                owner_id="test-user-id"
            ),
            Function(
                id="test-func-2",
                name="Morning Summary Email",
                description="Fetch overnight security logs and email the summary to admin account.",
                function_type="software",
                method="POST",
                url="https://api.artemis.local/alerts",
                parameters=["adminEmail", "reportDate"],
                owner_id="test-user-id"
            ),
            Function(
                id="test-func-3",
                name="Deep Shield",
                description="Lock all entry points, arm perimeter sensors, and notify external security service API.",
                function_type="hybrid",
                method="POST",
                url="https://api.artemis.local/lockdown",
                parameters=["authorizationCode"],
                owner_id="test-user-id"
            )
        ]

        for f in functions:
            db.add(f)

        print("Creating Chat History & Execution Logs...")

        # ── Build a coherent conversation timeline ──
        # Base time: ~40 minutes ago
        now = datetime.utcnow()
        t = now - timedelta(minutes=40)

        def ts(offset_minutes):
            return t + timedelta(minutes=offset_minutes)

        chat_messages = [
            # --- 1. User arrives home, Artemis greets ---
            ChatMessage(id="msg-01", role="assistant", content="Good evening, Alex. Welcome home. All systems are nominal. Living room is at 73F with 5 active devices.", user_id="test-user-id", created_at=ts(0)),

            # --- 2. User asks about temperature ---
            ChatMessage(id="msg-02", role="user", content="Hey Artemis, it's a bit warm in here. What's the temperature?", user_id="test-user-id", created_at=ts(2)),
            ChatMessage(id="msg-03", role="assistant", content="The living room temperature sensor reads 78.2F. That's above your comfort range. Would you like me to turn on the AC and the ceiling fan?", user_id="test-user-id", created_at=ts(2.5)),

            # --- 3. User approves ---
            ChatMessage(id="msg-04", role="user", content="Yes, cool it down please.", user_id="test-user-id", created_at=ts(3)),
            ChatMessage(id="msg-05", role="assistant", content="On it. I've set the AC to 72F and turned on the ceiling fan at medium speed.", user_id="test-user-id", created_at=ts(3.5)),
            # System confirms execution
            ChatMessage(id="msg-06", role="system", content="Executed: Living Room AC -> set_temperature (72F)", meta_info={"action_id": "log-ac-cool", "status": "success"}, user_id="test-user-id", created_at=ts(3.7)),
            ChatMessage(id="msg-07", role="system", content="Executed: Ceiling Fan -> set_speed (medium)", meta_info={"action_id": "log-fan-on", "status": "success"}, user_id="test-user-id", created_at=ts(3.9)),

            # --- 4. User asks to set mood ---
            ChatMessage(id="msg-08", role="user", content="Set the living room lights to something relaxing.", user_id="test-user-id", created_at=ts(8)),
            ChatMessage(id="msg-09", role="assistant", content="Setting the Hue Ceiling Light to 40% brightness with warm white (2700K), and dimming the LED Strip to a soft amber at 25%.", user_id="test-user-id", created_at=ts(8.5)),
            ChatMessage(id="msg-10", role="system", content="Executed: Hue Ceiling Light -> set_brightness (40%)", meta_info={"action_id": "log-light-dim", "status": "success"}, user_id="test-user-id", created_at=ts(8.8)),

            # --- 5. Automation fires in background ---
            ChatMessage(id="msg-11", role="system", content="Auto Cooling triggered: temperature threshold exceeded.", meta_info={"action_id": "log-auto-cool", "status": "success"}, user_id="test-user-id", created_at=ts(15)),

            # --- 6. User asks about security ---
            ChatMessage(id="msg-12", role="user", content="Is the security camera armed?", user_id="test-user-id", created_at=ts(20)),
            ChatMessage(id="msg-13", role="assistant", content="The Bedroom Security Camera is currently armed and recording. No motion events in the last 2 hours. All clear.", user_id="test-user-id", created_at=ts(20.5)),

            # --- 7. Getting ready for bed ---
            ChatMessage(id="msg-14", role="user", content="It's getting late. Turn off everything except the bedroom lamp.", user_id="test-user-id", created_at=ts(30)),
            ChatMessage(id="msg-15", role="assistant", content="Understood. Powering down the living room, kitchen, and studio. Keeping the Bedside Lamp on at 30% for you. Goodnight, Alex.", user_id="test-user-id", created_at=ts(30.5)),
            ChatMessage(id="msg-16", role="system", content="Executed: Scene Change -> Goodnight Mode", meta_info={"action_id": "log-goodnight", "status": "success"}, user_id="test-user-id", created_at=ts(31)),
        ]

        for m in chat_messages:
            db.add(m)

        # ── Matching execution logs ──
        execution_logs = [
            ExecutionLog(id="log-ac-cool", action_type="control_device", target_name="Living Room AC", status="success", triggered_by="mcp", user_id="test-user-id", executed_at=ts(3.7),
                response_payload={"description": "Set target temperature to 72F. Compressor engaged.", "device_id": "dev-ac"}),

            ExecutionLog(id="log-fan-on", action_type="control_device", target_name="Ceiling Fan", status="success", triggered_by="mcp", user_id="test-user-id", executed_at=ts(3.9),
                response_payload={"description": "Fan speed set to medium (level 2/3).", "device_id": "dev-fan-living"}),

            ExecutionLog(id="log-light-dim", action_type="control_device", target_name="Hue Ceiling Light", status="success", triggered_by="mcp", user_id="test-user-id", executed_at=ts(8.8),
                response_payload={"description": "Brightness adjusted to 40%, color temperature set to 2700K warm white.", "device_id": "dev-light-ceiling"}),

            ExecutionLog(id="log-auto-cool", action_type="automation_run", target_name="Auto Cooling", status="success", triggered_by="automation", user_id="test-user-id", executed_at=ts(15),
                response_payload={"description": "Temperature exceeded 28C threshold. Studio fan activated automatically.", "automation_id": "test-auto-id"}),

            ExecutionLog(id="log-goodnight", action_type="function_call", target_name="Goodnight Mode", status="success", triggered_by="user", user_id="test-user-id", executed_at=ts(31),
                response_payload={"description": "All devices powered off except Bedside Lamp (30%). Security camera maintained.", "devices_affected": 8}),
        ]

        for l in execution_logs:
            db.add(l)

        await db.commit()
        print("Database Seeded Successfully!")
        print("-------------------------------")
        print("Test User: alex@artemis.local / password123")
        print(f"Rooms: {len(rooms)}")
        print(f"Devices: {len(devices)}")
        for d in devices:
             print(f"  [{d.device_type.value:8}] {d.name} -> {d.room_id}")
             
    await engine.dispose()
        
if __name__ == "__main__":
    asyncio.run(seed_database())
