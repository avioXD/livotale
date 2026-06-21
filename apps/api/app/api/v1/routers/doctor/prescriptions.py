from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.core.deps import require_roles
from app.domain.rbac import RoleCode
from app.schemas.clinical import LiverCarePrescription, PrescriptionInput
from app.schemas.common import DataEnvelope
from app.services.order_helpers import resolve_doctor_id
from app.services.prescription_service import PrescriptionService

router = APIRouter(prefix="/doctor/orders", tags=["doctor-prescriptions"])


def _service(db: AsyncSession = Depends(get_db)) -> PrescriptionService:
    return PrescriptionService(db)


@router.get("/{order_id}/org/prescriptions", response_model=DataEnvelope[list[LiverCarePrescription]])
async def list_prescriptions(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: PrescriptionService = Depends(_service),
) -> DataEnvelope[list[LiverCarePrescription]]:
    return DataEnvelope(data=await service.list_for_order(order_id))


@router.get("/{order_id}/prescription", response_model=DataEnvelope[LiverCarePrescription | None])
async def get_latest_prescription(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: PrescriptionService = Depends(_service),
) -> DataEnvelope[LiverCarePrescription | None]:
    return DataEnvelope(data=await service.get_latest_for_order(order_id))


@router.get("/{order_id}/org/prescriptions/{visit_log_id}", response_model=DataEnvelope[LiverCarePrescription | None])
async def get_prescription_for_visit(
    order_id: UUID,
    visit_log_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: PrescriptionService = Depends(_service),
) -> DataEnvelope[LiverCarePrescription | None]:
    return DataEnvelope(data=await service.get_for_visit(order_id, visit_log_id))


@router.put("/{order_id}/org/prescriptions/{visit_log_id}", response_model=DataEnvelope[LiverCarePrescription])
async def save_prescription_draft(
    order_id: UUID,
    visit_log_id: UUID,
    body: PrescriptionInput,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: PrescriptionService = Depends(_service),
) -> DataEnvelope[LiverCarePrescription]:
    doctor_id = await resolve_doctor_id(service.db, current_user.user_id)
    data = await service.save_draft(
        order_id,
        visit_log_id,
        doctor_id,
        body.model_dump(by_alias=True),
        current_user.effective_roles,
    )
    return DataEnvelope(data=data)


@router.post("/{order_id}/org/prescriptions/{visit_log_id}/publish", response_model=DataEnvelope[LiverCarePrescription])
async def publish_prescription(
    order_id: UUID,
    visit_log_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: PrescriptionService = Depends(_service),
) -> DataEnvelope[LiverCarePrescription]:
    doctor_id = await resolve_doctor_id(service.db, current_user.user_id)
    data = await service.publish(
        order_id,
        visit_log_id,
        doctor_id,
        current_user.user_id,
        current_user.effective_roles,
    )
    return DataEnvelope(data=data)


@router.post("/{order_id}/org/prescriptions/{visit_log_id}/revise", response_model=DataEnvelope[LiverCarePrescription])
async def revise_prescription(
    order_id: UUID,
    visit_log_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: PrescriptionService = Depends(_service),
) -> DataEnvelope[LiverCarePrescription]:
    doctor_id = await resolve_doctor_id(service.db, current_user.user_id)
    data = await service.create_revision(order_id, visit_log_id, doctor_id, current_user.effective_roles)
    return DataEnvelope(data=data)
