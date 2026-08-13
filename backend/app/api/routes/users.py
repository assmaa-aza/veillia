from fastapi import APIRouter, Depends

from app.api.deps import get_current_profile, get_user_supabase_client
from app.core.security import get_current_user_id
from app.schemas.user import ProfileResponse, ProfileUpdate
from app.services.profile_service import profile_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=ProfileResponse)
def read_current_user(profile=Depends(get_current_profile)):
    """Returns the authenticated user's profile."""
    return profile


@router.patch("/me", response_model=ProfileResponse)
def update_current_user(
    payload: ProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_user_supabase_client),
):
    """Updates the authenticated user's profile (partial update)."""
    return profile_service.update_profile(supabase, user_id, payload)
