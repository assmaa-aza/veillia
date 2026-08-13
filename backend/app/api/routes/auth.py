from fastapi import APIRouter, Depends, status

from app.core.security import get_current_token
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    ResendOtpRequest,
    ResendOtpResponse,
    TokenResponse,
    VerifyOtpRequest,
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> RegisterResponse:
    """
    Registers a new user via Supabase Auth and creates the matching
    `profiles` row. If your Supabase project has email confirmation
    enabled, `session` will be null until the user verifies their email.
    """
    return auth_service.register(payload)


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    """Authenticates a user and returns access/refresh tokens."""
    return auth_service.login(payload)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest) -> TokenResponse:
    """Exchanges a refresh token for a new access/refresh token pair."""
    return auth_service.refresh(payload.refresh_token)


@router.post("/logout", response_model=LogoutResponse)
def logout(token: str = Depends(get_current_token)) -> LogoutResponse:
    """Revokes the current session. Requires a valid bearer token."""
    auth_service.logout(token)
    return LogoutResponse()


@router.post("/verify-otp", response_model=LoginResponse)
def verify_otp(payload: VerifyOtpRequest) -> LoginResponse:
    """
    Verifies the 6-digit OTP sent to the user's email during sign-up.
    Returns a full session on success so the frontend can sign the user in
    immediately without a separate login call.
    """
    return auth_service.verify_otp(payload)


@router.post("/resend-otp", response_model=ResendOtpResponse)
def resend_otp(payload: ResendOtpRequest) -> ResendOtpResponse:
    """Resends the sign-up verification code without attempting registration."""
    return auth_service.resend_signup_otp(payload)
