from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.core.deps import require_roles
from app.core.exceptions import AppError
from app.domain.rbac import RoleCode
from app.schemas.clinical import (
    CompleteConsultationRequest,
    Consultation,
    ConsultationVisitLog,
    DoctorAssignedPatient,
    DoctorClinicalBundle,
    DoctorConsultationContext,
    FollowUpVisitRequest,
    ScheduleConsultationRequest,
    UpdateConsultationRequest,
    UpdateVisitLogRequest,
)
from app.schemas.common import DataEnvelope
from app.schemas.technician import TechnicianOrder
from app.services.consultation_service import ConsultationService
from app.services.order_helpers import resolve_doctor_id

router = APIRouter(prefix="/doctor/consultations", tags=["doctor-consultations"])


def _service(db: AsyncSession = Depends(get_db)) -> ConsultationService:
    return ConsultationService(db)


async def _resolve_doctor_id(
    service: ConsultationService,
    current_user: CurrentUser,
    doctor_id: UUID | None,
) -> UUID:
    if doctor_id:
        return doctor_id
    return await resolve_doctor_id(service.db, current_user.user_id)


async def _resolve_doctor_id_for_read(
    service: ConsultationService,
    current_user: CurrentUser,
    doctor_id: UUID | None,
) -> UUID | None:
    if doctor_id:
        return doctor_id
    if RoleCode.ADMIN.value in current_user.roles or RoleCode.SUPPORT.value in current_user.roles:
        return None
    return await resolve_doctor_id(service.db, current_user.user_id)


@router.get("/orders", response_model=DataEnvelope[list[TechnicianOrder]])
async def list_assigned_orders(
    doctor_id: UUID | None = Query(default=None, alias="doctorId"),
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[list[TechnicianOrder]]:
    target = await _resolve_doctor_id(service, current_user, doctor_id)
    data = await service.list_assigned_orders(target)
    return DataEnvelope(data=data)


@router.get("/patients", response_model=DataEnvelope[list[DoctorAssignedPatient]])
async def list_assigned_patients(
    doctor_id: UUID | None = Query(default=None, alias="doctorId"),
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[list[DoctorAssignedPatient]]:
    target = await _resolve_doctor_id(service, current_user, doctor_id)
    data = await service.list_assigned_patients(target)
    return DataEnvelope(data=data)


@router.get("/{order_id}/context", response_model=DataEnvelope[DoctorConsultationContext])
async def get_consultation_context(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[DoctorConsultationContext]:
    doctor_id = await _resolve_doctor_id_for_read(service, current_user, None)
    data = await service.get_context(order_id, doctor_id, current_user.roles)
    return DataEnvelope(data=data)


@router.get("/{order_id}/order", response_model=DataEnvelope[dict])
async def get_assigned_order(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[dict]:
    doctor_id = await _resolve_doctor_id_for_read(service, current_user, None)
    data = await service.get_order_for_doctor(order_id, doctor_id, current_user.roles)
    return DataEnvelope(data=data)


@router.get("/{order_id}/clinical", response_model=DataEnvelope[DoctorClinicalBundle])
async def get_clinical_bundle(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[DoctorClinicalBundle]:
    doctor_id = await _resolve_doctor_id_for_read(service, current_user, None)
    data = await service.get_clinical_for_doctor(order_id, doctor_id, current_user.roles)
    return DataEnvelope(data=data)


@router.post("/{order_id}/ensure", response_model=DataEnvelope[Consultation])
async def ensure_consultation(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[Consultation]:
    doctor_id = await resolve_doctor_id(service.db, current_user.user_id)
    data = await service.ensure_for_doctor(order_id, doctor_id, current_user.roles)
    return DataEnvelope(data=data)


@router.get("/{order_id}", response_model=DataEnvelope[Consultation | None])
async def get_consultation(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[Consultation | None]:
    return DataEnvelope(data=await service.get_consultation(order_id))


@router.patch("/{order_id}", response_model=DataEnvelope[Consultation])
async def update_consultation(
    order_id: UUID,
    body: UpdateConsultationRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[Consultation]:
    doctor_id = await resolve_doctor_id(service.db, current_user.user_id)
    data = await service.update_consultation(
        order_id,
        doctor_id,
        current_user.roles,
        doctor_notes=body.doctor_notes,
        symptoms=body.symptoms,
        follow_up_at=body.follow_up_at,
    )
    return DataEnvelope(data=data)


@router.post("/{order_id}/schedule", response_model=DataEnvelope[Consultation])
async def schedule_consultation(
    order_id: UUID,
    body: ScheduleConsultationRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[Consultation]:
    _ = (order_id, body, current_user, service)
    raise AppError(
        "Doctors cannot schedule consultations; operations will assign a time slot.",
        status_code=403,
        error="doctor_cannot_schedule",
    )


@router.post("/{order_id}/start", response_model=DataEnvelope[Consultation])
async def start_consultation(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[Consultation]:
    doctor_id = await resolve_doctor_id(service.db, current_user.user_id)
    data = await service.start(order_id, doctor_id, current_user.roles)
    return DataEnvelope(data=data)


@router.post("/{order_id}/complete", response_model=DataEnvelope[Consultation])
async def complete_consultation(
    order_id: UUID,
    body: CompleteConsultationRequest | None = None,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[Consultation]:
    payload = body or CompleteConsultationRequest()
    doctor_id = await resolve_doctor_id(service.db, current_user.user_id)
    data = await service.complete(
        order_id,
        doctor_id,
        current_user.roles,
        current_user.user_id,
        doctor_notes=payload.doctor_notes,
        symptoms=payload.symptoms,
        visit_completed_at=payload.visit_completed_at,
        follow_up_at=payload.follow_up_at,
    )
    return DataEnvelope(data=data)


@router.get("/{order_id}/visits", response_model=DataEnvelope[list[ConsultationVisitLog]])
async def list_visit_logs(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[list[ConsultationVisitLog]]:
    return DataEnvelope(data=await service.list_visit_logs(order_id))


@router.post("/{order_id}/visits/ensure-initial", response_model=DataEnvelope[ConsultationVisitLog])
async def ensure_initial_visit_log(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[ConsultationVisitLog]:
    return DataEnvelope(data=await service.ensure_initial_visit_log(order_id))


@router.patch("/{order_id}/visits/{visit_log_id}", response_model=DataEnvelope[ConsultationVisitLog])
async def update_visit_log(
    order_id: UUID,
    visit_log_id: UUID,
    body: UpdateVisitLogRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[ConsultationVisitLog]:
    doctor_id = await resolve_doctor_id(service.db, current_user.user_id)
    data = await service.update_visit_log(
        order_id,
        visit_log_id,
        doctor_id,
        current_user.roles,
        doctor_notes=body.doctor_notes,
        symptoms=body.symptoms,
        scheduled_at=body.scheduled_at,
        follow_up_at=body.follow_up_at,
    )
    return DataEnvelope(data=data)


@router.post("/{order_id}/visits/{visit_log_id}/complete", response_model=DataEnvelope[ConsultationVisitLog])
async def complete_visit_log(
    order_id: UUID,
    visit_log_id: UUID,
    body: CompleteConsultationRequest | None = None,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[ConsultationVisitLog]:
    payload = body or CompleteConsultationRequest()
    doctor_id = await resolve_doctor_id(service.db, current_user.user_id)
    data = await service.complete_visit_log(
        order_id,
        visit_log_id,
        doctor_id,
        current_user.roles,
        current_user.user_id,
        doctor_notes=payload.doctor_notes,
        symptoms=payload.symptoms,
        visit_completed_at=payload.visit_completed_at,
        follow_up_at=payload.follow_up_at,
    )
    return DataEnvelope(data=data)


@router.post("/{order_id}/visits/follow-up", response_model=DataEnvelope[ConsultationVisitLog])
async def create_follow_up_visit(
    order_id: UUID,
    body: FollowUpVisitRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[ConsultationVisitLog]:
    doctor_id = await resolve_doctor_id(service.db, current_user.user_id)
    data = await service.create_follow_up_visit(
        order_id,
        doctor_id,
        current_user.roles,
        current_user.user_id,
        body.scheduled_at,
        body.follow_up_at,
    )
    return DataEnvelope(data=data)


@router.get("/{order_id}/tele-join", response_model=DataEnvelope[dict])
async def get_tele_join_link(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[dict]:
    consultation = await service.get_consultation(order_id)
    if consultation is None:
        from app.core.exceptions import AppError

        raise AppError("Consultation not scheduled for this order", status_code=404, error="not_found")
    return DataEnvelope(
        data={
            "orderId": str(order_id),
            "meetingLink": consultation.get("meetingLink"),
            "scheduledAt": consultation.get("scheduledAt"),
            "status": consultation.get("status"),
            "consultationType": consultation.get("consultationType"),
        }
    )
