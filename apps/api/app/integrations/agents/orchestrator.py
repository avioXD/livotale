from __future__ import annotations

import logging

from app.integrations.agents.base import ExtractionContext
from app.integrations.agents.clinical_validator import ClinicalValidatorAgent
from app.integrations.agents.document_parser import DocumentParserAgent
from app.integrations.agents.field_extractor import FieldExtractorAgent
from app.integrations.extraction_types import ExtractedFieldResult

logger = logging.getLogger(__name__)


class ExtractionOrchestrator:
    def __init__(self) -> None:
        self._agents = (
            DocumentParserAgent(),
            FieldExtractorAgent(),
            ClinicalValidatorAgent(),
        )

    async def process(
        self,
        *,
        job_id: str,
        order_id: str,
        source_type: str,
        source_file_id: str | None = None,
    ) -> list[ExtractedFieldResult]:
        context = ExtractionContext(
            job_id=job_id,
            order_id=order_id,
            source_type=source_type,
            source_file_id=source_file_id,
        )
        for agent in self._agents:
            logger.debug("Running extraction agent: %s", agent.name)
            context = await agent.run(context)
        fields: list[ExtractedFieldResult] = context.metadata.get("validated_fields", [])
        return fields
