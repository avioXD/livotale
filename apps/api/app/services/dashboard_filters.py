from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.core.exceptions import AppError


def parse_dashboard_filters(raw: dict) -> dict:
    """Parse and validate dashboard query filters; raise AppError(422) on invalid input."""
    parsed: dict = {}
    errors: list[str] = []

    for key in ("dateFrom", "dateTo"):
        value = raw.get(key)
        if value is None or value == "":
            continue
        try:
            parsed[key] = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            errors.append(f"{key} must be a valid ISO datetime")

    for key in ("packageId", "technicianId", "doctorId", "partnerLabId"):
        value = raw.get(key)
        if value is None or value == "":
            continue
        try:
            parsed[key] = UUID(str(value))
        except ValueError:
            errors.append(f"{key} must be a valid UUID")

    for key in ("orderStatus", "paymentStatus"):
        value = raw.get(key)
        if value is not None and value != "":
            parsed[key] = str(value)

    if errors:
        raise AppError("; ".join(errors), status_code=422, error="validation_error")

    return parsed
