"""Patient preferred scan slot → ops confirm with technician."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import (
    auth_headers,
    confirm_scan_with_technician,
    create_order,
    login,
    patient_request_scan_slot,
    pay_offline,
)


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "admin123")


def test_patient_pref_then_ops_confirm_scan(client: TestClient, admin_token: str) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-1")
    order_id = order["id"]
    pay_offline(client, admin_token, order)

    patient_request_scan_slot(client, phone, order_id, admin_token)
    confirmed = confirm_scan_with_technician(client, admin_token, order_id)

    assert confirmed["orderStatus"] == "scan_scheduled"
    assert confirmed["technicianId"]
    assert confirmed["scanScheduledAt"]

    timeline = client.get(
        f"/api/v1/admin/orders/{order_id}/timeline",
        headers=auth_headers(admin_token),
    )
    assert timeline.status_code == 200
    event_types = [row["eventType"] for row in timeline.json()["data"]]
    assert "scan_date_requested" in event_types
    assert "scan_schedule_confirmed" in event_types


def test_public_scan_slots_endpoint(client: TestClient, admin_token: str) -> None:
    from datetime import UTC, datetime, timedelta

    scan_date = (datetime.now(UTC) + timedelta(days=1)).date().isoformat()
    response = client.get("/api/v1/public/slots/scan", params={"date": scan_date})
    assert response.status_code == 200
    rows = response.json()["data"]
    assert rows
    assert "code" in rows[0]
    assert "available" in rows[0]
