from .auth import router as auth_router
from .rooms import router as rooms_router
from .devices import router as devices_router
from .functions import router as functions_router
from .automations import router as automations_router
from .chat import router as chat_router
from .sensors import router as sensors_router
from .mcp import router as mcp_router
from .logs import router as logs_router
from .bridge import router as bridge_router

__all__ = [
    "auth_router",
    "rooms_router",
    "devices_router",
    "functions_router",
    "automations_router",
    "chat_router",
    "sensors_router",
    "mcp_router",
    "logs_router",
    "bridge_router",
]
