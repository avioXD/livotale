from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.domain.order_workflow import OrderWorkflowEvent, can_transition
from app.domain.pdf_templates import REPORT_LETTERHEAD_CODE
from app.integrations.pdf_generation import get_pdf_generation_service
from app.models.clinical import FibrosisScanRecord, FinalReport
from app.models.commerce import ServiceOrder
from app.models.integrations import AIExtractionJob
from app.services.ai_extraction_service import AIExtractionService
from app.services.order_helpers import append_timeline, iso, load_order_row, load_package_flags, transition_order
from app.services.technician_order_service import scan_to_api
from app.services.workflow_notifications import WorkflowNotificationService


REPORT_TYPE_LABELS = {
    "fibrosis_scan_only": "Liver Fibrosis Scan Report",
    "combined_scan_pathology": "Combined Fibrosis Scan + Pathology Report",
    "combined_with_consultation": "Combined Fibrosis Scan + Pathology Report",
}

DEFAULT_LETTERHEAD = {
    "companyName": "Livotale Liver Care",
    "email": "care@livotale.demo",
    "disclaimer": "This report supports clinical decision-making and does not replace physician consultation.",
}


def report_to_api(report: FinalReport) -> dict[str, Any]:
    return {
        "id": report.id,
        "orderId": report.order_id,
        "patientId": report.patient_id,
        "reportType": report.report_type,
        "reportNumber": report.report_number,
        "status": report.status,
        "pdfUrl": report.pdf_url,
        "fileId": report.file_id,
        "generatedAt": iso(report.generated_at),
        "publishedAt": iso(report.published_at),
        "authorizedBy": report.authorized_by,
        "version": report.version,
        "qrCodeId": report.qr_code_id,
        "createdAt": iso(report.created_at),
        "updatedAt": iso(report.updated_at),
    }


class FinalReportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.pdf = get_pdf_generation_service(db=db)

    def _resolve_report_type(self, package_code: str) -> str:
        if package_code == "PKG-1":
            return "fibrosis_scan_only"
        if package_code == "PKG-3":
            return "combined_with_consultation"
        return "combined_scan_pathology"

    async def get_for_order(self, order_id: UUID) -> dict[str, Any] | None:
        result = await self.db.execute(
            select(FinalReport).where(FinalReport.order_id == order_id).order_by(FinalReport.version.desc())
        )
        report = result.scalars().first()
        return report_to_api(report) if report else None

    async def build_preview(self, order_id: UUID) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        report_type = self._resolve_report_type(order["package_code"])
        existing = await self.get_for_order(order_id)

        scan_result = await self.db.execute(select(FibrosisScanRecord).where(FibrosisScanRecord.order_id == order_id))
        scan_record = scan_result.scalar_one_or_none()
        scan = scan_to_api(scan_record, order_id, order["patient_id"]) if scan_record else None

        ai_service = AIExtractionService(self.db)
        ai_job = await ai_service.get_job_for_order(order_id)

        preview: dict[str, Any] = {
            "reportNumber": (existing or {}).get("reportNumber") or f"RPT-PREVIEW-{order['order_number']}",
            "reportType": report_type,
            "reportTypeLabel": REPORT_TYPE_LABELS[report_type],
            "patientName": order["patient_name"],
            "patientPhone": order["patient_phone"],
            "orderNumber": order["order_number"],
            "packageName": order["package_name"],
            "generatedAt": datetime.now(UTC).isoformat(),
            "authorizedBy": "Dr. Clinic Lead",
            "qrCodeId": (existing or {}).get("qrCodeId") or f"QR-{uuid4().hex[:8].upper()}",
            "interpretation": (scan or {}).get("interpretation") or "Pending scan interpretation",
            "disclaimer": DEFAULT_LETTERHEAD["disclaimer"],
            "footer": f"{DEFAULT_LETTERHEAD['companyName']} · {DEFAULT_LETTERHEAD['email']} · Page 1 of 1",
        }

        if scan:
            preview["fibrosisSection"] = {
                "title": "Liver Fibrosis Scan",
                "rows": [
                    {"label": "LSM (kPa)", "value": str(scan["liverStiffnessKpa"])},
                    {"label": "CAP (dB/m)", "value": str(scan["capDbm"])},
                    {"label": "Fibrosis stage", "value": scan["fibrosisStage"]},
                    {"label": "Steatosis grade", "value": scan["steatosisGrade"]},
                ],
            }

        if ai_job and order["package_code"] in {"PKG-2", "PKG-3"}:
            preview["pathologySection"] = {
                "title": "Pathology Results",
                "rows": [
                    {"label": field["fieldName"], "value": field["editableValue"], "flag": field["flag"]}
                    for field in ai_job["fields"]
                ],
            }
        return preview

    async def _validate_generate(self, order_id: UUID, order: dict[str, Any]) -> None:
        scan_result = await self.db.execute(select(FibrosisScanRecord).where(FibrosisScanRecord.order_id == order_id))
        if not scan_result.scalar_one_or_none():
            raise AppError("Fibrosis scan data required before generating report")
        if order["package_code"] in {"PKG-2", "PKG-3"}:
            job_result = await self.db.execute(
                select(AIExtractionJob).where(AIExtractionJob.order_id == order_id).order_by(AIExtractionJob.created_at.desc())
            )
            job = job_result.scalars().first()
            if not job or job.status != "verified":
                raise AppError("Verified pathology AI extraction required before generating combined report")

    async def generate(self, order_id: UUID, authorized_by: str, user_id: UUID) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        await self._validate_generate(order_id, order)
        preview = await self.build_preview(order_id)
        pdf = await self.pdf.generate_report_pdf(
            REPORT_LETTERHEAD_CODE,
            order_id=str(order_id),
            preview=preview,
            letterhead=DEFAULT_LETTERHEAD,
            db=self.db,
        )

        existing_result = await self.db.execute(
            select(FinalReport).where(FinalReport.order_id == order_id).order_by(FinalReport.version.desc())
        )
        existing = existing_result.scalars().first()
        version = (existing.version if existing else 0) + 1
        report = FinalReport(
            order_id=order_id,
            patient_id=order["patient_id"],
            report_type=preview["reportType"],
            report_number=preview["reportNumber"],
            status="generated",
            pdf_url=pdf.url,
            file_id=pdf.file_id,
            generated_at=datetime.fromisoformat(pdf.generated_at),
            authorized_by=authorized_by,
            version=version,
            qr_code_id=preview["qrCodeId"],
        )
        self.db.add(report)

        try:
            await transition_order(
                self.db,
                order_id,
                OrderWorkflowEvent.GENERATE_REPORT,
                performed_by=user_id,
                timeline_label=f"{report.report_number} v{version} generated",
            )
        except AppError:
            pass

        refreshed = await load_order_row(self.db, order_id)
        flags = await load_package_flags(self.db, order_id)
        order_view = SimpleNamespace(order_status=refreshed["order_status"])
        if can_transition(order_view, OrderWorkflowEvent.GENERATE_REPORT, flags):
            try:
                await transition_order(
                    self.db,
                    order_id,
                    OrderWorkflowEvent.GENERATE_REPORT,
                    performed_by=user_id,
                    timeline_label=f"{report.report_number} ready for publish",
                )
            except AppError:
                pass

        await append_timeline(
            self.db,
            order_id,
            "final_report_generated",
            f"{report.report_number} v{version} · {preview['reportTypeLabel']}",
            performed_by=user_id,
            metadata={"reportNumber": report.report_number, "version": str(version)},
        )
        await self.db.flush()
        return report_to_api(report)

    async def publish(self, order_id: UUID, user_id: UUID) -> dict[str, Any]:
        result = await self.db.execute(
            select(FinalReport).where(FinalReport.order_id == order_id).order_by(FinalReport.version.desc())
        )
        report = result.scalars().first()
        if not report:
            raise AppError("Generate report first")
        if report.status in {"published", "locked"}:
            return report_to_api(report)

        report.status = "published"
        report.published_at = datetime.now(UTC)
        report.updated_at = report.published_at

        scan_result = await self.db.execute(select(FibrosisScanRecord).where(FibrosisScanRecord.order_id == order_id))
        scan = scan_result.scalar_one_or_none()
        if scan:
            scan.locked = True

        await append_timeline(
            self.db,
            order_id,
            "report_published",
            f"{report.report_number} sent to patient portal",
            performed_by=user_id,
        )
        order = await load_order_row(self.db, order_id)
        await WorkflowNotificationService(self.db).order_event(
            "final_report_published",
            order=order,
            extra={"reportNumber": report.report_number, "reportUrl": report.pdf_url or ""},
        )
        flags = await load_package_flags(self.db, order_id)
        order_result = await self.db.execute(select(ServiceOrder).where(ServiceOrder.id == order_id))
        order_entity = order_result.scalar_one_or_none()
        if flags.consultation and order_entity and can_transition(order_entity, OrderWorkflowEvent.ASSIGN_DOCTOR, flags):
            await transition_order(
                self.db,
                order_id,
                OrderWorkflowEvent.ASSIGN_DOCTOR,
                performed_by=user_id,
                timeline_label="Doctor assignment pending after report publish",
            )
        await self.db.flush()
        return report_to_api(report)

    async def get_published_for_patient(self, order_id: UUID) -> dict[str, Any] | None:
        result = await self.db.execute(
            select(FinalReport)
            .where(
                FinalReport.order_id == order_id,
                FinalReport.status == "published",
                FinalReport.published_at.isnot(None),
            )
            .order_by(FinalReport.published_at.desc())
        )
        report = result.scalars().first()
        return report_to_api(report) if report else None

    async def lock(self, order_id: UUID) -> dict[str, Any]:
        result = await self.db.execute(
            select(FinalReport).where(FinalReport.order_id == order_id).order_by(FinalReport.version.desc())
        )
        report = result.scalars().first()
        if not report:
            raise AppError("No report found", status_code=404)
        report.status = "locked"
        report.updated_at = datetime.now(UTC)
        await self.db.flush()
        return report_to_api(report)
