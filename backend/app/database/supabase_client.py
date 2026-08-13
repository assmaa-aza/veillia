from functools import lru_cache

from supabase import create_client, Client

from app.core.config import settings


@lru_cache
def get_supabase_anon() -> Client:
    """
    A client using the public anon key.

    Used for auth calls that don't yet have a user session (sign_up,
    sign_in_with_password, refresh_session). Row Level Security still
    applies to any table calls made with this client.
    """
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@lru_cache
def get_supabase_admin() -> Client:
    """
    A client using the service role key.

    This BYPASSES Row Level Security entirely. Use it only where that's
    intentional (e.g. creating a profile row right after sign-up, before
    the user necessarily has a usable session). Never expose this key or
    this client to anything client-facing.
    """
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase_for_user(access_token: str) -> Client:
    """
    Builds a client scoped to a specific user's access token, so that
    `auth.uid()` resolves correctly inside Row Level Security policies.

    Not cached, since the token differs per request.
    """
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    # postgrest-py exposes headers so we can forward the user's JWT;
    # this makes reads/writes through this client subject to RLS as that user.
    client.postgrest.auth(access_token)
    return client
