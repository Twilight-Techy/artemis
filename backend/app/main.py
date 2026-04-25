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
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup (dev convenience). Use Alembic for production migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)
    yield
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
