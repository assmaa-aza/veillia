from fastapi import Depends

from app.core.security import get_current_token, get_current_user_id
from app.database.supabase_client import get_supabase_for_user
from app.schemas.user import ProfileResponse
from app.services.profile_service import profile_service


def get_user_supabase_client(token: str = Depends(get_current_token)):
    """
    FastAPI dependency that returns a Supabase client scoped to the
    requesting user's access token, so table queries respect RLS as that
    user (equivalent in spirit to the previous SQLAlchemy `get_db` dependency,
    but backed by Supabase instead of a raw Postgres connection).
    """
    return get_supabase_for_user(token)


def get_current_profile(
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_user_supabase_client),
) -> ProfileResponse:
    """
    Full "get current user" dependency: verifies the JWT, then loads the
    corresponding profiles row. Use this in any route that needs the
    authenticated user's profile data.
    """
    return profile_service.get_profile(supabase, user_id)


# Aliases for backwards compatibility
get_current_user = get_current_profile
get_supabase_client = get_user_supabase_client

