from __future__ import annotations

from decimal import Decimal

from app.integrations.agents.base import ExtractionAgent, ExtractionContext
from app.integrations.extraction_types import ExtractedFieldResult


def _parse_range(reference_range: str) -> tuple[float | None, float | None]:
    if "-" not in reference_range:
        return None, None
    low, high = reference_range.split("-", 1)
    try:
        return float(low.strip()), float(high.strip())
    except ValueError:
        return None, None


def _flag_value(value: str, reference_range: str | None) -> str:
    if not reference_range:
        return "normal"
    low, high = _parse_range(reference_range)
    if low is None or high is None:
        return "normal"
    try:
        numeric = float(value)
    except ValueError:
        return "normal"
    if numeric < low:
        return "low"
    if numeric > high:
        return "high"
    return "normal"


class ClinicalValidatorAgent(ExtractionAgent):
    name = "clinical_validator"

    async def run(self, context: ExtractionContext) -> ExtractionContext:
        raw_fields: list[ExtractedFieldResult] = context.metadata.get("extracted_fields", [])
        validated: list[ExtractedFieldResult] = []
        for field in raw_fields:
            flag = _flag_value(field.extracted_value, field.reference_range)
            confidence = field.confidence_score
            if flag != "normal":
                confidence = max(Decimal("0.7000"), confidence - Decimal("0.1000"))
            validated.append(
                ExtractedFieldResult(
                    field_name=field.field_name,
                    extracted_value=field.extracted_value,
                    editable_value=field.editable_value,
                    unit=field.unit,
                    reference_range=field.reference_range,
                    flag=flag,
                    confidence_score=confidence,
                    source_page=field.source_page,
                )
            )
        context.metadata["validated_fields"] = validated
        context.metadata["validator"] = self.name
        return context
