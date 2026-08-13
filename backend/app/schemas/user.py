from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ProfileBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    username: str = Field(min_length=3, max_length=50)
    full_name: Optional[str] = Field(default=None, max_length=200)
    avatar_url: Optional[str] = None


class ProfileCreate(ProfileBase):
    id: str  # Supabase auth user id


class ProfileUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    full_name: Optional[str] = Field(default=None, max_length=200)
    avatar_url: Optional[str] = None


class ProfileResponse(ProfileBase):
    id: str
    role: Literal["user", "admin"] = "user"
    created_at: datetime
