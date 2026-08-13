from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from app.api.deps import get_user_supabase_client
from app.core.security import get_current_user_id
from app.services.preference_service import preference_service
from app.services.recommendation_service import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/me", response_model=List[Dict[str, Any]])
def get_user_recommendations(
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_user_supabase_client),
):
    """
    Returns personalized article recommendations for the authenticated user based on
    their saved preferences (interests, followed companies, content types, preferred language).
    """
    prefs = preference_service.get_preferences(supabase, user_id)
    return recommendation_service.get_recommendations(user_id, prefs)
