from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    """
    Artemis API Gateway configuration.
    Values are loaded from environment variables or .env file.
    """

    # ── Database ──
    database_url: str

    # ── Auth ──
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    # ── CORS ──
    allowed_origins: str

    # ── Gemini API (MCP Core) ──
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # ── Notifications ──
    expo_push_url: str

    # ── ESP32 Hardware Bridge ──
    esp32_base_url: str = ""
    esp32_auth_token: str = ""

    # ── MQTT ──
    mqtt_broker: str = ""
    mqtt_port: int = 8883
    mqtt_user: str = ""
    mqtt_pass: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    model_config = SettingsConfigDict(
        env_file=BACKEND_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
