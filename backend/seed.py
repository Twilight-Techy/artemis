import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal, engine, Base
from app.models import User, Room, Device, Automation
from app.services.auth_service import hash_password

async def seed_database():
    print("Initializing Database...")
    
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        print("Creating User...")
        # 1. Create User
        user = await db.get(User, "test-user-id")
        if not user:
            user = User(
                id="test-user-id",
                username="alex",
                email="alex@artemis.local",
                hashed_password=hash_password("password123"),
                display_name="Alex"
            )
            db.add(user)

        print("Creating Rooms...")
        # 2. Create Rooms
        room = await db.get(Room, "test-room-id")
        if not room:
            room = Room(
                id="test-room-id",
                name="Living Room",
                owner_id="test-user-id"
            )
            db.add(room)

        print("Creating ESP32 Devices...")
        # 3. Create Devices matching ESP32 Channels
        devices = [
            # ID mappings correspond to hardware_service.DEVICE_PIN_MAP or typical naming
            Device(id="test-device-fan", name="Studio Fan", device_type="fan", room_id="test-room-id", owner_id="test-user-id"),
            Device(id="test-device-led", name="Ambient LED Strip", device_type="lights", room_id="test-room-id", owner_id="test-user-id"),
            Device(id="test-device-spare", name="Spare Relay", device_type="switch", room_id="test-room-id", owner_id="test-user-id"),
        ]
        
        for d in devices:
            existing = await db.get(Device, d.id)
            if not existing:
                db.add(d)

        print("Creating Core Automations...")
        # 4. Automations Example
        auto = await db.get(Automation, "test-auto-id")
        if not auto:
            auto = Automation(
                id="test-auto-id",
                name="Auto Cooling",
                automation_type="aal",
                trigger="temperature > 28",
                condition="true",
                action="silently turn on fan",
                is_enabled=True,
                owner_id="test-user-id"
            )
            db.add(auto)

        auto2 = await db.get(Automation, "test-auto-id-2")
        if not auto2:
            auto2 = Automation(
                id="test-auto-id-2",
                name="Morning Routine",
                automation_type="aal",
                trigger="time is 07:00",
                condition="someone is home",
                action="suggest wake up living room",
                is_enabled=True,
                owner_id="test-user-id"
            )
            db.add(auto2)

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

        for num, f in enumerate(functions):
            existing = await db.get(Function, f.id)
            if not existing:
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
            existing = await db.get(ExecutionLog, l.id)
            if not existing:
                db.add(l)

        await db.commit()
        print("Database Seeded Successfully!")
        print("-------------------------------")
        print("Test User: alex@artemis.local")
        print("Devices:")
        for d in devices:
             print(f" - {d.name} ({d.id})")
             
    await engine.dispose()
        
if __name__ == "__main__":
    asyncio.run(seed_database())
