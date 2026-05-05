import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal, engine, Base
from app.models import User, Room, Device, Automation, DeviceType
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
                device_type=DeviceType.LIGHT, room_id="room-living", owner_id="test-user-id",
                capabilities={"power": True, "brightness": True, "color_temp": True},
                state={"is_on": True, "brightness": 80, "color_temp": 4000}
            ),
            Device(
                id="dev-lr-ledstrip", name="Ambient LED Strip",
                device_type=DeviceType.LIGHT, room_id="room-living", owner_id="test-user-id",
                capabilities={"power": True, "brightness": True, "rgb_color": True},
                state={"is_on": True, "brightness": 60, "color": "#74b1ff"}
            ),
            Device(
                id="dev-lr-ac", name="AC Unit",
                device_type=DeviceType.CLIMATE, room_id="room-living", owner_id="test-user-id",
                capabilities={"power": True, "temperature": True, "modes": ["cool", "heat", "auto"]},
                state={"is_on": True, "temperature": 22, "mode": "cool"}
            ),
            Device(
                id="dev-lr-tv", name="Smart TV",
                device_type=DeviceType.MEDIA, room_id="room-living", owner_id="test-user-id",
                capabilities={"power": True, "volume": True},
                state={"is_on": False, "volume": 35}
            ),
            Device(
                id="dev-lr-temp", name="Temp Sensor",
                device_type=DeviceType.SENSOR, room_id="room-living", owner_id="test-user-id",
                capabilities={"reading_types": ["temperature", "humidity"]},
                state={"is_on": True, "reading": 22.5, "unit": "°C"}
            ),

            # ── Bedroom ──────────────────────────────────────
            Device(
                id="dev-bd-lamp", name="Bedside Lamp",
                device_type=DeviceType.LIGHT, room_id="room-bedroom", owner_id="test-user-id",
                capabilities={"power": True, "brightness": True, "rgb_color": True},
                state={"is_on": False, "brightness": 40, "color": "#FF716C"}
            ),
            Device(
                id="dev-bd-fan", name="Ceiling Fan",
                device_type=DeviceType.FAN, room_id="room-bedroom", owner_id="test-user-id",
                capabilities={"power": True, "speed_steps": 3},
                state={"is_on": True, "speed": 2}
            ),
            Device(
                id="dev-bd-cam", name="Security Camera",
                device_type=DeviceType.SECURITY, room_id="room-bedroom", owner_id="test-user-id",
                capabilities={"power": True, "motion_detection": True, "night_vision": True},
                state={"is_on": True, "armed": True}
            ),

            # ── Kitchen ──────────────────────────────────────
            Device(
                id="dev-kt-light", name="Kitchen Downlights",
                device_type=DeviceType.LIGHT, room_id="room-kitchen", owner_id="test-user-id",
                capabilities={"power": True, "brightness": True},
                state={"is_on": True, "brightness": 100}
            ),
            Device(
                id="dev-kt-smoke", name="Smoke Detector",
                device_type=DeviceType.SENSOR, room_id="room-kitchen", owner_id="test-user-id",
                capabilities={"reading_types": ["smoke"]},
                state={"is_on": True, "reading": 0, "unit": "ppm", "status": "Clear"}
            ),
            Device(
                id="dev-kt-plug", name="Coffee Maker Plug",
                device_type=DeviceType.SWITCH, room_id="room-kitchen", owner_id="test-user-id",
                capabilities={"power": True},
                state={"is_on": False}
            ),

            # ── Studio ───────────────────────────────────────
            Device(
                id="dev-st-fan", name="Studio Fan",
                device_type=DeviceType.FAN, room_id="room-studio", owner_id="test-user-id",
                capabilities={"power": True, "speed_steps": 3},
                state={"is_on": False, "speed": 1}
            ),
            Device(
                id="dev-st-led", name="Desk RGB Strip",
                device_type=DeviceType.LIGHT, room_id="room-studio", owner_id="test-user-id",
                capabilities={"power": True, "brightness": True, "rgb_color": True, "color_temp": True},
                state={"is_on": True, "brightness": 75, "color": "#b884ff"}
            ),
            Device(
                id="dev-st-relay", name="Spare Relay",
                device_type=DeviceType.SWITCH, room_id="room-studio", owner_id="test-user-id",
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
        from app.models import Function, ExecutionLog
        
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

        print("Creating Execution Logs (History)...")
        logs = [
            ExecutionLog(
                id="log-1",
                action_type="automation_run",
                target_name="Security Perimeter Active",
                status="success",
                triggered_by="automation",
                user_id="test-user-id",
                response_payload={
                    "description": "Triggered by: Geofence exit detected. All ground-floor smart locks engaged.",
                    "systemContext": "User has departed primary residence radius. Executing Lockdown protocol."
                }
            ),
            ExecutionLog(
                id="log-2",
                action_type="function_call",
                target_name="Scene Change: Deep Focus",
                status="success",
                triggered_by="user",
                user_id="test-user-id"
            ),
            ExecutionLog(
                id="log-3",
                action_type="mcp_suggestion",
                target_name="Grocery List Synced",
                status="pending",
                triggered_by="mcp",
                user_id="test-user-id"
            )
        ]
        for l in logs:
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
