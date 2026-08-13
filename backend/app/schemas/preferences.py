from datetime import datetime
from typing import Any, List, Optional, Union
from pydantic import BaseModel, ConfigDict, field_validator


class UserPreferencesBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    role: Optional[str] = None
    interests: List[str] = []
    content_types: List[str] = []
    followed_companies: List[str] = []
    preferred_language: Optional[str] = "Français"
    recommendation_frequency: Optional[str] = "Quotidiennement"
    onboarding_completed: bool = False

    @field_validator("interests", "content_types", "followed_companies", mode="before")
    @classmethod
    def coerce_list(cls, v: Any) -> List[str]:
        if v is None:
            return []
        return v


class UserPreferencesUpdate(BaseModel):
    role: Optional[str] = None
    interests: Optional[List[str]] = None
    content_types: Optional[List[str]] = None
    followed_companies: Optional[List[str]] = None
    preferred_language: Optional[str] = None
    recommendation_frequency: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class UserPreferencesResponse(UserPreferencesBase):
    id: Union[str, int]
    user_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v: Any) -> str:
        if v is not None:
            return str(v)
        return ""

