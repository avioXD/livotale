"""Smoke tests for admin order action routes used by the UI."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers, create_order, login, pay_offline


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


def test_admin_order_routes_smoke(client: TestClient, admin_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Contract Smoke")
    order_id = order["id"]
    headers = auth_headers(admin_token)

    routes: list[tuple[str, str, dict | None]] = [
        ("GET", f"/api/v1/admin/orders/{order_id}", None),
        ("GET", f"/api/v1/admin/orders/{order_id}/timeline", None),
        ("GET", f"/api/v1/admin/orders/{order_id}/workflow-events", None),
        ("GET", f"/api/v1/admin/orders/{order_id}/offline-payments", None),
        ("GET", f"/api/v1/admin/orders/{order_id}/invoice", None),
        ("GET", f"/api/v1/admin/technicians/assignable", None),
        ("GET", f"/api/v1/technician/orders/{order_id}/fibrosis-scan", None),
        ("GET", f"/api/v1/technician/orders/{order_id}/visit", None),
        ("GET", f"/api/v1/admin/orders/{order_id}/final-report", None),
        ("GET", f"/api/v1/admin/orders/{order_id}/sample-dispatch", None),
        ("GET", f"/api/v1/admin/orders/{order_id}/pathology", None),
        ("GET", f"/api/v1/admin/orders/{order_id}/ai-extraction", None),
    ]

    for method, path, body in routes:
        if method == "GET":
            response = client.get(path, headers=headers)
        else:
            response = client.post(path, headers=headers, json=body or {})
        assert response.status_code == 200, f"{method} {path}: {response.text}"

    public_slots = client.get("/api/v1/public/slots/scan", params={"date": "2099-01-05"})
    assert public_slots.status_code == 200, public_slots.text

    pay_offline(client, admin_token, order)
    from datetime import UTC, datetime, timedelta

    scan_date = (datetime.now(UTC) + timedelta(days=1)).date().isoformat()
    slots = client.get(
        f"/api/v1/admin/orders/{order_id}/scan-slots",
        headers=headers,
        params={"date": scan_date},
    )
    assert slots.status_code == 200, slots.text

    portal_timeline = client.get(
        f"/api/v1/patient-portal/orders/{order_id}/timeline",
        params={"phone": phone},
    )
    assert portal_timeline.status_code == 200, portal_timeline.text

    portal_invoice = client.get(f"/api/v1/patient-portal/orders/{order_id}/invoice", params={"phone": phone})
    assert portal_invoice.status_code == 200, portal_invoice.text

    unpublished_report = client.get(
        f"/api/v1/patient-portal/orders/{order_id}/final-report",
        params={"phone": phone},
    )
    assert unpublished_report.status_code == 200, unpublished_report.text
    assert unpublished_report.json()["data"] is None
