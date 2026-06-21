from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import case, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.domain.order_workflow import OrderWorkflowEvent
from app.domain.pdf_templates import PRESCRIPTION_LETTERHEAD_CODE
from app.integrations.pdf_generation import DummyPDFGenerationService, get_pdf_generation_service
from app.models.clinical import ConsultationVisitLog, LiverCarePrescription, OrderConsultation
from app.services.order_helpers import append_timeline, iso, load_order_row, require_doctor_order, transition_order


def prescription_to_api(row: LiverCarePrescription) -> dict[str, Any]:
    return {
        "id": row.id,
        "orderId": row.order_id,
        "visitLogId": row.visit_log_id,
        "patientId": row.patient_id,
        "consultationId": row.consultation_id,
        "doctorId": row.doctor_id,
        "doctorName": row.doctor_name,
        "doctorDegree": row.doctor_degree or "",
        "doctorRegistration": row.doctor_registration or "",
        "status": row.status,
        "diagnosis": row.diagnosis,
        "clinicalNotes": row.clinical_notes,
        "symptoms": row.symptoms,
        "visitDate": iso(row.visit_date),
        "followUpDate": iso(row.follow_up_date),
        "medicines": _normalize_medicines(row.medicines),
        "dietAdvice": row.diet_advice,
        "lifestyleAdvice": row.lifestyle_advice,
        "followUpAdvice": row.follow_up_advice,
        "warningSigns": row.warning_signs,
        "pdfUrl": row.pdf_url,
        "fileId": row.file_id,
        "publishedAt": iso(row.published_at),
        "revisionOf": row.revision_of,
        "version": row.version,
        "createdAt": iso(row.created_at),
        "updatedAt": iso(row.updated_at),
    }


def _normalize_medicines(medicines: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for med in medicines or []:
        if not isinstance(med, dict):
            continue
        normalized.append(
            {
                "id": str(med.get("id") or f"med-{len(normalized) + 1}"),
                "name": str(med.get("name") or "Medicine"),
                "strength": med.get("strength"),
                "form": med.get("form") or "tablet",
                "dosage": str(med.get("dosage") or med.get("dose") or "1"),
                "frequency": str(med.get("frequency") or "OD"),
                "timing": med.get("timing") or "after_food",
                "duration": str(med.get("duration") or "30 days"),
                "instruction": med.get("instruction"),
            }
        )
    return normalized


def _prescription_preference_order():
    return (
        case((LiverCarePrescription.status == "draft", 0), else_=1),
        LiverCarePrescription.version.desc(),
        LiverCarePrescription.updated_at.desc(),
    )


class PrescriptionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.pdf = get_pdf_generation_service(db=db)

    async def _resolve_doctor_profile(
        self,
        doctor_id: UUID,
        *,
        order: dict[str, Any] | None = None,
    ) -> dict[str, str]:
        result = await self.db.execute(
            text(
                """
                SELECT du.full_name, d.qualification, d.registration_number
                FROM clinical.doctors d
                JOIN identity.users du ON du.id = d.user_id
                WHERE d.id = :doctor_id
                """
            ),
            {"doctor_id": doctor_id},
        )
        row = result.mappings().first()
        if row:
            return {
                "name": (row["full_name"] or "").strip(),
                "degree": (row["qualification"] or "").strip(),
                "registration": (row["registration_number"] or "").strip(),
            }

        order = order or {}
        return {
            "name": (order.get("doctor_name") or "").strip(),
            "degree": "",
            "registration": (order.get("doctor_registration") or "").strip(),
        }

    async def _stamp_doctor_profile(
        self,
        rx: LiverCarePrescription,
        doctor_id: UUID,
        order: dict[str, Any],
    ) -> None:
        profile = await self._resolve_doctor_profile(doctor_id, order=order)
        if not profile["name"]:
            raise AppError("Doctor profile not found", status_code=404, error="not_found")
        rx.doctor_name = profile["name"]
        rx.doctor_degree = profile["degree"] or None
        rx.doctor_registration = profile["registration"] or None

    async def _to_api(self, row: LiverCarePrescription) -> dict[str, Any]:
        data = prescription_to_api(row)
        if data["doctorName"] and data["doctorDegree"] and data["doctorRegistration"]:
            return data

        profile = await self._resolve_doctor_profile(row.doctor_id)
        if not data["doctorName"]:
            data["doctorName"] = profile["name"]
        if not data["doctorDegree"]:
            data["doctorDegree"] = profile["degree"]
        if not data["doctorRegistration"]:
            data["doctorRegistration"] = profile["registration"]
        return data

    async def _get_for_visit_row(
        self,
        order_id: UUID,
        visit_log_id: UUID,
        *,
        status: str | None = None,
    ) -> LiverCarePrescription | None:
        query = select(LiverCarePrescription).where(
            LiverCarePrescription.order_id == order_id,
            LiverCarePrescription.visit_log_id == visit_log_id,
        )
        if status:
            query = query.where(LiverCarePrescription.status == status)
        query = query.order_by(*_prescription_preference_order())
        result = await self.db.execute(query)
        return result.scalars().first()

    async def list_for_order(self, order_id: UUID) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(LiverCarePrescription)
            .where(LiverCarePrescription.order_id == order_id)
            .order_by(LiverCarePrescription.created_at.asc())
        )
        return [await self._to_api(row) for row in result.scalars()]

    async def get_latest_for_order(self, order_id: UUID) -> dict[str, Any] | None:
        result = await self.db.execute(
            select(LiverCarePrescription)
            .where(LiverCarePrescription.order_id == order_id)
            .order_by(LiverCarePrescription.updated_at.desc())
        )
        row = result.scalars().first()
        return await self._to_api(row) if row else None

    async def get_for_visit(self, order_id: UUID, visit_log_id: UUID) -> dict[str, Any] | None:
        row = await self._get_for_visit_row(order_id, visit_log_id)
        return await self._to_api(row) if row else None

    async def save_draft(
        self,
        order_id: UUID,
        visit_log_id: UUID,
        doctor_id: UUID,
        payload: dict[str, Any],
        roles: list[str],
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_doctor_order(order, doctor_id, roles)

        visit_result = await self.db.execute(
            select(ConsultationVisitLog).where(
                ConsultationVisitLog.id == visit_log_id, ConsultationVisitLog.order_id == order_id
            )
        )
        visit = visit_result.scalar_one_or_none()
        if not visit:
            raise AppError("Visit log not found", status_code=404)

        draft = await self._get_for_visit_row(order_id, visit_log_id, status="draft")
        published = await self._get_for_visit_row(order_id, visit_log_id, status="published")
        if published and not draft:
            raise AppError("Prescription is published — schedule a follow-up visit for a new Rx")

        consultation_result = await self.db.execute(
            select(OrderConsultation).where(OrderConsultation.order_id == order_id)
        )
        consultation = consultation_result.scalar_one_or_none()
        if not consultation:
            raise AppError("Consultation not found", status_code=404)

        if draft:
            rx = draft
            rx.diagnosis = payload.get("diagnosis")
            rx.clinical_notes = payload.get("clinicalNotes") or payload.get("clinical_notes")
            rx.symptoms = payload.get("symptoms")
            rx.visit_date = payload.get("visitDate") or payload.get("visit_date")
            rx.follow_up_date = payload.get("followUpDate") or payload.get("follow_up_date")
            rx.medicines = payload.get("medicines", [])
            rx.diet_advice = payload.get("dietAdvice") or payload.get("diet_advice")
            rx.lifestyle_advice = payload.get("lifestyleAdvice") or payload.get("lifestyle_advice")
            rx.follow_up_advice = payload.get("followUpAdvice") or payload.get("follow_up_advice")
            rx.warning_signs = payload.get("warningSigns") or payload.get("warning_signs")
            rx.status = "draft"
            rx.updated_at = datetime.now(UTC)
        else:
            rx = LiverCarePrescription(
                order_id=order_id,
                visit_log_id=visit_log_id,
                patient_id=order["patient_id"],
                consultation_id=consultation.id,
                doctor_id=doctor_id,
                doctor_name="",
                status="draft",
                diagnosis=payload.get("diagnosis"),
                clinical_notes=payload.get("clinicalNotes") or payload.get("clinical_notes"),
                symptoms=payload.get("symptoms"),
                visit_date=payload.get("visitDate") or payload.get("visit_date"),
                follow_up_date=payload.get("followUpDate") or payload.get("follow_up_date"),
                medicines=payload.get("medicines", []),
                diet_advice=payload.get("dietAdvice") or payload.get("diet_advice"),
                lifestyle_advice=payload.get("lifestyleAdvice") or payload.get("lifestyle_advice"),
                follow_up_advice=payload.get("followUpAdvice") or payload.get("follow_up_advice"),
                warning_signs=payload.get("warningSigns") or payload.get("warning_signs"),
            )
            self.db.add(rx)
            await self.db.flush()

        await self._stamp_doctor_profile(rx, doctor_id, order)

        visit.status = "prescription_draft"
        visit.prescription_id = rx.id
        visit.updated_at = datetime.now(UTC)
        await self.db.flush()
        return await self._to_api(rx)

    async def publish(
        self,
        order_id: UUID,
        visit_log_id: UUID,
        doctor_id: UUID,
        user_id: UUID,
        roles: list[str],
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_doctor_order(order, doctor_id, roles)

        rx = await self._get_for_visit_row(order_id, visit_log_id, status="draft")
        if not rx:
            raise AppError("Save prescription draft first")

        if not (rx.medicines or []):
            raise AppError("At least one medicine is required to publish")

        visit_result = await self.db.execute(
            select(ConsultationVisitLog).where(
                ConsultationVisitLog.id == visit_log_id, ConsultationVisitLog.order_id == order_id
            )
        )
        visit = visit_result.scalar_one_or_none()
        if not visit:
            raise AppError("Visit log not found", status_code=404)

        await self._stamp_doctor_profile(rx, doctor_id, order)

        pdf = await self._generate_prescription_pdf(
            order_id=order_id,
            rx=rx,
            patient_name=order["patient_name"],
        )

        rx.status = "published"
        rx.pdf_url = pdf.url
        rx.file_id = pdf.file_id
        rx.published_at = datetime.now(UTC)
        rx.updated_at = rx.published_at

        visit.status = "prescription_published"
        visit.prescription_id = rx.id
        visit.updated_at = rx.updated_at

        consultation_result = await self.db.execute(
            select(OrderConsultation).where(OrderConsultation.order_id == order_id)
        )
        consultation = consultation_result.scalar_one_or_none()
        if consultation:
            consultation.status = "prescription_published"
            consultation.updated_at = rx.updated_at

        try:
            await transition_order(
                self.db,
                order_id,
                OrderWorkflowEvent.PUBLISH_PRESCRIPTION,
                performed_by=user_id,
                timeline_label=f"Visit #{visit.visit_number} prescription published",
            )
        except AppError as exc:
            if exc.status_code != 409:
                raise

        await append_timeline(
            self.db,
            order_id,
            "prescription_published",
            f"Visit #{visit.visit_number} · {len(rx.medicines or [])} medicine(s)",
            performed_by=user_id,
            metadata={"visitLogId": str(visit_log_id), "visitNumber": str(visit.visit_number)},
        )
        await self.db.flush()
        return await self._to_api(rx)

    async def _generate_prescription_pdf(
        self,
        *,
        order_id: UUID,
        rx: LiverCarePrescription,
        patient_name: str,
    ):
        medicines = _normalize_medicines(rx.medicines)
        kwargs = {
            "prescription_id": str(rx.id),
            "order_id": str(order_id),
            "patient_name": patient_name,
            "doctor_name": rx.doctor_name,
            "diagnosis": rx.diagnosis,
            "medicines": medicines,
            "db": self.db,
        }
        try:
            return await self.pdf.generate_prescription_pdf(PRESCRIPTION_LETTERHEAD_CODE, **kwargs)
        except Exception as exc:
            try:
                return await DummyPDFGenerationService().generate_prescription_pdf(
                    PRESCRIPTION_LETTERHEAD_CODE,
                    **kwargs,
                )
            except Exception as fallback_exc:
                raise AppError(
                    f"Prescription PDF generation failed: {exc}",
                    status_code=502,
                    error="pdf_generation_failed",
                ) from fallback_exc

    async def get_published_for_patient(self, order_id: UUID) -> dict[str, Any] | None:
        result = await self.db.execute(
            select(LiverCarePrescription)
            .where(
                LiverCarePrescription.order_id == order_id,
                LiverCarePrescription.status == "published",
                LiverCarePrescription.published_at.isnot(None),
            )
            .order_by(LiverCarePrescription.published_at.desc())
        )
        row = result.scalars().first()
        return await self._to_api(row) if row else None

    async def create_revision(
        self,
        order_id: UUID,
        visit_log_id: UUID,
        doctor_id: UUID,
        roles: list[str],
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_doctor_order(order, doctor_id, roles)

        if await self._get_for_visit_row(order_id, visit_log_id, status="draft"):
            raise AppError("A prescription draft already exists for this visit")

        existing = await self._get_for_visit_row(order_id, visit_log_id, status="published")
        if not existing:
            raise AppError("No published prescription to revise")

        profile = await self._resolve_doctor_profile(doctor_id, order=order)
        if not profile["name"]:
            raise AppError("Doctor profile not found", status_code=404, error="not_found")

        revised = LiverCarePrescription(
            order_id=order_id,
            visit_log_id=visit_log_id,
            patient_id=existing.patient_id,
            consultation_id=existing.consultation_id,
            doctor_id=doctor_id,
            doctor_name=profile["name"],
            doctor_degree=profile["degree"] or None,
            doctor_registration=profile["registration"] or None,
            status="draft",
            diagnosis=existing.diagnosis,
            clinical_notes=existing.clinical_notes,
            symptoms=existing.symptoms,
            visit_date=existing.visit_date,
            follow_up_date=existing.follow_up_date,
            medicines=existing.medicines,
            diet_advice=existing.diet_advice,
            lifestyle_advice=existing.lifestyle_advice,
            follow_up_advice=existing.follow_up_advice,
            warning_signs=existing.warning_signs,
            revision_of=existing.id,
            version=existing.version + 1,
        )
        self.db.add(revised)

        visit_result = await self.db.execute(
            select(ConsultationVisitLog).where(
                ConsultationVisitLog.id == visit_log_id, ConsultationVisitLog.order_id == order_id
            )
        )
        visit = visit_result.scalar_one_or_none()
        if visit:
            visit.status = "prescription_draft"
            visit.prescription_id = revised.id
        await self.db.flush()
        return await self._to_api(revised)
