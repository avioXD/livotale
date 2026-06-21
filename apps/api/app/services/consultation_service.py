from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.domain.order_workflow import OrderWorkflowEvent
from app.models.clinical import ConsultationVisitLog, LiverCarePrescription, OrderConsultation
from app.services.ai_extraction_service import AIExtractionService
from app.services.final_report_service import FinalReportService
from app.services.order_helpers import (
    append_timeline,
    iso,
    load_order_row,
    order_to_api,
    require_doctor_order,
    transition_order,
)
from app.services.pathology_service import PathologyService
from app.services.technician_order_service import TechnicianOrderService


def derive_consultation_stage(
    *,
    order_status: str,
    doctor_id: object,
    consultation_scheduled_at: object,
    prescription_status: str | None,
) -> str:
    if order_status == "completed":
        return "completed"
    if order_status == "prescription_generated" or prescription_status == "published":
        return "prescription_ready"
    if order_status == "prescription_pending":
        return "prescription_pending"
    if order_status == "consultation_pending" or consultation_scheduled_at:
        return "scheduled"
    if order_status == "doctor_assigned" or (doctor_id and not consultation_scheduled_at):
        return "doctor_assigned"
    return "awaiting_doctor"


def consultation_to_api(row: OrderConsultation) -> dict[str, Any]:
    return {
        "id": row.id,
        "orderId": row.order_id,
        "patientId": row.patient_id,
        "doctorId": row.doctor_id,
        "doctorName": row.doctor_name,
        "consultationType": row.consultation_type,
        "scheduledAt": iso(row.scheduled_at),
        "meetingLink": row.meeting_link,
        "status": row.status,
        "doctorNotes": row.doctor_notes,
        "symptoms": row.symptoms,
        "visitCompletedAt": iso(row.visit_completed_at),
        "followUpAt": iso(row.follow_up_at),
        "createdAt": iso(row.created_at),
        "updatedAt": iso(row.updated_at),
    }


def visit_log_to_api(row: ConsultationVisitLog) -> dict[str, Any]:
    return {
        "id": row.id,
        "orderId": row.order_id,
        "consultationId": row.consultation_id,
        "visitType": row.visit_type,
        "visitNumber": row.visit_number,
        "scheduledAt": iso(row.scheduled_at),
        "visitCompletedAt": iso(row.visit_completed_at),
        "followUpAt": iso(row.follow_up_at),
        "symptoms": row.symptoms,
        "doctorNotes": row.doctor_notes,
        "status": row.status,
        "prescriptionId": row.prescription_id,
        "createdAt": iso(row.created_at),
        "updatedAt": iso(row.updated_at),
    }


class ConsultationService:
    DOCTOR_PROFILE = {
        "degree": "MD, DM (Hepatology)",
        "registration": "MMC-45821",
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_consultation(self, order_id: UUID) -> OrderConsultation | None:
        result = await self.db.execute(select(OrderConsultation).where(OrderConsultation.order_id == order_id))
        return result.scalar_one_or_none()

    async def _ensure_consultation(self, order_id: UUID) -> OrderConsultation:
        existing = await self._get_consultation(order_id)
        if existing:
            return existing
        order = await load_order_row(self.db, order_id)
        if not order.get("doctor_id"):
            raise AppError("Doctor not assigned to this order")
        consultation = OrderConsultation(
            order_id=order_id,
            patient_id=order["patient_id"],
            doctor_id=order["doctor_id"],
            doctor_name=order.get("doctor_name") or "Assigned Doctor",
            status="doctor_assigned",
        )
        self.db.add(consultation)
        await self.db.flush()
        return consultation

    async def list_assigned_orders(self, doctor_id: UUID) -> list[dict[str, Any]]:
        result = await self.db.execute(
            text(
                """
                SELECT o.id
                FROM commerce.service_orders o
                JOIN commerce.liver_care_packages p ON p.id = o.package_id
                WHERE o.doctor_id = :doctor_id
                  AND p.consultation_included = true
                  AND o.order_status <> 'cancelled'
                  AND o.deleted_at IS NULL
                ORDER BY o.updated_at DESC
                """
            ),
            {"doctor_id": doctor_id},
        )
        return [order_to_api(await load_order_row(self.db, row["id"])) for row in result.mappings()]

    async def list_assigned_patients(self, doctor_id: UUID) -> list[dict[str, Any]]:
        orders = await self.list_assigned_orders(doctor_id)
        by_patient: dict[str, dict[str, Any]] = {}
        for order in orders:
            existing = by_patient.get(str(order["patientId"]))
            if not existing:
                by_patient[str(order["patientId"])] = {
                    "patientId": order["patientId"],
                    "patientName": order["patientName"],
                    "patientPhone": order["patientPhone"],
                    "orderCount": 1,
                    "latestOrderId": order["id"],
                    "latestOrderNumber": order["orderNumber"],
                    "latestOrderStatus": order["orderStatus"],
                    "consultationScheduledAt": order.get("consultationScheduledAt"),
                    "_updatedAt": order["updatedAt"],
                }
                continue
            existing["orderCount"] += 1
            if order["updatedAt"] > existing["_updatedAt"]:
                existing.update(
                    {
                        "latestOrderId": order["id"],
                        "latestOrderNumber": order["orderNumber"],
                        "latestOrderStatus": order["orderStatus"],
                        "consultationScheduledAt": order.get("consultationScheduledAt"),
                        "_updatedAt": order["updatedAt"],
                    }
                )
        return [
            {key: value for key, value in patient.items() if key != "_updatedAt"}
            for patient in sorted(by_patient.values(), key=lambda row: row["patientName"])
        ]

    async def get_consultation(self, order_id: UUID) -> dict[str, Any] | None:
        row = await self._get_consultation(order_id)
        return consultation_to_api(row) if row else None

    async def _effective_doctor_id(
        self, order_id: UUID, doctor_id: UUID | None, roles: list[str]
    ) -> tuple[dict[str, Any], UUID]:
        order = await load_order_row(self.db, order_id)
        effective = doctor_id or order.get("doctor_id")
        if effective is None:
            raise AppError("Doctor not assigned to this order")
        require_doctor_order(order, effective, roles)
        return order, effective

    async def get_order_for_doctor(
        self, order_id: UUID, doctor_id: UUID | None, roles: list[str]
    ) -> dict[str, Any]:
        order, _ = await self._effective_doctor_id(order_id, doctor_id, roles)
        return order_to_api(order)

    async def _clinical_bundle(self, order_id: UUID) -> dict[str, Any]:
        technician = TechnicianOrderService(self.db)
        pathology = PathologyService(self.db)
        ai = AIExtractionService(self.db)
        reports = FinalReportService(self.db)
        return {
            "scan": await technician.get_scan(order_id),
            "pathology": await pathology.get_report(order_id),
            "aiExtraction": await ai.get_job_for_order(order_id),
            "finalReport": await reports.get_for_order(order_id),
        }

    async def get_clinical_for_doctor(
        self, order_id: UUID, doctor_id: UUID | None, roles: list[str]
    ) -> dict[str, Any]:
        await self._effective_doctor_id(order_id, doctor_id, roles)
        return await self._clinical_bundle(order_id)

    async def ensure_for_doctor(
        self, order_id: UUID, doctor_id: UUID | None, roles: list[str]
    ) -> dict[str, Any]:
        await self._effective_doctor_id(order_id, doctor_id, roles)
        return await self.ensure_for_order(order_id)

    async def get_context(
        self, order_id: UUID, doctor_id: UUID | None, roles: list[str]
    ) -> dict[str, Any]:
        order_row, _ = await self._effective_doctor_id(order_id, doctor_id, roles)
        order = order_to_api(order_row)
        consultation = await self.get_consultation(order_id)
        if consultation is None:
            consultation = await self.ensure_for_order(order_id)
        visit_logs = await self.list_visit_logs(order_id)
        if not visit_logs:
            visit_logs = [await self.ensure_initial_visit_log(order_id)]
        clinical = await self._clinical_bundle(order_id)
        liver_health_report: dict[str, Any] | None = None
        if clinical.get("scan"):
            from app.services.liver_health_report_service import LiverHealthReportService

            liver_health_report = await LiverHealthReportService(self.db).get_for_order(
                order_id, require_published=False
            )
        return {
            "order": order,
            "consultation": consultation,
            "visitLogs": visit_logs,
            "scan": clinical.get("scan"),
            "pathology": clinical.get("pathology"),
            "aiExtraction": clinical.get("aiExtraction"),
            "finalReport": clinical.get("finalReport"),
            "liverHealthReport": liver_health_report,
        }

    async def update_consultation(
        self,
        order_id: UUID,
        doctor_id: UUID,
        roles: list[str],
        *,
        doctor_notes: str | None = None,
        symptoms: str | None = None,
        follow_up_at: datetime | None = None,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_doctor_order(order, doctor_id, roles)
        consultation = await self._ensure_consultation(order_id)
        if doctor_notes is not None:
            consultation.doctor_notes = doctor_notes
        if symptoms is not None:
            consultation.symptoms = symptoms
        if follow_up_at is not None:
            consultation.follow_up_at = follow_up_at
        consultation.updated_at = datetime.now(UTC)
        await self.db.flush()
        return consultation_to_api(consultation)

    async def ensure_for_order(self, order_id: UUID) -> dict[str, Any]:
        return consultation_to_api(await self._ensure_consultation(order_id))

    async def sync_ops_schedule(
        self,
        order_id: UUID,
        scheduled_at: datetime,
        *,
        consultation_type: str = "video",
    ) -> dict[str, Any]:
        consultation = await self._ensure_consultation(order_id)
        consultation.scheduled_at = scheduled_at
        consultation.consultation_type = consultation_type
        consultation.meeting_link = f"https://meet.livotale.demo/{order_id}"
        consultation.status = "consultation_scheduled"
        consultation.updated_at = datetime.now(UTC)
        await self.db.flush()
        return consultation_to_api(consultation)

    async def schedule(
        self,
        order_id: UUID,
        doctor_id: UUID,
        roles: list[str],
        scheduled_at: datetime,
        consultation_type: str,
        user_id: UUID,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_doctor_order(order, doctor_id, roles)
        consultation = await self._ensure_consultation(order_id)
        consultation.scheduled_at = scheduled_at
        consultation.consultation_type = consultation_type
        consultation.meeting_link = f"https://meet.livotale.demo/{order_id}"
        consultation.status = "consultation_scheduled"
        consultation.updated_at = datetime.now(UTC)

        await self.db.execute(
            text(
                """
                UPDATE commerce.service_orders
                SET consultation_scheduled_at = :scheduled_at, updated_at = now()
                WHERE id = :order_id
                """
            ),
            {"scheduled_at": scheduled_at, "order_id": order_id},
        )

        try:
            await transition_order(
                self.db,
                order_id,
                OrderWorkflowEvent.SCHEDULE_CONSULTATION,
                performed_by=user_id,
                timeline_label=f"{consultation_type} call scheduled",
            )
        except AppError:
            pass

        await append_timeline(
            self.db,
            order_id,
            "consultation_scheduled",
            f"{consultation_type} call · {scheduled_at.isoformat()}",
            performed_by=user_id,
        )
        await self.db.flush()
        return consultation_to_api(consultation)

    async def start(self, order_id: UUID, doctor_id: UUID, roles: list[str]) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_doctor_order(order, doctor_id, roles)
        consultation = await self._ensure_consultation(order_id)
        consultation.status = "consultation_in_progress"
        consultation.updated_at = datetime.now(UTC)
        await self.db.flush()
        return consultation_to_api(consultation)

    async def complete(
        self,
        order_id: UUID,
        doctor_id: UUID,
        roles: list[str],
        user_id: UUID,
        *,
        doctor_notes: str | None = None,
        symptoms: str | None = None,
        visit_completed_at: datetime | None = None,
        follow_up_at: datetime | None = None,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_doctor_order(order, doctor_id, roles)
        consultation = await self._ensure_consultation(order_id)
        completed_at = visit_completed_at or datetime.now(UTC)
        if doctor_notes is not None:
            consultation.doctor_notes = doctor_notes
        if symptoms is not None:
            consultation.symptoms = symptoms
        if follow_up_at is not None:
            consultation.follow_up_at = follow_up_at
        consultation.visit_completed_at = completed_at
        consultation.status = "prescription_pending"
        consultation.updated_at = datetime.now(UTC)

        try:
            await transition_order(
                self.db,
                order_id,
                OrderWorkflowEvent.COMPLETE_CONSULTATION,
                performed_by=user_id,
                timeline_label="Visit completed · prescription draft pending",
            )
        except AppError:
            pass

        await append_timeline(
            self.db,
            order_id,
            "consultation_completed",
            "Visit completed · prescription draft pending",
            performed_by=user_id,
        )
        await self.db.flush()
        return consultation_to_api(consultation)

    async def list_visit_logs(self, order_id: UUID) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(ConsultationVisitLog)
            .where(ConsultationVisitLog.order_id == order_id)
            .order_by(ConsultationVisitLog.visit_number.asc())
        )
        return [visit_log_to_api(row) for row in result.scalars()]

    async def ensure_initial_visit_log(self, order_id: UUID) -> dict[str, Any]:
        existing = await self.list_visit_logs(order_id)
        if existing:
            return existing[0]
        consultation = await self._ensure_consultation(order_id)
        visit = ConsultationVisitLog(
            order_id=order_id,
            consultation_id=consultation.id,
            visit_type="initial",
            visit_number=1,
            scheduled_at=consultation.scheduled_at,
            visit_completed_at=consultation.visit_completed_at,
            follow_up_at=consultation.follow_up_at,
            symptoms=consultation.symptoms,
            doctor_notes=consultation.doctor_notes,
            status="completed" if consultation.visit_completed_at else "scheduled",
        )
        self.db.add(visit)
        await self.db.flush()
        return visit_log_to_api(visit)

    async def update_visit_log(
        self,
        order_id: UUID,
        visit_log_id: UUID,
        doctor_id: UUID,
        roles: list[str],
        *,
        doctor_notes: str | None = None,
        symptoms: str | None = None,
        scheduled_at: datetime | None = None,
        follow_up_at: datetime | None = None,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_doctor_order(order, doctor_id, roles)
        result = await self.db.execute(
            select(ConsultationVisitLog).where(
                ConsultationVisitLog.id == visit_log_id, ConsultationVisitLog.order_id == order_id
            )
        )
        visit = result.scalar_one_or_none()
        if not visit:
            raise AppError("Visit log not found", status_code=404)
        if doctor_notes is not None:
            visit.doctor_notes = doctor_notes
        if symptoms is not None:
            visit.symptoms = symptoms
        if scheduled_at is not None:
            visit.scheduled_at = scheduled_at
        if follow_up_at is not None:
            visit.follow_up_at = follow_up_at
        visit.updated_at = datetime.now(UTC)
        await self.db.flush()
        return visit_log_to_api(visit)

    async def complete_visit_log(
        self,
        order_id: UUID,
        visit_log_id: UUID,
        doctor_id: UUID,
        roles: list[str],
        user_id: UUID,
        *,
        doctor_notes: str | None = None,
        symptoms: str | None = None,
        visit_completed_at: datetime | None = None,
        follow_up_at: datetime | None = None,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_doctor_order(order, doctor_id, roles)
        result = await self.db.execute(
            select(ConsultationVisitLog).where(
                ConsultationVisitLog.id == visit_log_id, ConsultationVisitLog.order_id == order_id
            )
        )
        visit = result.scalar_one_or_none()
        if not visit:
            raise AppError("Visit log not found", status_code=404)

        completed_at = visit_completed_at or datetime.now(UTC)
        if doctor_notes is not None:
            visit.doctor_notes = doctor_notes
        if symptoms is not None:
            visit.symptoms = symptoms
        if follow_up_at is not None:
            visit.follow_up_at = follow_up_at
        visit.visit_completed_at = completed_at
        visit.status = "completed"
        visit.updated_at = datetime.now(UTC)

        consultation = await self._ensure_consultation(order_id)
        consultation.visit_completed_at = completed_at
        consultation.doctor_notes = visit.doctor_notes
        consultation.symptoms = visit.symptoms
        consultation.follow_up_at = visit.follow_up_at
        consultation.status = "prescription_pending"
        consultation.updated_at = visit.updated_at

        try:
            await transition_order(
                self.db,
                order_id,
                OrderWorkflowEvent.COMPLETE_CONSULTATION,
                performed_by=user_id,
                timeline_label=f"Visit #{visit.visit_number} completed · prescription pending",
            )
        except AppError:
            pass

        await append_timeline(
            self.db,
            order_id,
            "consultation_completed",
            f"Visit #{visit.visit_number} completed · prescription pending",
            performed_by=user_id,
            metadata={"visitLogId": str(visit.id), "visitNumber": str(visit.visit_number)},
        )
        await self.db.flush()
        return visit_log_to_api(visit)

    async def create_follow_up_visit(
        self,
        order_id: UUID,
        doctor_id: UUID,
        roles: list[str],
        user_id: UUID,
        scheduled_at: datetime,
        follow_up_at: datetime | None = None,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_doctor_order(order, doctor_id, roles)
        logs = await self.list_visit_logs(order_id)
        if not logs:
            raise AppError("Publish the current prescription before scheduling follow-up")
        latest = max(logs, key=lambda log: log["visitNumber"])
        if latest["status"] != "prescription_published":
            raise AppError("Complete and publish the current visit prescription before scheduling follow-up")

        consultation = await self._ensure_consultation(order_id)
        visit = ConsultationVisitLog(
            order_id=order_id,
            consultation_id=consultation.id,
            visit_type="follow_up",
            visit_number=len(logs) + 1,
            scheduled_at=scheduled_at,
            follow_up_at=follow_up_at,
            status="scheduled",
        )
        self.db.add(visit)
        await append_timeline(
            self.db,
            order_id,
            "follow_up_scheduled",
            f"Follow-up visit #{visit.visit_number} · {scheduled_at.isoformat()}",
            performed_by=user_id,
        )
        await self.db.flush()
        return visit_log_to_api(visit)

    async def list_consultation_queue(
        self,
        *,
        search: str | None = None,
        order_status: str | None = None,
        stage: str | None = None,
    ) -> list[dict[str, Any]]:
        result = await self.db.execute(
            text(
                """
                SELECT o.id
                FROM commerce.service_orders o
                JOIN commerce.liver_care_packages p ON p.id = o.package_id
                WHERE p.consultation_included = true AND o.deleted_at IS NULL
                ORDER BY o.updated_at DESC
                """
            )
        )
        rows: list[dict[str, Any]] = []
        for row in result.mappings():
            order = await load_order_row(self.db, row["id"])
            consultation = await self._get_consultation(row["id"])
            rx_result = await self.db.execute(
                select(LiverCarePrescription)
                .where(LiverCarePrescription.order_id == row["id"])
                .order_by(LiverCarePrescription.updated_at.desc())
            )
            prescription = rx_result.scalars().first()
            queue_row = {
                "orderId": row["id"],
                "orderNumber": order["order_number"],
                "patientId": order["patient_id"],
                "patientName": order["patient_name"],
                "packageCode": row.get("package_code") or order.get("package_code"),
                "orderStatus": order["order_status"],
                "doctorId": order.get("doctor_id"),
                "doctorName": order.get("doctor_name"),
                "consultationStatus": consultation.status if consultation else None,
                "consultationScheduledAt": iso(consultation.scheduled_at) if consultation else order.get("consultationScheduledAt"),
                "consultationPatientPreferredAt": iso(order.get("consultation_patient_preferred_at")),
                "consultationTimeSlot": order.get("consultation_time_slot"),
                "prescriptionStatus": prescription.status if prescription else None,
                "updatedAt": iso(order["updated_at"]),
            }
            if search:
                needle = search.lower()
                if needle not in f"{queue_row['orderNumber']} {queue_row['patientName']}".lower():
                    continue
            if order_status and queue_row["orderStatus"] != order_status:
                continue
            derived_stage = derive_consultation_stage(
                order_status=queue_row["orderStatus"],
                doctor_id=queue_row["doctorId"],
                consultation_scheduled_at=queue_row["consultationScheduledAt"],
                prescription_status=queue_row["prescriptionStatus"],
            )
            queue_row["stage"] = derived_stage
            if stage and derived_stage != stage:
                continue
            rows.append(queue_row)
        return rows

    async def get_consultation_queue_row(self, order_id: UUID) -> dict[str, Any] | None:
        rows = await self.list_consultation_queue()
        return next((row for row in rows if row["orderId"] == order_id), None)
