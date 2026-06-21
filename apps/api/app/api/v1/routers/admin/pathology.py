from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.core.deps import require_roles
from app.domain.rbac import RoleCode
from app.schemas.clinical import FinalReport, FinalReportPreviewData, GenerateFinalReportRequest
from app.schemas.common import DataEnvelope
from app.schemas.pathology import (
    AIExtractionJob,
    AssignLabRequest,
    DispatchSampleRequest,
    LabPartnerVisitRequest,
    LabReportQueueRow,
    LabReportUpload,
    SampleDispatch,
    SchedulePathologyRequest,
    UpdateExtractedFieldsRequest,
    UpdateExternalAppointmentRequest,
    VerifyExtractionRequest,
)
from app.services.ai_extraction_service import AIExtractionService
from app.services.final_report_service import FinalReportService
from app.services.pathology_service import PathologyService

router = APIRouter(tags=["admin-pathology"])


def _pathology_service(db: AsyncSession = Depends(get_db)) -> PathologyService:
    return PathologyService(db)


def _ai_service(db: AsyncSession = Depends(get_db)) -> AIExtractionService:
    return AIExtractionService(db)


def _final_report_service(db: AsyncSession = Depends(get_db)) -> FinalReportService:
    return FinalReportService(db)


@router.get("/admin/pathology/sample-dispatch-queue", response_model=DataEnvelope[list[SampleDispatch]])
async def list_sample_dispatch_queue(
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[list[SampleDispatch]]:
    return DataEnvelope(data=await service.list_sample_dispatch_queue())


@router.get("/admin/pathology/lab-report-queue", response_model=DataEnvelope[list[LabReportQueueRow]])
async def list_lab_report_queue(
    search: str | None = None,
    dispatch_status: str | None = Query(default=None, alias="dispatchStatus"),
    lab_id: UUID | None = Query(default=None, alias="labId"),
    extraction_status: str | None = Query(default=None, alias="extractionStatus"),
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[list[LabReportQueueRow]]:
    data = await service.list_lab_report_queue(
        search=search,
        dispatch_status=dispatch_status,
        lab_id=lab_id,
        extraction_status=extraction_status,
    )
    return DataEnvelope(data=data)


@router.get("/admin/pathology/lab-report-queue/{order_id}", response_model=DataEnvelope[LabReportQueueRow | None])
async def get_lab_report_queue_row(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[LabReportQueueRow | None]:
    return DataEnvelope(data=await service.get_lab_report_queue_row(order_id))


@router.get("/admin/pathology/pending-extraction", response_model=DataEnvelope[list[LabReportUpload]])
async def list_reports_pending_extraction(
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[list[LabReportUpload]]:
    return DataEnvelope(data=await service.list_reports_pending_extraction())


@router.get("/admin/orders/{order_id}/pathology", response_model=DataEnvelope[LabReportUpload | None])
async def get_report(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[LabReportUpload | None]:
    return DataEnvelope(data=await service.get_report(order_id))


@router.get("/admin/orders/{order_id}/sample-dispatch", response_model=DataEnvelope[SampleDispatch | None])
async def get_sample_dispatch(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[SampleDispatch | None]:
    return DataEnvelope(data=await service.get_sample_dispatch(order_id))


@router.post("/admin/orders/{order_id}/assign-lab", response_model=DataEnvelope[SampleDispatch])
async def assign_lab(
    order_id: UUID,
    body: AssignLabRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[SampleDispatch]:
    data = await service.assign_lab(order_id, body, current_user.user_id)
    return DataEnvelope(data=data)


@router.post("/admin/orders/{order_id}/lab-partner-order")
async def create_lab_partner_order(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[dict]:
    data = await service.create_lab_partner_order(order_id, current_user.user_id)
    return DataEnvelope(data=data)


@router.patch("/admin/orders/{order_id}/pathology-external-appointment")
async def update_pathology_external_appointment(
    order_id: UUID,
    body: UpdateExternalAppointmentRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[dict]:
    data = await service.update_external_appointment(order_id, body, current_user.user_id)
    return DataEnvelope(data=data)


@router.post("/admin/orders/{order_id}/schedule-pathology")
async def schedule_pathology(
    order_id: UUID,
    body: SchedulePathologyRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[dict]:
    data = await service.schedule_pathology(order_id, body, current_user.user_id)
    return DataEnvelope(data=data)


@router.post("/admin/orders/{order_id}/lab-partner-visit")
async def confirm_lab_partner_visit(
    order_id: UUID,
    body: LabPartnerVisitRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[dict]:
    data = await service.confirm_lab_partner_visit(order_id, body, current_user.user_id)
    return DataEnvelope(data=data)


@router.post("/admin/orders/{order_id}/lab-partner-collected", response_model=DataEnvelope[SampleDispatch])
async def mark_lab_partner_collected(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[SampleDispatch]:
    data = await service.mark_lab_partner_collected(order_id, current_user.user_id)
    return DataEnvelope(data=data)


@router.post("/admin/orders/{order_id}/sample-dispatch", response_model=DataEnvelope[SampleDispatch])
async def dispatch_sample(
    order_id: UUID,
    body: DispatchSampleRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[SampleDispatch]:
    data = await service.dispatch_sample(order_id, body, current_user.user_id)
    return DataEnvelope(data=data)


@router.post("/admin/orders/{order_id}/sample-dispatch/received", response_model=DataEnvelope[SampleDispatch])
async def mark_received_at_lab(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[SampleDispatch]:
    data = await service.mark_received_at_lab(order_id, current_user.user_id)
    return DataEnvelope(data=data)


@router.post("/admin/orders/{order_id}/sample-dispatch/awaiting-report", response_model=DataEnvelope[SampleDispatch])
async def mark_awaiting_report(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[SampleDispatch]:
    data = await service.mark_awaiting_report(order_id, current_user.user_id)
    return DataEnvelope(data=data)


@router.post("/admin/orders/{order_id}/lab-report", response_model=DataEnvelope[LabReportUpload])
async def upload_lab_report(
    order_id: UUID,
    file: UploadFile = File(...),
    email_from: str | None = Form(default=None, alias="emailFrom"),
    email_subject: str | None = Form(default=None, alias="emailSubject"),
    email_received_at: str | None = Form(default=None, alias="emailReceivedAt"),
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: PathologyService = Depends(_pathology_service),
) -> DataEnvelope[LabReportUpload]:
    data = await service.upload_lab_report_multipart(
        order_id,
        file,
        current_user.user_id,
        email_from=email_from,
        email_subject=email_subject,
        email_received_at=email_received_at,
    )
    return DataEnvelope(data=data)


@router.post("/admin/orders/{order_id}/ai-extract", response_model=DataEnvelope[AIExtractionJob])
async def trigger_ai_extraction(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: AIExtractionService = Depends(_ai_service),
) -> DataEnvelope[AIExtractionJob]:
    data = await service.trigger_extraction(order_id, current_user.user_id)
    return DataEnvelope(data=data)


@router.get("/admin/orders/{order_id}/ai-extraction", response_model=DataEnvelope[AIExtractionJob | None])
async def get_ai_extraction(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: AIExtractionService = Depends(_ai_service),
) -> DataEnvelope[AIExtractionJob | None]:
    return DataEnvelope(data=await service.get_job_for_order(order_id))


@router.get("/admin/ai-extraction/pending", response_model=DataEnvelope[list[AIExtractionJob]])
async def list_pending_ai_extraction(
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: AIExtractionService = Depends(_ai_service),
) -> DataEnvelope[list[AIExtractionJob]]:
    return DataEnvelope(data=await service.list_pending_review())


@router.patch("/admin/orders/{order_id}/ai-extraction/fields", response_model=DataEnvelope[AIExtractionJob])
async def update_ai_fields(
    order_id: UUID,
    body: UpdateExtractedFieldsRequest,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: AIExtractionService = Depends(_ai_service),
) -> DataEnvelope[AIExtractionJob]:
    payload = [field.model_dump(by_alias=True) for field in body.fields]
    data = await service.update_fields(order_id, payload)
    return DataEnvelope(data=data)


@router.post("/admin/orders/{order_id}/ai-extraction/verify", response_model=DataEnvelope[AIExtractionJob])
async def verify_ai_extraction(
    order_id: UUID,
    body: VerifyExtractionRequest | None = None,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: AIExtractionService = Depends(_ai_service),
) -> DataEnvelope[AIExtractionJob]:
    verified_by = body.verified_by if body else None
    data = await service.verify_extraction(order_id, current_user.user_id, verified_by=verified_by)
    return DataEnvelope(data=data)


@router.post("/admin/orders/{order_id}/ai-extraction/reupload", response_model=DataEnvelope[AIExtractionJob])
async def request_ai_reupload(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: AIExtractionService = Depends(_ai_service),
) -> DataEnvelope[AIExtractionJob]:
    data = await service.request_reupload(order_id, current_user.user_id)
    return DataEnvelope(data=data)


@router.get("/admin/orders/{order_id}/final-report", response_model=DataEnvelope[FinalReport | None])
async def get_final_report(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: FinalReportService = Depends(_final_report_service),
) -> DataEnvelope[FinalReport | None]:
    return DataEnvelope(data=await service.get_for_order(order_id))


@router.get("/admin/orders/{order_id}/final-report/preview", response_model=DataEnvelope[FinalReportPreviewData])
async def preview_final_report(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: FinalReportService = Depends(_final_report_service),
) -> DataEnvelope[FinalReportPreviewData]:
    return DataEnvelope(data=await service.build_preview(order_id))


@router.post("/admin/orders/{order_id}/final-report/generate", response_model=DataEnvelope[FinalReport])
async def generate_final_report(
    order_id: UUID,
    body: GenerateFinalReportRequest | None = None,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: FinalReportService = Depends(_final_report_service),
) -> DataEnvelope[FinalReport]:
    authorized_by = body.authorized_by if body else "operations"
    data = await service.generate(order_id, authorized_by, current_user.user_id)
    return DataEnvelope(data=data)


@router.post("/admin/orders/{order_id}/final-report/publish", response_model=DataEnvelope[FinalReport])
async def publish_final_report(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: FinalReportService = Depends(_final_report_service),
) -> DataEnvelope[FinalReport]:
    data = await service.publish(order_id, current_user.user_id)
    return DataEnvelope(data=data)


@router.post("/admin/orders/{order_id}/final-report/lock", response_model=DataEnvelope[FinalReport])
async def lock_final_report(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: FinalReportService = Depends(_final_report_service),
) -> DataEnvelope[FinalReport]:
    data = await service.lock(order_id)
    return DataEnvelope(data=data)
