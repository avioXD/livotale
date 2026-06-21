from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class ExtractedFieldResult:
    field_name: str
    extracted_value: str
    editable_value: str
    unit: str | None
    reference_range: str | None
    flag: str
    confidence_score: Decimal
    source_page: int


DUMMY_PATHOLOGY_FIELDS: list[ExtractedFieldResult] = [
    ExtractedFieldResult("ALT", "42", "42", "U/L", "7-56", "normal", Decimal("0.9400"), 1),
    ExtractedFieldResult("AST", "38", "38", "U/L", "10-40", "normal", Decimal("0.9100"), 1),
    ExtractedFieldResult("Bilirubin Total", "1.1", "1.1", "mg/dL", "0.1-1.2", "normal", Decimal("0.8800"), 1),
    ExtractedFieldResult("Albumin", "4.2", "4.2", "g/dL", "3.5-5.5", "normal", Decimal("0.9300"), 1),
    ExtractedFieldResult("Platelet Count", "210", "210", "10^3/µL", "150-450", "normal", Decimal("0.9000"), 2),
    ExtractedFieldResult("HbA1c", "5.8", "5.8", "%", "4.0-5.6", "high", Decimal("0.8700"), 2),
]
