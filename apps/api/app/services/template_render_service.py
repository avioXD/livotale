from __future__ import annotations

import re
from typing import Any

from jinja2 import Environment, StrictUndefined, TemplateError

_ENV = Environment(undefined=StrictUndefined, autoescape=False)
_VAR_PATTERN = re.compile(r"\{\{(\w+)\}\}")


class TemplateRenderService:
    def render(self, template: str, context: dict[str, Any]) -> str:
        if not template:
            return ""
        try:
            return _ENV.from_string(template).render(**context)
        except TemplateError:
            return _VAR_PATTERN.sub(lambda m: str(context.get(m.group(1), "")), template)

    def extract_variables(self, *templates: str) -> list[str]:
        found: set[str] = set()
        for template in templates:
            found.update(_VAR_PATTERN.findall(template or ""))
            for match in _ENV.parse(template or "").find_all("Name"):
                if match.name:
                    found.add(match.name)
        return sorted(found)

    def sample_context(self, variables: list[str]) -> dict[str, str]:
        samples = {
            "patientName": "Raj Kumar",
            "patientPhone": "+917001638349",
            "orderNumber": "ORD-2024-001",
            "orderCode": "ORD-2024-001",
            "amount": "4999",
            "paymentLink": "https://pay.livotale.demo/link/demo",
            "packageName": "Liver Care PKG-2",
            "technicianName": "Amit Sharma",
            "doctorName": "Dr. Priya Mehta",
            "scanScheduledAt": "20 Jun 2026, 10:00 AM IST",
            "consultationScheduledAt": "22 Jun 2026, 4:00 PM IST",
            "reportNumber": "RPT-2024-001",
            "reportUrl": "https://portal.livotale.demo/reports/demo",
            "partnerLabName": "Apollo Diagnostics",
            "typeName": "Follow-up consultation",
            "scheduledAt": "21 Jun 2026, 11:00 AM IST",
            "appointmentCode": "APT-000042",
            "alertMessage": "Bank details updated by admin",
            "otpCode": "123456",
        }
        return {key: samples.get(key, f"[{key}]") for key in variables}
