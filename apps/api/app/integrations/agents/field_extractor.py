from __future__ import annotations

import re
from decimal import Decimal

from app.integrations.agents.base import ExtractionAgent, ExtractionContext
from app.integrations.extraction_types import DUMMY_PATHOLOGY_FIELDS, ExtractedFieldResult


_FIELD_PATTERN = re.compile(
    r"^(ALT|AST|Bilirubin Total|Albumin|Platelet Count|HbA1c):\s*([\d.]+)\s*([^\(]+)\(Reference:\s*([^\)]+)\)",
    re.MULTILINE,
)


class FieldExtractorAgent(ExtractionAgent):
    name = "field_extractor"

    async def run(self, context: ExtractionContext) -> ExtractionContext:
        fields: list[ExtractedFieldResult] = []
        for match in _FIELD_PATTERN.finditer(context.raw_text):
            name, value, unit, ref_range = match.groups()
            fields.append(
                ExtractedFieldResult(
                    field_name=name.strip(),
                    extracted_value=value.strip(),
                    editable_value=value.strip(),
                    unit=unit.strip(),
                    reference_range=ref_range.strip(),
                    flag="normal",
                    confidence_score=Decimal("0.9000"),
                    source_page=1,
                )
            )
        if not fields:
            fields = list(DUMMY_PATHOLOGY_FIELDS)
        context.metadata["extracted_fields"] = fields
        context.metadata["extractor"] = self.name
        return context
