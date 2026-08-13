import base64
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import settings

# `auto_error=False` lets us return a clean 401 (instead of FastAPI's default
# error shape) when the header is missing entirely.
security = HTTPBearer(auto_error=False)


class TokenPayload(BaseModel):
    """Minimal, verified representation of a Supabase access token."""

    sub: str  # Supabase auth user id (uuid)
    email: Optional[str] = None
    role: Optional[str] = None  # Supabase's own "role" claim (e.g. "authenticated")


def decode_supabase_token(token: str) -> TokenPayload:
    """
    Verifies and decodes a Supabase-issued access token.
    First attempts fast local JWT verification. If that fails (e.g. JWT secret
    mismatch), falls back to verifying the token directly via Supabase Auth API.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Fast local verification using JWT secret
    # Supabase exposes the JWT secret as a Base64 string in the dashboard.
    # python-jose requires the raw bytes for HS256, so we decode it first.
    # If it isn't valid Base64 we fall back to using the raw string.
    if settings.supabase_jwt_secret:
        raw_secret = settings.supabase_jwt_secret
        try:
            decoded_secret: str | bytes = base64.b64decode(raw_secret)
        except Exception:
            decoded_secret = raw_secret

        for secret_candidate in [decoded_secret, raw_secret]:
            try:
                payload = jwt.decode(
                    token,
                    secret_candidate,
                    algorithms=["HS256", "RS256"],
                    options={"verify_aud": False},
                )
                user_id = payload.get("sub")
                if user_id:
                    return TokenPayload(
                        sub=user_id,
                        email=payload.get("email"),
                        role=payload.get("role"),
                    )
            except JWTError:
                pass
            except Exception:
                pass

    # 2. Direct Supabase API verification fallback
    try:
        from app.database.supabase_client import get_supabase_anon
        res = get_supabase_anon().auth.get_user(token)
        if res and res.user:
            return TokenPayload(
                sub=res.user.id,
                email=res.user.email,
                role=getattr(res.user, "role", "authenticated"),
            )
    except Exception as exc:
        print(f"Supabase token validation error: {exc}")

    raise credentials_exception

def get_current_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """
    Extracts the raw bearer token from the Authorization header.
    Route dependencies that need the raw token (e.g. to build a
    user-scoped Supabase client) should depend on this directly.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


def get_current_user_id(token: str = Depends(get_current_token)) -> str:
    """FastAPI dependency: returns the authenticated user's Supabase id."""
    payload = decode_supabase_token(token)
    return payload.sub


def get_current_token_payload(token: str = Depends(get_current_token)) -> TokenPayload:
    """FastAPI dependency: returns the full decoded token payload."""
    return decode_supabase_token(token)