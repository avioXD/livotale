"""Unit tests for scan patient intake JSONB serialization helpers."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from app.services.order_helpers import intake_json_storage, json_safe_value


def test_json_safe_value_handles_nested_types() -> None:
    order_id = uuid4()
    payload = {
        "orderId": order_id,
        "weightKg": Decimal("72.5"),
        "technicianVerifiedAt": datetime(2026, 6, 20, 10, 0, tzinfo=UTC),
        "comorbidities": {"bloodPressure": True, "sugar": False, "thyroid": False},
        "tags": [UUID("00000000-0000-0000-0000-000000000001")],
    }
    safe = json_safe_value(payload)
    json.dumps(safe)
    assert safe["orderId"] == str(order_id)
    assert safe["weightKg"] == 72.5
    assert safe["tags"] == ["00000000-0000-0000-0000-000000000001"]


def test_intake_json_storage_strips_order_id() -> None:
    order_id = uuid4()
    stored = intake_json_storage(
        {
            "orderId": order_id,
            "name": "Patient",
            "operatorEnteredBy": uuid4(),
        }
    )
    assert "orderId" not in stored
    assert stored["name"] == "Patient"
    assert isinstance(stored["operatorEnteredBy"], str)
    json.dumps(stored)
