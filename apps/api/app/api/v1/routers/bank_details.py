from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user, request_meta
from app.core.database import get_db
from app.core.exceptions import AppError
from app.schemas.bank_details import UpsertBankDetailsInput, VerifyBankDetailsInput
from app.schemas.common import DataEnvelope
from app.services.bank_details_service import BankDetailsService

router = APIRouter(tags=["bank-details"])


def _service(db: AsyncSession = Depends(get_db)) -> BankDetailsService:
    return BankDetailsService(db)


def _require_admin(user: CurrentUser) -> None:
    if "admin" not in user.effective_roles:
        raise AppError("Requires super admin role", status_code=403, error="forbidden")


def _require_admin_or_ops(user: CurrentUser) -> None:
    if not any(role in user.effective_roles for role in ("admin", "support", "city_manager")):
        raise AppError("Requires admin or operations role", status_code=403, error="forbidden")


@router.get("/me/bank-details", response_model=DataEnvelope[dict])
async def get_my_bank_details(
    current_user: CurrentUser = Depends(get_current_user),
    service: BankDetailsService = Depends(_service),
) -> DataEnvelope[dict]:
    return DataEnvelope(data=await service.get_self(current_user.user_id))


@router.put("/me/bank-details", response_model=DataEnvelope[dict])
async def upsert_my_bank_details(
    body: UpsertBankDetailsInput,
    current_user: CurrentUser = Depends(get_current_user),
    service: BankDetailsService = Depends(_service),
    meta: dict = Depends(request_meta),
) -> DataEnvelope[dict]:
    data = await service.upsert_for_user(
        current_user.user_id,
        body.model_dump(by_alias=True),
        ip_address=meta.get("ip_address"),
        user_agent=meta.get("user_agent"),
    )
    return DataEnvelope(data=data)


@router.get("/admin/users/{user_id}/bank-details", response_model=DataEnvelope[dict])
async def admin_get_bank_details(
    user_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: BankDetailsService = Depends(_service),
    meta: dict = Depends(request_meta),
) -> DataEnvelope[dict]:
    _require_admin_or_ops(current_user)
    data = await service.get_for_user(
        user_id,
        viewer_id=current_user.user_id,
        viewer_roles=current_user.roles,
        effective_roles=current_user.effective_roles,
        ip_address=meta.get("ip_address"),
        user_agent=meta.get("user_agent"),
    )
    return DataEnvelope(data=data)


@router.post("/admin/users/{user_id}/bank-details/verify", response_model=DataEnvelope[dict])
async def admin_verify_bank_details(
    user_id: UUID,
    body: VerifyBankDetailsInput,
    current_user: CurrentUser = Depends(get_current_user),
    service: BankDetailsService = Depends(_service),
    meta: dict = Depends(request_meta),
) -> DataEnvelope[dict]:
    _require_admin(current_user)
    data = await service.verify(
        user_id,
        current_user.user_id,
        body.status,
        body.notes,
        ip_address=meta.get("ip_address"),
        user_agent=meta.get("user_agent"),
    )
    return DataEnvelope(data=data)


@router.get("/admin/bank-details", response_model=DataEnvelope[list[dict]])
async def admin_list_bank_details(
    current_user: CurrentUser = Depends(get_current_user),
    service: BankDetailsService = Depends(_service),
    status: str | None = Query(default=None),
    role: str | None = Query(default=None),
    q: str | None = Query(default=None),
) -> DataEnvelope[list[dict]]:
    _require_admin(current_user)
    data = await service.list_directory(status=status, role=role, q=q)
    return DataEnvelope(data=data)
