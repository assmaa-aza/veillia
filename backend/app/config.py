import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    app_name: str = "VeillIA API"
    environment: str = Field(default="development", validation_alias="ENVIRONMENT")
    host: str = Field(default="0.0.0.0", validation_alias="HOST")
    port: int = Field(default=8000, validation_alias="PORT")
    
    # Database
    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/veillia", 
        validation_alias="DATABASE_URL"
    )
    
    # Supabase Auth
    supabase_url: str = Field(default="", validation_alias="SUPABASE_URL")
    supabase_jwt_secret: str = Field(
        default="super-secret-jwt-signing-key-ensure-this-matches-supabase-jwt-secret", 
        validation_alias="SUPABASE_JWT_SECRET"
    )
    supabase_service_role_key: str = Field(default="", validation_alias="SUPABASE_SERVICE_ROLE_KEY")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
