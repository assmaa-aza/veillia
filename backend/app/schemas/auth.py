from typing import Optional

from pydantic import BaseModel, EmailStr, Field , AliasChoices
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="At least 8 characters")
    username: str = Field(min_length=3, max_length=50)
    full_name: Optional[str] = Field(default=None, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str




class VerifyOtpRequest(BaseModel):
    email: str
    # Accepts either 'token' or 'code' from the frontend JSON payload
    token: str = Field(validation_alias=AliasChoices('token', 'code'))


class ResendOtpRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: Optional[int] = None


class RegisterResponse(BaseModel):
    id: str
    email: Optional[EmailStr] = None
    # `session` is None when Supabase requires email confirmation before
    # issuing a usable session.
    session: Optional[TokenResponse] = None
    email_confirmation_required: bool = False


class LoginResponse(BaseModel):
    user_id: str
    email: Optional[EmailStr] = None
    session: TokenResponse


class LogoutResponse(BaseModel):
    success: bool = True
    detail: str = "Logged out successfully"


class ResendOtpResponse(BaseModel):
    success: bool = True
