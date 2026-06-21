from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import request_meta
from app.core.database import get_db
from app.schemas.common import DataEnvelope
from app.schemas.patient_portal import (
    OtpSendRequest,
    OtpSendResponse,
    OtpVerifyRequest,
    PatientDownloadItem,
    PatientNotification,
    PatientOnboardingCompleteRequest,
    PatientOnboardingStatus,
    PatientOrder,
    PatientPathologyDateRequest,
    PatientPortalSession,
    PatientProfile,
    PatientProfileUpdate,
    PatientEnquiry,
    PatientPayRequest,
    PatientScanDateRequest,
    PatientConsultDateRequest,
)
from app.schemas.integrations_platform import PatientPaymentConfigResponse
from app.schemas.bank_details import UpsertBankDetailsInput
from app.schemas.orders import OrderTimelineEvent
from app.schemas.storage import ConfirmUploadResponse, PatientPresignUploadRequest, PresignUploadResponse
from app.services.final_report_service import FinalReportService
from app.services.notification_service import NotificationService
from app.services.patient_portal_dashboard_service import PatientPortalDashboardService
from app.services.patient_portal_service import PatientPortalService
from app.services.prescription_service import PrescriptionService

router = APIRouter(prefix="/patient-portal", tags=["patient-portal"])


def _portal_service(db: AsyncSession = Depends(get_db)) -> PatientPortalService:
    return PatientPortalService(db)


def _portal_dashboard_service(db: AsyncSession = Depends(get_db)) -> PatientPortalDashboardService:
    return PatientPortalDashboardService(db)


def _notification_service(db: AsyncSession = Depends(get_db)) -> NotificationService:
    return NotificationService(db)


def _final_report_service(db: AsyncSession = Depends(get_db)) -> FinalReportService:
    return FinalReportService(db)


def _prescription_service(db: AsyncSession = Depends(get_db)) -> PrescriptionService:
    return PrescriptionService(db)


@router.post("/otp/send", response_model=DataEnvelope[OtpSendResponse])
async def send_otp(
    body: OtpSendRequest,
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[OtpSendResponse]:
    data = await service.send_otp(body.phone)
    return DataEnvelope(data=data)


@router.post("/otp/verify", response_model=DataEnvelope[PatientPortalSession])
async def verify_otp(
    body: OtpVerifyRequest,
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PatientPortalSession]:
    data = await service.verify_otp(body.phone, body.otp)
    return DataEnvelope(data=data)


@router.get("/dashboard/analytics", response_model=DataEnvelope[dict])
async def patient_dashboard_analytics(
    phone: str = Query(...),
    service: PatientPortalDashboardService = Depends(_portal_dashboard_service),
) -> DataEnvelope[dict]:
    return DataEnvelope(data=await service.get_dashboard_analytics(phone))


@router.get("/orders", response_model=DataEnvelope[list[PatientOrder]])
async def list_orders(
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[list[PatientOrder]]:
    data = await service.list_orders(phone)
    return DataEnvelope(data=data)


@router.get("/enquiries", response_model=DataEnvelope[list[PatientEnquiry]])
async def list_enquiries(
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[list[PatientEnquiry]]:
    data = await service.list_enquiries(phone)
    return DataEnvelope(data=[PatientEnquiry.model_validate(row) for row in data])


@router.get("/enquiries/{enquiry_id}", response_model=DataEnvelope[PatientEnquiry])
async def get_enquiry(
    enquiry_id: UUID,
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PatientEnquiry]:
    data = await service.get_enquiry(phone, enquiry_id)
    if not data:
        from app.core.exceptions import AppError

        raise AppError("Enquiry not found", status_code=404)
    return DataEnvelope(data=PatientEnquiry.model_validate(data))


@router.get("/payment-config", response_model=DataEnvelope[PatientPaymentConfigResponse])
async def get_payment_config(
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PatientPaymentConfigResponse]:
    data = await service.get_payment_config()
    return DataEnvelope(data=PatientPaymentConfigResponse.model_validate(data))


@router.get("/orders/{order_id}", response_model=DataEnvelope[PatientOrder])
async def get_order(
    order_id: UUID,
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PatientOrder]:
    data = await service.get_order(phone, order_id)
    if not data:
        from app.core.exceptions import AppError

        raise AppError("Order not found", status_code=404)
    return DataEnvelope(data=data)


@router.post("/orders/{order_id}/pay", response_model=DataEnvelope[PatientOrder])
async def pay_order(
    order_id: UUID,
    body: PatientPayRequest,
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PatientOrder]:
    data = await service.pay_order(
        order_id,
        body.phone,
        body.method,
        receipt_file_id=body.receipt_file_id,
        transaction_ref=body.transaction_ref,
        outcome=body.outcome,
    )
    return DataEnvelope(data=data)


@router.get("/orders/{order_id}/timeline", response_model=DataEnvelope[list[OrderTimelineEvent]])
async def get_order_timeline(
    order_id: UUID,
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[list[OrderTimelineEvent]]:
    data = await service.get_timeline(phone, order_id)
    return DataEnvelope(data=data)


@router.post("/orders/{order_id}/scan-date", response_model=DataEnvelope[PatientOrder])
async def request_scan_date(
    order_id: UUID,
    body: PatientScanDateRequest,
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PatientOrder]:
    data = await service.request_scan_date(
        phone,
        order_id,
        preferred_at=body.preferred_at,
        visit_mode=body.visit_mode,
        time_slot=body.time_slot,
    )
    return DataEnvelope(data=data)


@router.post("/orders/{order_id}/consult-date", response_model=DataEnvelope[PatientOrder])
async def request_consult_date(
    order_id: UUID,
    body: PatientConsultDateRequest,
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PatientOrder]:
    data = await service.request_consult_date(
        phone,
        order_id,
        preferred_at=body.preferred_at,
        time_slot=body.time_slot,
    )
    return DataEnvelope(data=data)


@router.post("/orders/{order_id}/pathology-date", response_model=DataEnvelope[PatientOrder])
async def request_pathology_date(
    order_id: UUID,
    body: PatientPathologyDateRequest,
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PatientOrder]:
    data = await service.request_pathology_date(
        phone,
        order_id,
        preferred_at=body.preferred_at,
        time_slot=body.time_slot,
    )
    return DataEnvelope(data=data)


@router.get("/orders/{order_id}/invoice", response_model=DataEnvelope[dict | None])
async def get_order_invoice(
    order_id: UUID,
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[dict | None]:
    data = await service.get_invoice(order_id, phone)
    return DataEnvelope(data=data)


@router.get("/orders/{order_id}/final-report")
async def get_published_final_report(
    order_id: UUID,
    phone: str = Query(...),
    portal: PatientPortalService = Depends(_portal_service),
    reports: FinalReportService = Depends(_final_report_service),
) -> DataEnvelope[dict | None]:
    if not await portal.get_order(phone, order_id):
        from app.core.exceptions import AppError

        raise AppError("Order not found", status_code=404)
    data = await reports.get_published_for_patient(order_id)
    return DataEnvelope(data=data)


@router.get("/orders/{order_id}/prescription")
async def get_published_prescription(
    order_id: UUID,
    phone: str = Query(...),
    portal: PatientPortalService = Depends(_portal_service),
    prescriptions: PrescriptionService = Depends(_prescription_service),
) -> DataEnvelope[dict | None]:
    if not await portal.get_order(phone, order_id):
        from app.core.exceptions import AppError

        raise AppError("Order not found", status_code=404)
    data = await prescriptions.get_published_for_patient(order_id)
    return DataEnvelope(data=data)


@router.get("/profile", response_model=DataEnvelope[PatientProfile])
async def get_profile(
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PatientProfile]:
    data = await service.get_profile(phone)
    return DataEnvelope(data=data)


@router.patch("/profile", response_model=DataEnvelope[PatientProfile])
async def update_profile(
    body: PatientProfileUpdate,
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PatientProfile]:
    data = await service.update_profile(
        body.phone,
        email=body.email,
        city=body.city,
        date_of_birth=body.date_of_birth,
    )
    return DataEnvelope(data=data)


@router.get("/onboarding/status", response_model=DataEnvelope[PatientOnboardingStatus])
async def get_onboarding_status(
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PatientOnboardingStatus]:
    data = await service.get_onboarding_status(phone)
    return DataEnvelope(data=data)


@router.post("/onboarding/complete", response_model=DataEnvelope[PatientPortalSession])
async def complete_onboarding(
    body: PatientOnboardingCompleteRequest,
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PatientPortalSession]:
    data = await service.complete_onboarding(
        body.phone,
        full_name=body.full_name,
        email=body.email,
        city=body.city,
        date_of_birth=body.date_of_birth,
        gender=body.gender,
    )
    return DataEnvelope(data=data)


@router.get("/bank-details", response_model=DataEnvelope[dict])
async def get_patient_bank_details(
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[dict]:
    return DataEnvelope(data=await service.get_bank_details(phone))


@router.put("/bank-details", response_model=DataEnvelope[dict])
async def upsert_patient_bank_details(
    body: UpsertBankDetailsInput,
    request: Request,
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[dict]:
    meta = request_meta(request)
    data = await service.upsert_bank_details(
        phone,
        body.model_dump(by_alias=True),
        ip_address=meta.get("ip_address"),
        user_agent=meta.get("user_agent"),
    )
    return DataEnvelope(data=data)


@router.post("/storage/presign", response_model=DataEnvelope[PresignUploadResponse])
async def presign_patient_storage_upload(
    body: PatientPresignUploadRequest,
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[PresignUploadResponse]:
    data = await service.presign_storage_upload(
        phone,
        file_name=body.file_name,
        mime_type=body.mime_type,
        entity_type=body.entity_type,
        entity_id=body.entity_id,
        subfolder=body.subfolder,
    )
    return DataEnvelope(data=data)


@router.post("/storage/upload", response_model=DataEnvelope[ConfirmUploadResponse])
async def upload_patient_storage_file(
    phone: str = Query(...),
    entity_type: str = Form(..., alias="entityType"),
    entity_id: UUID | None = Form(default=None, alias="entityId"),
    subfolder: str | None = Form(default=None),
    file: UploadFile = File(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[ConfirmUploadResponse]:
    data = await service.upload_storage_multipart(
        phone,
        file,
        entity_type=entity_type,
        entity_id=entity_id,
        subfolder=subfolder,
    )
    return DataEnvelope(data=ConfirmUploadResponse.model_validate(data))


@router.post("/storage/{file_id}/confirm", response_model=DataEnvelope[ConfirmUploadResponse])
async def confirm_patient_storage_upload(
    file_id: UUID,
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[ConfirmUploadResponse]:
    data = await service.confirm_storage_upload(phone, file_id)
    return DataEnvelope(data=data)


@router.get("/downloads", response_model=DataEnvelope[list[PatientDownloadItem]])
async def list_downloads(
    phone: str = Query(...),
    service: PatientPortalService = Depends(_portal_service),
) -> DataEnvelope[list[PatientDownloadItem]]:
    data = await service.list_downloads(phone)
    return DataEnvelope(data=data)


@router.get("/org/notifications", response_model=DataEnvelope[list[PatientNotification]])
async def list_patient_notifications(
    phone: str = Query(...),
    db: AsyncSession = Depends(get_db),
    notifications: NotificationService = Depends(_notification_service),
) -> DataEnvelope[list[PatientNotification]]:
    from app.services.patient_portal_access import ensure_patient_portal_phone

    normalized = await ensure_patient_portal_phone(db, phone)
    rows = await notifications.list_for_patient_phone(normalized)
    data = [
        {
            "id": row["id"],
            "channel": "in_app",
            "title": row["title"],
            "body": row["body"],
            "orderId": row.get("orderId"),
            "read": row["read"],
            "sentAt": row["createdAt"],
        }
        for row in rows
    ]
    return DataEnvelope(data=data)


@router.post("/org/notifications/{notification_id}/read")
async def mark_patient_notification_read(
    notification_id: UUID,
    phone: str = Query(...),
    db: AsyncSession = Depends(get_db),
    notifications: NotificationService = Depends(_notification_service),
) -> DataEnvelope[dict[str, bool]]:
    from app.services.patient_portal_access import ensure_patient_portal_phone

    normalized = await ensure_patient_portal_phone(db, phone)
    await notifications.mark_read_for_patient(notification_id, normalized)
    return DataEnvelope(data={"read": True})
