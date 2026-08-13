from fastapi import APIRouter, Depends
from app.api.deps import get_user_supabase_client
from app.core.security import get_current_user_id
from app.schemas.preferences import UserPreferencesResponse, UserPreferencesUpdate
from app.services.preference_service import preference_service

router = APIRouter(prefix="/preferences", tags=["preferences"])


@router.get("/me", response_model=UserPreferencesResponse)
def read_my_preferences(
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_user_supabase_client),
):
    """Returns the authenticated user's preferences."""
    return preference_service.get_preferences(supabase, user_id)


@router.patch("/me", response_model=UserPreferencesResponse)
def update_my_preferences(
    payload: UserPreferencesUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_user_supabase_client),
):
    """Updates the authenticated user's preferences (partial update)."""
    return preference_service.update_preferences(supabase, user_id, payload)
