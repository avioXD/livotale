from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.domain.rbac import is_ops_role
from app.schemas.common import DataEnvelope
from app.schemas.integrations_platform import SendPaymentLinkInput
from app.schemas.orders import (
    AssignDoctorInput,
    AssignTechnicianInput,
    ConfirmConsultationScheduleInput,
    ConfirmScanScheduleInput,
    CreateOrderInput,
    LiverCareOrder,
    OfflinePaymentInput,
    OfflinePaymentRecord,
    OrderTimelineEvent,
    OrderTransitionInput,
    ConsultTimeSlotOption,
    ScanTimeSlotOption,
    ScheduleConsultationInput,
    ScheduleScanInput,
)
from app.schemas.technician import (
    OperatorVerifyIntakeInput,
    OpsScanReviewInput,
    ScanPatientIntake,
    ScanPatientIntakeInput,
)
from app.services.order_service import OrderService
from app.services.patient_portal_service import PatientPortalService
from app.services.slot_availability_service import SlotAvailabilityService
from app.services.technician_order_service import TechnicianOrderService

router = APIRouter(prefix="/admin/orders", tags=["admin-orders"])


def _service(db: AsyncSession = Depends(get_db)) -> OrderService:
    return OrderService(db)


def _require_ops(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    if not is_ops_role(user.roles):
        raise AppError("Requires operations or admin role", status_code=403, error="forbidden")
    return user


def _technician_service(db: AsyncSession = Depends(get_db)) -> TechnicianOrderService:
    return TechnicianOrderService(db)


def _portal_service(db: AsyncSession = Depends(get_db)) -> PatientPortalService:
    return PatientPortalService(db)


@router.get("", response_model=DataEnvelope[list[LiverCareOrder]])
async def list_orders(
    payment_status: str | None = Query(default=None, alias="paymentStatus"),
    order_status: str | None = Query(default=None, alias="orderStatus"),
    created_by: UUID | None = Query(default=None, alias="createdBy"),
    created_by_role: str | None = Query(default=None, alias="createdByRole"),
    assigned_to: str | None = Query(default=None, alias="assignedTo"),
    search: str | None = Query(default=None),
    _: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[list[LiverCareOrder]]:
    data = await service.list_orders(
        payment_status=payment_status,
        order_status=order_status,
        created_by=created_by,
        created_by_role=created_by_role,
        assigned_to=assigned_to,
        search=search,
    )
    return DataEnvelope(data=data)


@router.get("/{order_id}", response_model=DataEnvelope[LiverCareOrder])
async def get_order(
    order_id: UUID,
    _: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[LiverCareOrder]:
    return DataEnvelope(data=await service.get_by_id(order_id))


@router.post("", response_model=DataEnvelope[LiverCareOrder])
async def create_order(
    body: CreateOrderInput,
    user: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[LiverCareOrder]:
    return DataEnvelope(data=await service.create(body, actor_id=user.user_id))


@router.post("/{order_id}/transition", response_model=DataEnvelope[LiverCareOrder])
async def transition_order(
    order_id: UUID,
    body: OrderTransitionInput,
    user: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[LiverCareOrder]:
    data = await service.transition(order_id, body, actor_id=user.user_id)
    data.pop("_transition", None)
    return DataEnvelope(data=data)


@router.post("/{order_id}/send-payment-link", response_model=DataEnvelope[LiverCareOrder])
async def send_payment_link(
    order_id: UUID,
    body: SendPaymentLinkInput,
    user: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[LiverCareOrder]:
    data = await service.send_payment_link(order_id, channels=body.channels, actor_id=user.user_id)
    data.pop("_transition", None)
    return DataEnvelope(data=data)


@router.get("/{order_id}/timeline", response_model=DataEnvelope[list[OrderTimelineEvent]])
async def get_order_timeline(
    order_id: UUID,
    _: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[list[OrderTimelineEvent]]:
    return DataEnvelope(data=await service.get_timeline(order_id))


@router.get("/{order_id}/workflow-events", response_model=DataEnvelope[list[str]])
async def get_workflow_events(
    order_id: UUID,
    _: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[list[str]]:
    return DataEnvelope(data=await service.get_workflow_events(order_id))


@router.post("/{order_id}/assign-technician", response_model=DataEnvelope[LiverCareOrder])
async def assign_technician(
    order_id: UUID,
    body: AssignTechnicianInput,
    user: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[LiverCareOrder]:
    return DataEnvelope(data=await service.assign_technician(order_id, body, actor_id=user.user_id))


@router.post("/{order_id}/assign-doctor", response_model=DataEnvelope[LiverCareOrder])
async def assign_doctor(
    order_id: UUID,
    body: AssignDoctorInput,
    user: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[LiverCareOrder]:
    return DataEnvelope(data=await service.assign_doctor(order_id, body, actor_id=user.user_id))


@router.post("/{order_id}/schedule-scan", response_model=DataEnvelope[LiverCareOrder])
async def schedule_scan(
    order_id: UUID,
    body: ScheduleScanInput,
    user: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[LiverCareOrder]:
    return DataEnvelope(data=await service.schedule_scan(order_id, body, actor_id=user.user_id))


@router.get("/{order_id}/scan-slots", response_model=DataEnvelope[list[ScanTimeSlotOption]])
async def get_order_scan_slots(
    order_id: UUID,
    date: str = Query(..., description="YYYY-MM-DD"),
    _: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[list[ScanTimeSlotOption]]:
    rows = await service.get_scan_slots_for_order(order_id, date)
    return DataEnvelope(data=rows)


@router.post("/{order_id}/confirm-scan-schedule", response_model=DataEnvelope[LiverCareOrder])
async def confirm_scan_schedule(
    order_id: UUID,
    body: ConfirmScanScheduleInput,
    user: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[LiverCareOrder]:
    return DataEnvelope(data=await service.confirm_scan_schedule(order_id, body, actor_id=user.user_id))


@router.get("/{order_id}/consult-slots", response_model=DataEnvelope[list[ConsultTimeSlotOption]])
async def get_order_consult_slots(
    order_id: UUID,
    date: str = Query(..., description="YYYY-MM-DD"),
    _: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[list[ConsultTimeSlotOption]]:
    rows = await service.get_consult_slots_for_order(order_id, date)
    return DataEnvelope(data=rows)


@router.post("/{order_id}/confirm-consultation-schedule", response_model=DataEnvelope[LiverCareOrder])
async def confirm_consultation_schedule(
    order_id: UUID,
    body: ConfirmConsultationScheduleInput,
    user: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[LiverCareOrder]:
    return DataEnvelope(data=await service.confirm_consultation_schedule(order_id, body, actor_id=user.user_id))


@router.post("/{order_id}/schedule-consultation", response_model=DataEnvelope[LiverCareOrder])
async def schedule_consultation(
    order_id: UUID,
    body: ScheduleConsultationInput,
    user: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[LiverCareOrder]:
    return DataEnvelope(data=await service.schedule_consultation(order_id, body, actor_id=user.user_id))


@router.post("/{order_id}/offline-payment", response_model=DataEnvelope[LiverCareOrder])
async def mark_offline_payment(
    order_id: UUID,
    body: OfflinePaymentInput,
    user: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[LiverCareOrder]:
    payload = body.model_copy(update={"collected_by": body.collected_by or user.full_name})
    return DataEnvelope(data=await service.mark_offline_payment(order_id, payload, actor_id=user.user_id))


@router.get("/{order_id}/offline-payments", response_model=DataEnvelope[list[OfflinePaymentRecord]])
async def list_offline_payments(
    order_id: UUID,
    _: CurrentUser = Depends(_require_ops),
    service: OrderService = Depends(_service),
) -> DataEnvelope[list[OfflinePaymentRecord]]:
    return DataEnvelope(data=await service.list_offline_payments(order_id))


@router.put("/{order_id}/patient-intake", response_model=DataEnvelope[ScanPatientIntake])
async def save_patient_intake(
    order_id: UUID,
    body: ScanPatientIntakeInput,
    user: CurrentUser = Depends(_require_ops),
    service: TechnicianOrderService = Depends(_technician_service),
) -> DataEnvelope[ScanPatientIntake]:
    data = await service.save_operator_intake(order_id, user.user_id, body)
    return DataEnvelope(data=data)


@router.patch("/{order_id}/patient-intake/verify", response_model=DataEnvelope[ScanPatientIntake])
async def verify_patient_intake_ops(
    order_id: UUID,
    body: OperatorVerifyIntakeInput,
    user: CurrentUser = Depends(_require_ops),
    service: TechnicianOrderService = Depends(_technician_service),
) -> DataEnvelope[ScanPatientIntake]:
    data = await service.operator_verify_intake(order_id, user.user_id, body.status, body.notes)
    return DataEnvelope(data=data)


@router.patch("/{order_id}/fibroscan-intake/verify", response_model=DataEnvelope[ScanPatientIntake])
async def verify_fibroscan_intake_ops(
    order_id: UUID,
    body: OperatorVerifyIntakeInput,
    user: CurrentUser = Depends(_require_ops),
    service: TechnicianOrderService = Depends(_technician_service),
) -> DataEnvelope[ScanPatientIntake]:
    data = await service.operator_verify_fibroscan_intake(order_id, user.user_id, body.status, body.notes)
    return DataEnvelope(data=data)


@router.patch("/{order_id}/fibrosis-scan", response_model=DataEnvelope[dict])
async def review_fibrosis_scan_ops(
    order_id: UUID,
    body: OpsScanReviewInput,
    user: CurrentUser = Depends(_require_ops),
    service: TechnicianOrderService = Depends(_technician_service),
) -> DataEnvelope[dict]:
    data = await service.ops_review_scan(order_id, user.user_id, body.model_dump(by_alias=True, exclude_none=True))
    return DataEnvelope(data=data)


@router.get("/{order_id}/invoice", response_model=DataEnvelope[dict | None])
async def get_order_invoice(
    order_id: UUID,
    _: CurrentUser = Depends(_require_ops),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[dict | None]:
    return DataEnvelope(data=await service.get_invoice(order_id, phone=None))
