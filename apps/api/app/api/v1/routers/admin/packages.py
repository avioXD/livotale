from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.domain.rbac import is_ops_role
from app.schemas.common import DataEnvelope, MessageResponse
from app.schemas.packages import CreatePackageInput, LiverCarePackage, UpdatePackageInput
from app.services.package_service import PackageService

router = APIRouter(prefix="/admin/packages", tags=["admin-packages"])


def _service(db: AsyncSession = Depends(get_db)) -> PackageService:
    return PackageService(db)


def _require_ops(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    if not is_ops_role(user.roles):
        raise AppError("Requires operations or admin role", status_code=403, error="forbidden")
    return user


@router.get("", response_model=DataEnvelope[list[LiverCarePackage]])
async def list_packages(
    _: CurrentUser = Depends(_require_ops),
    service: PackageService = Depends(_service),
) -> DataEnvelope[list[LiverCarePackage]]:
    return DataEnvelope(data=await service.list_admin())


@router.get("/{package_id}", response_model=DataEnvelope[LiverCarePackage])
async def get_package(
    package_id: UUID,
    _: CurrentUser = Depends(_require_ops),
    service: PackageService = Depends(_service),
) -> DataEnvelope[LiverCarePackage]:
    return DataEnvelope(data=await service.get_by_id(package_id))


@router.post("", response_model=DataEnvelope[LiverCarePackage])
async def create_package(
    body: CreatePackageInput,
    user: CurrentUser = Depends(_require_ops),
    service: PackageService = Depends(_service),
) -> DataEnvelope[LiverCarePackage]:
    return DataEnvelope(data=await service.create(body, actor_id=user.user_id))


@router.patch("/{package_id}", response_model=DataEnvelope[LiverCarePackage])
async def update_package(
    package_id: UUID,
    body: UpdatePackageInput,
    user: CurrentUser = Depends(_require_ops),
    service: PackageService = Depends(_service),
) -> DataEnvelope[LiverCarePackage]:
    return DataEnvelope(data=await service.update(package_id, body, actor_id=user.user_id))


@router.delete("/{package_id}", response_model=DataEnvelope[MessageResponse])
async def delete_package(
    package_id: UUID,
    _: CurrentUser = Depends(_require_ops),
    service: PackageService = Depends(_service),
) -> DataEnvelope[MessageResponse]:
    await service.delete(package_id)
    return DataEnvelope(data=MessageResponse(message="Package deleted"))
