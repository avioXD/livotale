from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.common import DataEnvelope
from app.schemas.enquiries import Enquiry, PublicCreateEnquiryInput
from app.schemas.orders import ScanTimeSlotOption, ConsultTimeSlotOption
from app.schemas.packages import LiverCarePackage
from app.services.enquiry_service import EnquiryService
from app.services.package_service import PackageService
from app.services.doctor_availability_service import DoctorAvailabilityService
from app.services.slot_availability_service import SlotAvailabilityService
from app.services.workflow_notifications import WorkflowNotificationService
router = APIRouter(prefix="/public", tags=["public"])


def _package_service(db: AsyncSession = Depends(get_db)) -> PackageService:
    return PackageService(db)


def _enquiry_service(db: AsyncSession = Depends(get_db)) -> EnquiryService:
    return EnquiryService(db)


@router.get("/packages", response_model=DataEnvelope[list[LiverCarePackage]])
async def list_public_packages(
    service: PackageService = Depends(_package_service),
) -> DataEnvelope[list[LiverCarePackage]]:
    data = await service.list_public()
    return DataEnvelope(data=data)


@router.get("/packages/{code}", response_model=DataEnvelope[LiverCarePackage])
async def get_public_package(
    code: str,
    service: PackageService = Depends(_package_service),
) -> DataEnvelope[LiverCarePackage]:
    data = await service.get_by_code(code)
    return DataEnvelope(data=data)


@router.get("/slots/scan", response_model=DataEnvelope[list[ScanTimeSlotOption]])
async def list_scan_slots(
    date: str = Query(..., description="YYYY-MM-DD"),
    city: str = Query(default="default"),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[list[ScanTimeSlotOption]]:
    slot_service = SlotAvailabilityService(db)
    data = await slot_service.get_scan_slots(date, org_city=city)
    return DataEnvelope(data=data)


@router.get("/slots/consult", response_model=DataEnvelope[list[ConsultTimeSlotOption]])
async def list_consult_slots(
    date: str = Query(..., description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[list[ConsultTimeSlotOption]]:
    availability = DoctorAvailabilityService(db)
    data = await availability.get_aggregate_tele_slots(date)
    return DataEnvelope(data=data)


@router.post("/enquiries", response_model=DataEnvelope[Enquiry], status_code=201)
async def create_public_enquiry(
    body: PublicCreateEnquiryInput,
    db: AsyncSession = Depends(get_db),
    enquiry_service: EnquiryService = Depends(_enquiry_service),
) -> DataEnvelope[Enquiry]:
    from app.schemas.enquiries import CreateEnquiryInput

    payload = CreateEnquiryInput.model_validate(
        {
            "source": "website",
            "patientName": body.patient_name,
            "phone": body.phone,
            "email": body.email,
            "age": body.age,
            "gender": body.gender,
            "city": body.city,
            "address": body.address,
            "preferredPackageId": body.preferred_package_id,
            "message": body.message,
        }
    )
    data = await enquiry_service.create(payload, actor_id=None)
    workflow = WorkflowNotificationService(db)
    await workflow.enquiry_received(
        patient_name=data["patientName"],
        patient_phone=data["phone"],
        patient_email=data.get("email"),
    )
    return DataEnvelope(data=data)
