from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.core.deps import require_roles
from app.domain.rbac import RoleCode
from app.schemas.common import DataEnvelope
from app.schemas.technician import (
    AttachScanFileRequest,
    CollectionProofRequest,
    CompleteVisitRequest,
    FetchDeviceScanRequest,
    FibroScanIntakeInput,
    FibrosisScanInput,
    FibrosisScanRecord,
    MarkSampleCollectedRequest,
    ScanPatientIntake,
    SendPatientIntakeOtpRequest,
    SubmitSampleToLabRequest,
    TechnicianOrder,
    TechnicianOrderDetail,
    UnableVisitRequest,
    VerifyPatientIntakeRequest,
    VisitStep,
)
from app.services.technician_order_service import TechnicianOrderService

router = APIRouter(prefix="/technician/orders", tags=["technician-orders"])


def _service(db: AsyncSession = Depends(get_db)) -> TechnicianOrderService:
    return TechnicianOrderService(db)


@router.get("", response_model=DataEnvelope[list[TechnicianOrder]])
async def list_assigned_orders(
    technician_id: UUID | None = Query(default=None, alias="technicianId"),
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[list[TechnicianOrder]]:
    target_id = technician_id or current_user.user_id
    data = await service.list_assigned(target_id)
    return DataEnvelope(data=data)


@router.get("/{order_id}", response_model=DataEnvelope[TechnicianOrderDetail])
async def get_order_detail(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[TechnicianOrderDetail]:
    data = await service.get_order_detail(order_id, current_user.user_id, current_user.roles)
    return DataEnvelope(data=data)


@router.get("/{order_id}/visit", response_model=DataEnvelope[VisitStep | None])
async def get_visit(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[VisitStep | None]:
    data = await service.get_visit(order_id)
    return DataEnvelope(data=data)


@router.get("/{order_id}/fibrosis-scan", response_model=DataEnvelope[FibrosisScanRecord | None])
async def get_scan(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[FibrosisScanRecord | None]:
    data = await service.get_scan(order_id)
    return DataEnvelope(data=data)


@router.get("/{order_id}/patient-intake", response_model=DataEnvelope[ScanPatientIntake | None])
async def get_patient_intake(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN, RoleCode.ADMIN, RoleCode.SUPPORT)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[ScanPatientIntake | None]:
    data = await service.get_patient_intake(order_id)
    return DataEnvelope(data=data)


@router.post("/{order_id}/patient-intake/otp", response_model=DataEnvelope[VisitStep])
async def send_patient_intake_otp(
    order_id: UUID,
    body: SendPatientIntakeOtpRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[VisitStep]:
    data = await service.send_patient_intake_otp(
        order_id, current_user.user_id, current_user.roles, body.phone
    )
    return DataEnvelope(data=data)


@router.post("/{order_id}/patient-intake/verify", response_model=DataEnvelope[ScanPatientIntake])
async def verify_patient_intake(
    order_id: UUID,
    body: VerifyPatientIntakeRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[ScanPatientIntake]:
    data = await service.verify_patient_intake(order_id, current_user.user_id, current_user.roles, body)
    return DataEnvelope(data=data)


@router.post("/{order_id}/fibroscan-intake", response_model=DataEnvelope[ScanPatientIntake])
async def submit_fibroscan_intake(
    order_id: UUID,
    body: FibroScanIntakeInput,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[ScanPatientIntake]:
    data = await service.submit_fibroscan_intake(order_id, current_user.user_id, current_user.roles, body)
    return DataEnvelope(data=data)


@router.post("/{order_id}/visit-started", response_model=DataEnvelope[VisitStep])
async def mark_visit_started(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[VisitStep]:
    data = await service.mark_visit_started(order_id, current_user.user_id, current_user.roles)
    return DataEnvelope(data=data)


@router.post("/{order_id}/reached", response_model=DataEnvelope[VisitStep])
async def mark_reached(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[VisitStep]:
    data = await service.mark_reached(order_id, current_user.user_id, current_user.roles)
    return DataEnvelope(data=data)


@router.post("/{order_id}/fibrosis-scan/fetch", response_model=DataEnvelope[FibrosisScanRecord])
async def fetch_device_scan(
    order_id: UUID,
    body: FetchDeviceScanRequest | None = None,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[FibrosisScanRecord]:
    device_serial = body.device_serial if body else None
    data = await service.fetch_device_scan(order_id, current_user.user_id, current_user.roles, device_serial)
    return DataEnvelope(data=data)


@router.post("/{order_id}/fibrosis-scan", response_model=DataEnvelope[FibrosisScanRecord])
async def save_scan(
    order_id: UUID,
    body: FibrosisScanInput,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[FibrosisScanRecord]:
    data = await service.save_scan(order_id, current_user.user_id, current_user.roles, body)
    return DataEnvelope(data=data)


@router.post("/{order_id}/fibrosis-scan/attach", response_model=DataEnvelope[FibrosisScanRecord])
async def attach_scan_file(
    order_id: UUID,
    body: AttachScanFileRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[FibrosisScanRecord]:
    data = await service.attach_scan_file(order_id, current_user.user_id, current_user.roles, body)
    return DataEnvelope(data=data)


@router.post("/{order_id}/fibrosis-scan/attach-file", response_model=DataEnvelope[FibrosisScanRecord])
async def attach_scan_file_upload(
    order_id: UUID,
    file: UploadFile = File(...),
    scan_report_document_type: str | None = Form(default=None, alias="scanReportDocumentType"),
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[FibrosisScanRecord]:
    data = await service.attach_scan_file_upload(
        order_id,
        current_user.user_id,
        current_user.roles,
        file,
        scan_report_document_type,
    )
    return DataEnvelope(data=data)


@router.post("/{order_id}/visit-completion-otp", response_model=DataEnvelope[VisitStep])
async def send_visit_completion_otp(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[VisitStep]:
    data = await service.send_visit_completion_otp(order_id, current_user.user_id, current_user.roles)
    return DataEnvelope(data=data)


@router.post("/{order_id}/complete")
async def complete_scan(
    order_id: UUID,
    body: CompleteVisitRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[dict]:
    data = await service.complete_scan(order_id, current_user.user_id, current_user.roles, body)
    return DataEnvelope(data=data)


@router.post("/{order_id}/fibrosis-scan/rescan")
async def request_rescan(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[dict]:
    data = await service.request_rescan(order_id, current_user.user_id, current_user.roles)
    return DataEnvelope(data=data)


@router.post("/{order_id}/unable", response_model=DataEnvelope[VisitStep])
async def mark_unable(
    order_id: UUID,
    body: UnableVisitRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[VisitStep]:
    data = await service.mark_unable(order_id, current_user.user_id, current_user.roles, body)
    return DataEnvelope(data=data)


@router.post("/{order_id}/sample-dispatch/proof", response_model=DataEnvelope[dict])
async def upload_collection_proof(
    order_id: UUID,
    body: CollectionProofRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[dict]:
    data = await service.upload_collection_proof(order_id, current_user.user_id, current_user.roles, body)
    return DataEnvelope(data=data)


@router.post("/{order_id}/sample-dispatch/collected", response_model=DataEnvelope[dict])
async def mark_sample_collected(
    order_id: UUID,
    body: MarkSampleCollectedRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[dict]:
    data = await service.mark_sample_collected(order_id, current_user.user_id, current_user.roles, body)
    return DataEnvelope(data=data)


@router.post("/{order_id}/sample-dispatch/submit", response_model=DataEnvelope[dict])
async def submit_sample_to_lab(
    order_id: UUID,
    body: SubmitSampleToLabRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.TECHNICIAN)),
    service: TechnicianOrderService = Depends(_service),
) -> DataEnvelope[dict]:
    data = await service.submit_sample_to_lab(order_id, current_user.user_id, current_user.roles, body)
    return DataEnvelope(data=data)
