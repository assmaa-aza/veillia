from fastapi import HTTPException, status
from app.schemas.preferences import UserPreferencesUpdate
from app.database.supabase_client import get_supabase_admin


DEFAULT_PREFERENCES = {
    "role": None,
    "interests": [],
    "content_types": [],
    "followed_companies": [],
    "preferred_language": "Français",
    "recommendation_frequency": "Quotidiennement",
    "onboarding_completed": False,
}


def _upsert_preferences(admin, user_id: str, data: dict) -> dict:
    """
    Safe insert-or-update for user_preferences.

    Uses an explicit SELECT → UPDATE or INSERT pattern instead of relying on
    ON CONFLICT, which requires a database-level UNIQUE constraint on user_id.
    This works correctly whether or not that constraint exists yet.
    """
    existing = admin.table("user_preferences").select("id").eq("user_id", user_id).execute()

    if existing.data:
        # Row exists — UPDATE it
        admin.table("user_preferences").update(data).eq("user_id", user_id).execute()
    else:
        # No row yet — INSERT a fresh one with complete defaults + provided data
        full_data = {**DEFAULT_PREFERENCES, **data, "user_id": user_id}
        admin.table("user_preferences").insert(full_data).execute()

    res = admin.table("user_preferences").select("*").eq("user_id", user_id).execute()
    if res.data:
        return res.data[0]

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to persist user preferences.",
    )


class PreferenceService:
    """
    Manages user_preferences table using Supabase admin client to guarantee
    reliable reads and writes regardless of RLS edge cases.
    """

    @staticmethod
    def get_preferences(supabase, user_id: str) -> dict:
        admin = get_supabase_admin()
        try:
            res = (
                admin.table("user_preferences")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as exc:
            print(f"Preference get warning: {exc}")

        # No row found — create default preferences
        try:
            return _upsert_preferences(admin, user_id, DEFAULT_PREFERENCES)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to initialize user preferences: {exc}",
            )

    @staticmethod
    def update_preferences(
        supabase, user_id: str, payload: UserPreferencesUpdate
    ) -> dict:
        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one field must be provided to update preferences.",
            )

        admin = get_supabase_admin()
        try:
            return _upsert_preferences(admin, user_id, update_data)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to save preferences: {exc}",
            )


preference_service = PreferenceService()