from __future__ import annotations

import io
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from jinja2 import Environment, StrictUndefined
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.integrations.s3 import S3Service
from app.models.integration_platform import LetterheadTemplate

_JINJA = Environment(undefined=StrictUndefined, autoescape=True)


@dataclass(frozen=True, slots=True)
class PdfGenerationResult:
    file_id: str
    url: str
    generated_at: str


class DummyPDFGenerationService:
    async def generate_report_pdf(
        self,
        template_code: str,
        *,
        order_id: str,
        preview: dict[str, Any],
        letterhead: dict[str, Any] | None = None,
        db: AsyncSession | None = None,
    ) -> PdfGenerationResult:
        report_number = preview.get("reportNumber", f"RPT-{order_id[:8].upper()}")
        file_id = f"pdf-report-{uuid4()}"
        return PdfGenerationResult(
            file_id=file_id,
            url=f"https://files.livotale.demo/reports/{order_id}/{report_number}.pdf",
            generated_at=datetime.now(UTC).isoformat(),
        )

    async def generate_prescription_pdf(
        self,
        template_code: str,
        *,
        prescription_id: str,
        order_id: str,
        patient_name: str,
        doctor_name: str,
        diagnosis: str | None,
        medicines: list[dict[str, Any]],
        db: AsyncSession | None = None,
    ) -> PdfGenerationResult:
        file_id = f"pdf-rx-{uuid4()}"
        return PdfGenerationResult(
            file_id=file_id,
            url=f"https://files.livotale.demo/prescriptions/{order_id}/{prescription_id}.pdf",
            generated_at=datetime.now(UTC).isoformat(),
        )


class LivePDFGenerationService:
    def __init__(self, db: AsyncSession | None = None):
        self.db = db

    async def _load_template_html(self, template_code: str) -> str:
        if not self.db:
            raise RuntimeError("Database session required for live PDF generation")
        result = await self.db.execute(
            select(LetterheadTemplate).where(LetterheadTemplate.code == template_code, LetterheadTemplate.active.is_(True))
        )
        row = result.scalar_one_or_none()
        if not row or not row.html_body:
            raise RuntimeError(f"Letterhead template not found: {template_code}")
        return row.html_body

    async def _render_pdf(self, template_code: str, context: dict[str, Any]) -> bytes:
        from weasyprint import HTML

        html_body = await self._load_template_html(template_code)
        html = _JINJA.from_string(html_body).render(**context)
        return HTML(string=html).write_pdf()

    async def generate_report_pdf(
        self,
        template_code: str,
        *,
        order_id: str,
        preview: dict[str, Any],
        letterhead: dict[str, Any] | None = None,
        db: AsyncSession | None = None,
    ) -> PdfGenerationResult:
        service_db = db or self.db
        if service_db:
            self.db = service_db
        context = {**(letterhead or {}), **preview}
        pdf_bytes = await self._render_pdf(template_code, context)
        file_id = f"pdf-report-{uuid4()}"
        prefix = get_settings().s3_key_prefix.strip("/")
        key = f"{prefix}/reports/{order_id}/{file_id}.pdf" if prefix else f"reports/{order_id}/{file_id}.pdf"
        s3 = S3Service()
        await s3.upload_file(pdf_bytes, key, "application/pdf")
        url = s3.get_public_url(key)
        return PdfGenerationResult(file_id=file_id, url=url, generated_at=datetime.now(UTC).isoformat())

    async def generate_prescription_pdf(
        self,
        template_code: str,
        *,
        prescription_id: str,
        order_id: str,
        patient_name: str,
        doctor_name: str,
        diagnosis: str | None,
        medicines: list[dict[str, Any]],
        db: AsyncSession | None = None,
    ) -> PdfGenerationResult:
        service_db = db or self.db
        if service_db:
            self.db = service_db
        context = {
            "patientName": patient_name,
            "doctorName": doctor_name,
            "diagnosis": diagnosis or "",
            "medicines": medicines,
            "orderId": order_id,
            "prescriptionId": prescription_id,
        }
        pdf_bytes = await self._render_pdf(template_code, context)
        file_id = f"pdf-rx-{uuid4()}"
        prefix = get_settings().s3_key_prefix.strip("/")
        key = f"{prefix}/prescriptions/{order_id}/{file_id}.pdf" if prefix else f"prescriptions/{order_id}/{file_id}.pdf"
        s3 = S3Service()
        await s3.upload_file(pdf_bytes, key, "application/pdf")
        url = s3.get_public_url(key)
        return PdfGenerationResult(file_id=file_id, url=url, generated_at=datetime.now(UTC).isoformat())


def get_pdf_generation_service(settings: Settings | None = None, db: AsyncSession | None = None):
    settings = settings or get_settings()
    if settings.effective_integrations_mode == "dummy":
        return DummyPDFGenerationService()
    return LivePDFGenerationService(db=db)
