from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """
    Central application configuration.

    All values are loaded from environment variables (or a local .env file
    in development). Nothing business-logic-related belongs here — this is
    config only.
    """

    app_name: str = "VeillIA API"
    environment: str = Field(default="development", validation_alias="ENVIRONMENT")
    host: str = Field(default="0.0.0.0", validation_alias="HOST")
    port: int = Field(default=8000, validation_alias="PORT")

    # --- Supabase ---
    supabase_url: str = Field(default="", validation_alias="SUPABASE_URL")
    supabase_anon_key: str = Field(default="", validation_alias="SUPABASE_ANON_KEY")
    supabase_service_role_key: str = Field(
        default="", validation_alias="SUPABASE_SERVICE_ROLE_KEY"
    )
    # JWT secret from Supabase Project Settings > API > JWT Settings.
    # Needed to verify access tokens locally without a round trip to Supabase.
    supabase_jwt_secret: str = Field(default="", validation_alias="SUPABASE_JWT_SECRET")

    # --- CORS ---
    # Comma-separated list of allowed origins, e.g.
    # "http://localhost:3000,https://app.veillia.com"
    cors_origins: str = Field(default="http://localhost:3000", validation_alias="CORS_ORIGINS")

    @field_validator("supabase_jwt_secret")
    @classmethod
    def _warn_if_secret_missing(cls, v: str) -> str:
        # We don't hard-fail here so the app can still boot for tooling
        # (e.g. `alembic`, docs generation) without full env config, but
        # verify_jwt() will refuse to run without a real secret.
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    class Config:
        # Resolve this file from the backend itself, rather than from the
        # directory used to start Uvicorn.
        env_file = BACKEND_ROOT / ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
