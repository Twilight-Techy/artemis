from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    Artemis API Gateway configuration.
    Values are loaded from environment variables or .env file.
    """

    # ── Database ──
    database_url: str = "postgresql+asyncpg://localhost/artemis"

    # ── Auth ──
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    # ── CORS ──
    allowed_origins: str = "http://localhost:8081"

    # ── MCP Core ──
    mcp_model_endpoint: str = "http://localhost:11434/api/generate"
    mcp_model_name: str = "llama3"

    # ── Hardware Bridge ──
    hardware_bridge_url: str = "http://192.168.1.50"
    mqtt_broker_url: str = "mqtt://192.168.1.50:1883"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
