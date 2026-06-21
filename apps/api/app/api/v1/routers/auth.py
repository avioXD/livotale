from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user, request_meta
from app.core.database import get_db
from app.core.exceptions import AppError
from app.schemas.auth import (
    ChangePasswordRequest,
    ChangePasswordResponse,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    LogoutResponse,
    MeResponse,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    RevokeSessionResponse,
    SelectRoleRequest,
    SelectRoleResponse,
    SessionInfo,
)
from app.schemas.common import DataEnvelope
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post("/login", response_model=DataEnvelope[LoginResponse])
async def login(
    body: LoginRequest,
    request: Request,
    service: AuthService = Depends(_auth_service),
) -> DataEnvelope[LoginResponse]:
    identifier = body.identifier or body.username or ""
    meta = request_meta(request)
    data = await service.login(
        identifier,
        body.password,
        portal_code=body.portal,
        active_role=body.active_role,
        ip_address=meta["ip_address"],
        user_agent=meta["user_agent"],
        device_fingerprint=meta["device_fingerprint"],
    )
    return DataEnvelope(data=data)


@router.post("/register", response_model=DataEnvelope[LoginResponse])
async def register(
    body: RegisterRequest,
    request: Request,
    service: AuthService = Depends(_auth_service),
) -> DataEnvelope[LoginResponse]:
    meta = request_meta(request)
    role_code = body.role or "patient"
    if role_code != "patient":
        raise AppError(
            "Public registration is limited to patient accounts",
            status_code=403,
            error="forbidden",
        )
    data = await service.register(
        body.username,
        body.password,
        body.full_name,
        email=body.email,
        mobile=body.mobile,
        role_code=role_code,
        ip_address=meta["ip_address"],
        user_agent=meta["user_agent"],
        device_fingerprint=meta["device_fingerprint"],
    )
    return DataEnvelope(data=data)


@router.get("/me", response_model=DataEnvelope[MeResponse])
async def me(
    current_user: CurrentUser = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
) -> DataEnvelope[MeResponse]:
    data = await service.get_me(current_user.user_id, active_role=current_user.active_role)
    return DataEnvelope(data=data)


@router.post("/select-role", response_model=DataEnvelope[SelectRoleResponse])
async def select_role(
    body: SelectRoleRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
) -> DataEnvelope[SelectRoleResponse]:
    data = await service.select_role(current_user.user_id, body.active_role)
    return DataEnvelope(data=data)


@router.post("/refresh", response_model=DataEnvelope[RefreshResponse])
async def refresh(
    body: RefreshRequest,
    request: Request,
    service: AuthService = Depends(_auth_service),
) -> DataEnvelope[RefreshResponse]:
    meta = request_meta(request)
    data = await service.refresh_token(
        body.refresh_token,
        active_role=body.active_role,
        ip_address=meta["ip_address"],
        user_agent=meta["user_agent"],
        device_fingerprint=meta["device_fingerprint"],
    )
    return DataEnvelope(data=data)


@router.post("/logout", response_model=DataEnvelope[LogoutResponse])
async def logout(
    body: LogoutRequest,
    request: Request,
    service: AuthService = Depends(_auth_service),
) -> DataEnvelope[LogoutResponse]:
    meta = request_meta(request)
    if body.session_id:
        data = await service.logout(
            body.session_id,
            ip_address=meta["ip_address"],
            user_agent=meta["user_agent"],
        )
    elif body.refresh_token:
        data = await service.logout_by_refresh_token(
            body.refresh_token,
            ip_address=meta["ip_address"],
            user_agent=meta["user_agent"],
        )
    else:
        from app.core.exceptions import AppError

        raise AppError("sessionId or refreshToken is required")
    return DataEnvelope(data=data)


@router.get("/sessions", response_model=DataEnvelope[list[SessionInfo]])
async def list_sessions(
    current_user: CurrentUser = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
) -> DataEnvelope[list[SessionInfo]]:
    data = await service.list_sessions(current_user.user_id)
    return DataEnvelope(data=data)


@router.delete("/sessions/{session_id}", response_model=DataEnvelope[RevokeSessionResponse])
async def revoke_session(
    session_id: UUID,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
) -> DataEnvelope[RevokeSessionResponse]:
    meta = request_meta(request)
    data = await service.revoke_session(
        current_user.user_id,
        session_id,
        ip_address=meta["ip_address"],
        user_agent=meta["user_agent"],
    )
    return DataEnvelope(data=data)


@router.post("/password/change", response_model=DataEnvelope[ChangePasswordResponse])
async def change_password(
    body: ChangePasswordRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
) -> DataEnvelope[ChangePasswordResponse]:
    meta = request_meta(request)
    data = await service.change_password(
        current_user.user_id,
        body.current_password,
        body.new_password,
        ip_address=meta["ip_address"],
        user_agent=meta["user_agent"],
    )
    return DataEnvelope(data=data)
