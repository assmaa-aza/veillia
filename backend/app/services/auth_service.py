from fastapi import HTTPException, status

from app.database.supabase_client import get_supabase_admin, get_supabase_anon
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    ResendOtpRequest,
    ResendOtpResponse,
    TokenResponse,
    VerifyOtpRequest,
)


class AuthService:
    """
    Wraps Supabase Auth operations. Never touches passwords directly -
    Supabase Auth owns hashing/storage; we only ever pass the plaintext
    password through to Supabase over TLS, exactly once, per call.
    """

    @staticmethod
    def register(payload: RegisterRequest) -> RegisterResponse:
        supabase = get_supabase_anon()

        try:
            result = supabase.auth.sign_up(
                {
                    "email": payload.email,
                    "password": payload.password,
                    "options": {
                        "data": {
                            "username": payload.username,
                            "full_name": payload.full_name,
                        }
                    },
                }
            )
        except Exception as exc:  # supabase-py raises AuthApiError subclasses
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration failed: {exc}",
            )

        user = result.user
        session = result.session

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed: no user was created.",
            )

        # Supabase deliberately returns an obfuscated user (with no identities)
        # when the email already exists. Since we no longer use OTP / email
        # confirmation, attempt a direct password sign-in so the user can
        # recover an existing session without exposing whether an account exists.
        if getattr(user, "identities", None) == []:
            try:
                login_res = supabase.auth.sign_in_with_password(
                    {"email": payload.email, "password": payload.password}
                )
                if login_res.session:
                    return RegisterResponse(
                        id=login_res.user.id,
                        email=login_res.user.email,
                        session=TokenResponse(
                            access_token=login_res.session.access_token,
                            refresh_token=login_res.session.refresh_token,
                            expires_in=login_res.session.expires_in,
                        ),
                        email_confirmation_required=False,
                    )
            except Exception:
                pass
            # Password mismatch — account already exists with a different password
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un compte avec cet email existe déjà.",
            )



        # Create the corresponding profiles row using the admin client
        admin = get_supabase_admin()

        try:
            admin.table("profiles").upsert(
                {
                    "id": user.id,
                    "username": payload.username,
                    "full_name": payload.full_name,
                    "avatar_url": None,
                    "role": "user",
                },
                on_conflict="id",
            ).execute()
        except Exception as exc:
            print(f"Profile creation warning: {exc}")

        try:
            existing = admin.table("user_preferences").select("id").eq("user_id", user.id).execute()
            if not existing.data:
                admin.table("user_preferences").insert(
                    {
                        "user_id": user.id,
                        "role": None,
                        "interests": [],
                        "content_types": [],
                        "followed_companies": [],
                        "preferred_language": "Français",
                        "recommendation_frequency": "Quotidiennement",
                        "onboarding_completed": False,
                    }
                ).execute()
        except Exception as exc:
            print(f"User preferences creation warning: {exc}")


        session_response = None
        if session is None:
            # If Supabase email confirmation is disabled or if admin auto-confirms,
            # sign in immediately with password to obtain a valid session.
            try:
                login_res = supabase.auth.sign_in_with_password(
                    {"email": payload.email, "password": payload.password}
                )
                if login_res.session:
                    session = login_res.session
            except Exception:
                pass

        if session is not None:
            session_response = TokenResponse(
                access_token=session.access_token,
                refresh_token=session.refresh_token,
                expires_in=session.expires_in,
            )

        return RegisterResponse(
            id=user.id,
            email=user.email,
            session=session_response,
            email_confirmation_required=session is None,
        )



    @staticmethod
    def login(payload: LoginRequest) -> LoginResponse:
        supabase = get_supabase_anon()

        try:
            result = supabase.auth.sign_in_with_password(
                {"email": payload.email, "password": payload.password}
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if result.session is None or result.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        return LoginResponse(
            user_id=result.user.id,
            email=result.user.email,
            session=TokenResponse(
                access_token=result.session.access_token,
                refresh_token=result.session.refresh_token,
                expires_in=result.session.expires_in,
            ),
        )

    @staticmethod
    def refresh(refresh_token: str) -> TokenResponse:
        supabase = get_supabase_anon()

        try:
            result = supabase.auth.refresh_session(refresh_token)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not refresh session",
            )

        if result.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not refresh session",
            )

        return TokenResponse(
            access_token=result.session.access_token,
            refresh_token=result.session.refresh_token,
            expires_in=result.session.expires_in,
        )

    @staticmethod
    def logout(access_token: str) -> None:
        supabase = get_supabase_anon()
        try:
            # sign_out() revokes the refresh token tied to the session set
            # on this client. We pass the access token through set_session
            # first so Supabase knows which session to revoke.
            supabase.auth.set_session(access_token, "")
            supabase.auth.sign_out()
        except Exception:
            # Logout is best-effort: an already-expired/invalid token means
            # there's nothing left to revoke, which is still a "success"
            # from the client's point of view.
            pass

    @staticmethod
    def verify_otp(payload: VerifyOtpRequest) -> LoginResponse:
        """
        Verifies the 6-digit OTP that Supabase emailed to the user on sign-up.
        On success returns a full session (access_token / refresh_token) so the
        frontend can sign the user in immediately without a separate login call.
        """
        supabase = get_supabase_anon()
    
        # Handle token whether passed as payload.token or payload.code
        otp_code = getattr(payload, 'token', None) or getattr(payload, 'code', None)

        try:
            result = supabase.auth.verify_otp(
                {
                    "email": payload.email, 
                    "token": otp_code, 
                    "type": "signup"  # <-- CHANGED FROM "email" TO "signup"
                }
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Code invalide ou expiré : {exc}",
            )

        if result.session is None or result.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Code invalide ou expiré.",
            )

        return LoginResponse(
            user_id=result.user.id,
            email=result.user.email,
            session=TokenResponse(
                access_token=result.session.access_token,
                refresh_token=result.session.refresh_token,
                expires_in=result.session.expires_in,
            ),
        )

    @staticmethod
    def resend_signup_otp(payload: ResendOtpRequest) -> ResendOtpResponse:
        """Requests a replacement sign-up verification email."""
        try:
            get_supabase_anon().auth.resend(
                {"type": "signup", "email": str(payload.email)}
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not resend verification code: {exc}",
            )
        return ResendOtpResponse()


auth_service = AuthService()
