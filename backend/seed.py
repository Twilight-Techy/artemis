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
        # 3. Create Devices
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
            Device(
                id="dev-lr-motion", name="Motion Sensor",
                device_type=DeviceType.SENSOR, room_id="room-living", owner_id="test-user-id", pin=None,
                capabilities={"reading_types": ["motion"]},
                state={"is_on": True, "reading": False, "unit": "boolean"}
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
                capabilities={
                    "power": True,
                    "brightness": {"mode": "steps", "count": 3, "labels": ["Low", "Med", "High"]},
                },
                state={"is_on": True, "brightness": 2},
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
                capabilities={"power": True, "speed": {"mode": "percentage", "min": 0, "max": 100}},
                state={"is_on": False, "speed": 35},
            ),
            Device(
                id="dev-st-led", name="Desk RGB Strip",
                device_type=DeviceType.LIGHT, room_id="room-studio", owner_id="test-user-id", pin=41,
                capabilities={"power": True, "brightness": True, "rgb_color": True, "color_temp": True},
                state={"is_on": True, "brightness": 75, "color": "#b884ff"}
            ),
            Device(
                id="dev-st-motion", name="Desk Motion Sensor",
                device_type=DeviceType.SENSOR, room_id="room-studio", owner_id="test-user-id", pin=None,
                capabilities={"reading_types": ["motion"]},
                state={"is_on": True, "reading": True, "unit": "boolean"}
            ),
        ]
        
        for d in devices:
            db.add(d)
        await db.flush()

        print("Creating Core Automations...")
        # 4. Automations
        automations = [
            Automation(
                id="auto-cool-living",
                name="Auto Cooling (Silent)",
                description="Automatically activates the Living Room AC when the temperature gets too high and someone is present.",
                automation_type="aal",
                trigger="temperature > 28 in Living Room",
                condition="someone is in the Living Room",
                action="turn on Living Room AC",
                requires_approval=False,  # Silent automation!
                is_enabled=True,
                owner_id="test-user-id"
            ),
            Automation(
                id="auto-morning",
                name="Morning Routine (Requires Approval)",
                description="Prompts the user to start their morning wake up routine at 7:00 AM.",
                automation_type="aal",
                trigger="time is 07:00 AM",
                condition="someone is home",
                action="suggest wake up living room function",
                requires_approval=True,  # Suggestion Card automation!
                is_enabled=True,
                owner_id="test-user-id"
            ),
        ]
        for a in automations:
            db.add(a)

        print("Creating Core Functions...")
        # 5. Functions
        functions = [
            Function(
                id="func-wakeup",
                name="Wake Up Living Room",
                description="Gradual light increase, temperature adjustment, and coffee initiation sequence.",
                function_type="hardware",
                method="GET",
                url=None,
                triggers=["wake up", "good morning", "start my day"],
                conditions=["time is between 05:00 and 09:00", "someone is home"],
                owner_id="test-user-id"
            ),
            Function(
                id="func-morning-email",
                name="Morning Summary Email",
                description="Fetch overnight security logs and email the summary to admin account.",
                function_type="software",
                method="POST",
                url="https://api.artemis.local/alerts",
                parameters=["adminEmail", "reportDate"],
                triggers=["send morning report", "email security summary"],
                conditions=["time is 08:00 AM"],
                owner_id="test-user-id"
            ),
            Function(
                id="func-deep-shield",
                name="Deep Shield",
                description="Lock all entry points, arm perimeter sensors, and notify external security service API.",
                function_type="hybrid",
                method="POST",
                url="https://api.artemis.local/lockdown",
                parameters=["authorizationCode"],
                triggers=["activate deep shield", "lock down the house", "intruder alert"],
                conditions=["system is armed"],
                owner_id="test-user-id"
            )
        ]

        for f in functions:
            db.add(f)
        await db.flush()

        print("Creating Execution Logs...")
        # Base time: ~40 minutes ago
        now = datetime.utcnow()
        t = now - timedelta(minutes=40)

        def ts(offset_minutes):
            return t + timedelta(minutes=offset_minutes)

        # 6. Execution Logs
        execution_logs = [
            # Manual Control
            ExecutionLog(id="log-ac-cool", action_type="device_control", target_name="AC Unit", target_id="dev-lr-ac", status="success", triggered_by="manual", user_id="test-user-id", executed_at=ts(3.7),
                request_payload={"action": "on"}, response_payload={"description": "Set target temperature to 72F. Compressor engaged.", "device_id": "dev-lr-ac"}),
            
            # MCP (AI) Control
            ExecutionLog(id="log-fan-on", action_type="device_control", target_name="Ceiling Fan", target_id="dev-bd-fan", status="success", triggered_by="mcp", user_id="test-user-id", executed_at=ts(3.9),
                request_payload={"action": "on", "speed": 2}, response_payload={"description": "Fan speed set to medium (level 2/3).", "device_id": "dev-bd-fan"}),

            # Automation Execution (Silent)
            ExecutionLog(id="log-auto-cool", action_type="automation_run", target_name="Auto Cooling (Silent)", target_id="auto-cool-living", status="success", triggered_by="automation", user_id="test-user-id", executed_at=ts(15),
                request_payload={"trigger": "temperature > 28"}, response_payload={"description": "Temperature exceeded 28C threshold. AC activated automatically.", "automation_id": "auto-cool-living"}),

            # User Function Call
            ExecutionLog(id="log-goodnight", action_type="function_call", target_name="Deep Shield", target_id="func-deep-shield", status="success", triggered_by="manual", user_id="test-user-id", executed_at=ts(31),
                request_payload={"authorizationCode": "1234"}, response_payload={"description": "Perimeter secured. Notified external service.", "status": "success"}),
        ]

        for l in execution_logs:
            db.add(l)
        
        await db.flush()

        print("Creating Chat History...")
        # 7. Chat History
        chat_messages = [
            # User arrives home, Artemis greets
            ChatMessage(id="msg-01", role="assistant", content="Good evening, Alex. Welcome home. All systems are nominal. Living room is at 73F with 5 active devices.", user_id="test-user-id", created_at=ts(0)),

            # User asks about temperature
            ChatMessage(id="msg-02", role="user", content="Hey Artemis, it's a bit warm in here. What's the temperature?", user_id="test-user-id", created_at=ts(2)),
            ChatMessage(id="msg-03", role="assistant", content="The living room temperature sensor reads 78.2F. That's above your comfort range. Would you like me to turn on the AC and the ceiling fan?", user_id="test-user-id", created_at=ts(2.5)),

            # User approves
            ChatMessage(id="msg-04", role="user", content="Yes, cool it down please.", user_id="test-user-id", created_at=ts(3)),
            ChatMessage(id="msg-05", role="assistant", content="On it. I've set the AC to 72F and turned on the ceiling fan at medium speed.", user_id="test-user-id", created_at=ts(3.5)),
            
            # System confirms execution (linked to ExecutionLog)
            ChatMessage(id="msg-06", role="system", content="Executed: AC Unit -> turn_on", meta_info={"action_id": "log-ac-cool", "status": "success"}, user_id="test-user-id", created_at=ts(3.7)),
            ChatMessage(id="msg-07", role="system", content="Executed: Ceiling Fan -> set_speed (medium)", meta_info={"action_id": "log-fan-on", "status": "success"}, user_id="test-user-id", created_at=ts(3.9)),

            # Automation fires in background
            ChatMessage(id="msg-11", role="system", content="Auto Cooling triggered: temperature threshold exceeded.", meta_info={"action_id": "log-auto-cool", "status": "success"}, user_id="test-user-id", created_at=ts(15)),

            # User asks about security
            ChatMessage(id="msg-12", role="user", content="Is the security camera armed?", user_id="test-user-id", created_at=ts(20)),
            ChatMessage(id="msg-13", role="assistant", content="The Bedroom Security Camera is currently armed and recording. No motion events in the last 2 hours. All clear.", user_id="test-user-id", created_at=ts(20.5)),

            # Getting ready for bed
            ChatMessage(id="msg-14", role="user", content="It's getting late. Trigger Deep Shield.", user_id="test-user-id", created_at=ts(30)),
            ChatMessage(id="msg-15", role="assistant", content="Understood. Initiating Deep Shield. Have a good night, Alex.", user_id="test-user-id", created_at=ts(30.5)),
            ChatMessage(id="msg-16", role="system", content="Executed: Function -> Deep Shield", meta_info={"action_id": "log-goodnight", "status": "success"}, user_id="test-user-id", created_at=ts(31)),
        ]

        for m in chat_messages:
            db.add(m)

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
