"""Unit tests for multi-agent pathology extraction pipeline."""

from __future__ import annotations

import pytest

from app.integrations.agents.clinical_validator import ClinicalValidatorAgent
from app.integrations.agents.document_parser import DocumentParserAgent
from app.integrations.agents.field_extractor import FieldExtractorAgent
from app.integrations.agents.orchestrator import ExtractionOrchestrator
from app.integrations.agents.base import ExtractionContext


@pytest.mark.asyncio
async def test_document_parser_populates_raw_text():
    agent = DocumentParserAgent()
    context = ExtractionContext(job_id="j1", order_id="o1", source_type="pathology_report")
    result = await agent.run(context)
    assert "ALT" in result.raw_text
    assert result.metadata["parser"] == "document_parser"


@pytest.mark.asyncio
async def test_field_extractor_parses_lab_values():
    parser = DocumentParserAgent()
    extractor = FieldExtractorAgent()
    context = await parser.run(ExtractionContext(job_id="j1", order_id="o1", source_type="pathology_report"))
    context = await extractor.run(context)
    fields = context.metadata["extracted_fields"]
    assert any(field.field_name == "ALT" for field in fields)


@pytest.mark.asyncio
async def test_clinical_validator_flags_high_hba1c():
    orchestrator = ExtractionOrchestrator()
    fields = await orchestrator.process(
        job_id="job-1",
        order_id="order-1",
        source_type="pathology_report",
    )
    hba1c = next((field for field in fields if field.field_name == "HbA1c"), None)
    assert hba1c is not None
    assert hba1c.flag == "high"


@pytest.mark.asyncio
async def test_orchestrator_runs_all_agents():
    orchestrator = ExtractionOrchestrator()
    fields = await orchestrator.process(
        job_id="job-2",
        order_id="order-2",
        source_type="pathology_report",
    )
    assert len(fields) >= 5
    assert all(field.confidence_score for field in fields)
