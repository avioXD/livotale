from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.schemas.common import DataEnvelope
from app.schemas.patients import PatientClinicalContext, PatientDetail, PaginatedPatients
from app.services.patient_registry_service import PatientRegistryService

router = APIRouter(prefix="/patients", tags=["patients"])


def _service(db: AsyncSession = Depends(get_db)) -> PatientRegistryService:
    return PatientRegistryService(db)


@router.get("", response_model=DataEnvelope[PaginatedPatients])
async def list_patients(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50, alias="pageSize"),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    assigned_doctor: str | None = Query(default=None, alias="assignedDoctor"),
    user: CurrentUser = Depends(get_current_user),
    service: PatientRegistryService = Depends(_service),
) -> DataEnvelope[PaginatedPatients]:
    data = await service.list_patients(
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        assigned_doctor=assigned_doctor,
        user_id=user.user_id,
        roles=user.roles,
    )
    return DataEnvelope(data=data)


@router.get("/{patient_id}", response_model=DataEnvelope[PatientDetail])
async def get_patient(
    patient_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    service: PatientRegistryService = Depends(_service),
) -> DataEnvelope[PatientDetail]:
    return DataEnvelope(data=await service.get_detail(patient_id, user_id=user.user_id, roles=user.roles))


@router.get("/{patient_id}/history", response_model=DataEnvelope[dict[str, Any]])
async def get_patient_history(
    patient_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    service: PatientRegistryService = Depends(_service),
) -> DataEnvelope[dict[str, Any]]:
    return DataEnvelope(data=await service.get_history(patient_id, user_id=user.user_id, roles=user.roles))


@router.patch("/{patient_id}/demographics", response_model=DataEnvelope[PatientDetail])
async def update_demographics(
    patient_id: UUID,
    body: dict[str, Any],
    user: CurrentUser = Depends(get_current_user),
    service: PatientRegistryService = Depends(_service),
) -> DataEnvelope[PatientDetail]:
    return DataEnvelope(
        data=await service.update_demographics(
            patient_id, body, user_id=user.user_id, roles=user.roles
        )
    )


@router.patch("/{patient_id}/history/{section}", response_model=DataEnvelope[dict[str, Any]])
async def update_history_section(
    patient_id: UUID,
    section: str,
    body: dict[str, Any],
    user: CurrentUser = Depends(get_current_user),
    service: PatientRegistryService = Depends(_service),
) -> DataEnvelope[dict[str, Any]]:
    return DataEnvelope(
        data=await service.update_history_section(
            patient_id, section, body, user_id=user.user_id, roles=user.roles
        )
    )


@router.get("/{patient_id}/clinical", response_model=DataEnvelope[PatientClinicalContext])
async def get_clinical_context(
    patient_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    service: PatientRegistryService = Depends(_service),
) -> DataEnvelope[PatientClinicalContext]:
    return DataEnvelope(
        data=await service.get_clinical_context(patient_id, user_id=user.user_id, roles=user.roles)
    )
