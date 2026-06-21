from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.rbac import RoleCode
from app.schemas.common import BaseSchema


class LoginRequest(BaseModel):
    """Username, email, or mobile plus password."""

    identifier: str = Field(min_length=1)
    password: str = Field(min_length=1)
    portal: str | None = None
    active_role: str | None = Field(default=None, alias="activeRole")

    model_config = ConfigDict(populate_by_name=True)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, alias="fullName")
    email: str | None = None
    mobile: str | None = None
    role: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class UserProfile(BaseSchema):
    id: UUID
    username: str
    full_name: str = Field(alias="fullName")
    email: str | None = None
    mobile: str | None = None
    roles: list[RoleCode]


class TokenResponse(BaseSchema):
    access_token: str = Field(alias="accessToken")
    refresh_token: str | None = Field(default=None, alias="refreshToken")
    token_type: str = Field(default="Bearer", alias="tokenType")
    expires_in: str = Field(default="8h", alias="expiresIn")
    session_id: UUID | None = Field(default=None, alias="sessionId")


class SessionInfo(BaseSchema):
    id: UUID
    ip_address: str | None = Field(default=None, alias="ipAddress")
    user_agent: str | None = Field(default=None, alias="userAgent")
    device_label: str | None = Field(default=None, alias="deviceLabel")
    is_trusted: bool = Field(default=False, alias="isTrusted")
    status: str | None = None
    created_at: datetime = Field(alias="createdAt")
    expires_at: datetime = Field(alias="expiresAt")


class LoginResponse(BaseSchema):
    access_token: str = Field(alias="accessToken")
    refresh_token: str | None = Field(default=None, alias="refreshToken")
    token_type: str = Field(default="Bearer", alias="tokenType")
    expires_in: str = Field(default="8h", alias="expiresIn")
    session_id: UUID | None = Field(default=None, alias="sessionId")
    permissions: list[str] = Field(default_factory=list)
    user: UserProfile
    active_role: str | None = Field(default=None, alias="activeRole")
    requires_role_selection: bool = Field(default=False, alias="requiresRoleSelection")


class SelectRoleRequest(BaseSchema):
    active_role: str = Field(min_length=1, alias="activeRole")


class SelectRoleResponse(BaseSchema):
    access_token: str = Field(alias="accessToken")
    token_type: str = Field(default="Bearer", alias="tokenType")
    expires_in: str = Field(default="8h", alias="expiresIn")
    active_role: str = Field(alias="activeRole")
    permissions: list[str] = Field(default_factory=list)
    user: UserProfile


class RefreshRequest(BaseSchema):
    refresh_token: str = Field(alias="refreshToken")
    active_role: str | None = Field(default=None, alias="activeRole")


class RefreshResponse(BaseSchema):
    access_token: str = Field(alias="accessToken")
    refresh_token: str | None = Field(default=None, alias="refreshToken")
    expires_in: str = Field(default="8h", alias="expiresIn")
    session_id: UUID | None = Field(default=None, alias="sessionId")
    active_role: str | None = Field(default=None, alias="activeRole")
    requires_role_selection: bool = Field(default=False, alias="requiresRoleSelection")


class LogoutRequest(BaseSchema):
    session_id: UUID | None = Field(default=None, alias="sessionId")
    refresh_token: str | None = Field(default=None, alias="refreshToken")


class LogoutResponse(BaseSchema):
    logged_out: bool = Field(alias="loggedOut")


class MeResponse(BaseSchema):
    id: UUID
    username: str | None = None
    full_name: str = Field(alias="fullName")
    email: str | None = None
    mobile: str | None = None
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    active_role: str | None = Field(default=None, alias="activeRole")
    requires_role_selection: bool = Field(default=False, alias="requiresRoleSelection")


class RevokeSessionResponse(BaseSchema):
    revoked: bool


class LoginLogInfo(BaseSchema):
    id: UUID
    user_id: UUID | None = Field(default=None, alias="userId")
    identifier_used: str | None = Field(default=None, alias="identifierUsed")
    login_method: str = Field(default="password", alias="loginMethod")
    success: bool
    failure_reason: str | None = Field(default=None, alias="failureReason")
    ip_address: str | None = Field(default=None, alias="ipAddress")
    user_agent: str | None = Field(default=None, alias="userAgent")
    session_id: UUID | None = Field(default=None, alias="sessionId")
    created_at: datetime = Field(alias="createdAt")
    username: str | None = None
    full_name: str | None = Field(default=None, alias="fullName")


class ChangePasswordRequest(BaseSchema):
    current_password: str = Field(alias="currentPassword")
    new_password: str = Field(alias="newPassword")


class ChangePasswordResponse(BaseSchema):
    updated: bool
