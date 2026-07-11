import httpx
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, Base
from app.routes import (
    auth_router,
    rooms_router,
    devices_router,
    functions_router,
    automations_router,
    chat_router,
    sensors_router,
    mcp_router,
    logs_router,
    bridge_router,
)

settings = get_settings()


async def keep_alive_ping():
    """Ping self every 14 minutes to prevent Render from spinning down the instance."""
    url = "https://artemis-471k.onrender.com/health"
    while True:
        await asyncio.sleep(14 * 60)  # 14 minutes
        try:
            async with httpx.AsyncClient() as client:
                await client.get(url)
                print(f"Keep-alive ping sent to {url}")
        except Exception as e:
            print(f"Keep-alive ping failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup (dev convenience). Use Alembic for production migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)
        
    import asyncio
    from app.services.time_scheduler import run_time_scheduler
    scheduler_task = asyncio.create_task(run_time_scheduler())
    ping_task = asyncio.create_task(keep_alive_ping())
    
    yield
    
    scheduler_task.cancel()
    ping_task.cancel()
    await engine.dispose()


app = FastAPI(
    title="Artemis API Gateway",
    description="Backend API for the Artemis AI-powered Smart Home Hub",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ──
app.include_router(auth_router, prefix="/api/v1")
app.include_router(rooms_router, prefix="/api/v1")
app.include_router(devices_router, prefix="/api/v1")
app.include_router(functions_router, prefix="/api/v1")
app.include_router(automations_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(sensors_router, prefix="/api/v1")
app.include_router(mcp_router, prefix="/api/v1")
app.include_router(logs_router, prefix="/api/v1")
app.include_router(bridge_router, prefix="/api/v1")

# WebSocket Router doesn't need /api/v1 prefix necessarily, but keeping it standard is fine
from app.routes.websockets import router as ws_router
app.include_router(ws_router)


@app.get("/")
async def root():
    return {
        "name": "Artemis API Gateway",
        "version": "0.1.0",
        "status": "operational",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
