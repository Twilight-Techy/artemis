import asyncio
from app.database import AsyncSessionLocal
from app.models import Device
from sqlalchemy import select
from app.schemas import DeviceOut

async def run():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Device))
        devices = res.scalars().all()
        for d in devices:
            try:
                DeviceOut.model_validate(d)
            except Exception as e:
                print(f"Error on device {d.name}: {e}")

if __name__ == "__main__":
    asyncio.run(run())
