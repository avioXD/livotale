from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError
from app.integrations.agents.orchestrator import ExtractionOrchestrator
from app.integrations.extraction_types import ExtractedFieldResult
from app.services.integration_settings_service import IntegrationSettingsService

__all__ = ["ExtractedFieldResult", "get_ai_extraction_service", "DummyAIExtractionService", "LiveAIExtractionService"]


class DummyAIExtractionService:
    async def queue_extraction(self, order_id: str, source_type: str, source_file_id: str | None) -> dict[str, Any]:
        return {
            "id": str(uuid4()),
            "orderId": order_id,
            "sourceType": source_type,
            "sourceFileId": source_file_id,
            "status": "queued",
            "fields": [],
            "createdAt": datetime.now(UTC).isoformat(),
            "updatedAt": datetime.now(UTC).isoformat(),
        }

    async def process_job(self, job_id: str, order_id: str) -> list[ExtractedFieldResult]:
        orchestrator = ExtractionOrchestrator()
        return await orchestrator.process(
            job_id=job_id,
            order_id=order_id,
            source_type="pathology_report",
            source_file_id=None,
        )


class LiveAIExtractionService:
    def __init__(self, settings_service: IntegrationSettingsService):
        self.settings_service = settings_service

    async def _client_config(self) -> tuple[str, str, str]:
        creds = await self.settings_service.get_ai_credentials()
        if not creds:
            raise AppError(
                "AI extraction is not configured. Ask an administrator to configure AI credentials.",
                status_code=503,
                error="not_configured",
            )
        base = creds["base_url"] or "https://api.openai.com/v1"
        return base.rstrip("/"), creds["api_key"], creds["model"]

    async def queue_extraction(self, order_id: str, source_type: str, source_file_id: str | None) -> dict[str, Any]:
        return {
            "id": str(uuid4()),
            "orderId": order_id,
            "sourceType": source_type,
            "sourceFileId": source_file_id,
            "status": "queued",
            "fields": [],
            "createdAt": datetime.now(UTC).isoformat(),
            "updatedAt": datetime.now(UTC).isoformat(),
        }

    async def process_job(self, job_id: str, order_id: str) -> list[ExtractedFieldResult]:
        base_url, api_key, model = await self._client_config()
        prompt = (
            "Extract liver pathology lab values from the uploaded report for order "
            f"{order_id}. Return JSON array of objects with field_name, extracted_value, unit, reference_range, flag."
        )
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0,
                },
            )
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise AppError(
                    f"AI provider request failed: {exc.response.status_code}",
                    status_code=502,
                    error="provider_error",
                ) from exc
        orchestrator = ExtractionOrchestrator()
        return await orchestrator.process(
            job_id=job_id,
            order_id=order_id,
            source_type="pathology_report",
            source_file_id=None,
        )


def get_ai_extraction_service(settings: Settings | None = None, db: AsyncSession | None = None):
    settings = settings or get_settings()
    if settings.effective_integrations_mode == "dummy":
        return DummyAIExtractionService()
    if db is None:
        raise AppError(
            "AI extraction requires database-backed integration settings.",
            status_code=503,
            error="not_configured",
        )
    return LiveAIExtractionService(IntegrationSettingsService(db))
