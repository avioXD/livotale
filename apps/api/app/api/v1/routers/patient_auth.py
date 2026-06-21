"""Legacy patient registration path used by the UI."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import request_meta
from app.core.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest
from app.schemas.common import DataEnvelope
from app.schemas.patient_portal import PatientPortalSession
from app.services.auth_service import AuthService
from app.services.patient_portal_service import PatientPortalService

router = APIRouter(tags=["patient-auth"])


def _auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)


def _portal_service(db: AsyncSession = Depends(get_db)) -> PatientPortalService:
    return PatientPortalService(db)


@router.post("/auth/patient/login", response_model=DataEnvelope[PatientPortalSession])
async def patient_password_login(
    body: LoginRequest,
    request: Request,
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PatientPortalSession]:
    meta = request_meta(request)
    data = await service.login_with_password(
        body.identifier,
        body.password,
        ip_address=meta.get("ip_address"),
        user_agent=meta.get("user_agent"),
        device_fingerprint=meta.get("device_fingerprint"),
    )
    return DataEnvelope(data=data)


@router.post("/patient/register", response_model=DataEnvelope[LoginResponse])
async def register_patient(
    body: RegisterRequest,
    request: Request,
    service: AuthService = Depends(_auth_service),
) -> DataEnvelope[LoginResponse]:
    meta = request_meta(request)
    data = await service.register(
        body.username,
        body.password,
        body.full_name,
        email=body.email,
        mobile=body.mobile,
        role_code=body.role or "patient",
        ip_address=meta["ip_address"],
        user_agent=meta["user_agent"],
        device_fingerprint=meta["device_fingerprint"],
    )
    return DataEnvelope(data=data)
