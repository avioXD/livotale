"""Integration tests for patient address upsert via demographics PATCH."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers, create_order, login, pay_offline


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


def test_demographics_upserts_patient_address(client: TestClient, admin_token: str):
    order, _phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Address Upsert Patient")
    patient_id = order["patientId"]

    detail = client.patch(
        f"/api/v1/patients/{patient_id}/demographics",
        headers=auth_headers(admin_token),
        json={
            "addressLine1": "42 Park Street",
            "addressLine2": "Near Metro",
            "pincode": "700016",
        },
    )
    assert detail.status_code == 200, detail.text
    addresses = detail.json()["data"]["addresses"]
    assert addresses, "Expected address row after upsert"
    default = addresses[0]
    assert default["line1"] == "42 Park Street"
    assert default["line2"] == "Near Metro"
    assert default["pincode"] == "700016"


def test_demographics_address_requires_line1_and_pincode(client: TestClient, admin_token: str):
    order, _phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Address Validation Patient")
    patient_id = order["patientId"]

    missing_pincode = client.patch(
        f"/api/v1/patients/{patient_id}/demographics",
        headers=auth_headers(admin_token),
        json={"addressLine1": "No pincode street"},
    )
    assert missing_pincode.status_code == 400


def test_order_includes_visit_location(client: TestClient, admin_token: str):
    order, _phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Visit Location Patient")
    order_id = order["id"]
    patient_id = order["patientId"]

    before = client.get(f"/api/v1/admin/orders/{order_id}", headers=auth_headers(admin_token))
    assert before.status_code == 200, before.text
    visit_before = before.json()["data"].get("visitLocation")
    assert visit_before is not None
    assert visit_before["isComplete"] is False

    client.patch(
        f"/api/v1/patients/{patient_id}/demographics",
        headers=auth_headers(admin_token),
        json={"addressLine1": "88 Lake Road", "pincode": "700029"},
    )

    after = client.get(f"/api/v1/admin/orders/{order_id}", headers=auth_headers(admin_token))
    assert after.status_code == 200, after.text
    visit_after = after.json()["data"]["visitLocation"]
    assert visit_after["isComplete"] is True
    assert visit_after["source"] == "patient_address"
    assert visit_after["pincode"] == "700029"


def test_confirm_scan_blocked_without_address(client: TestClient, admin_token: str):
    order, _phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Schedule Gate Patient")
    order_id = order["id"]
    pay_offline(client, admin_token, order)

    from tests.integration.order_flow_helpers import _first_available_slot

    slot = _first_available_slot(client, admin_token, order_id)
    scheduled = slot["scheduledAt"]
    techs = client.get(
        "/api/v1/admin/technicians/available-for-slot",
        headers=auth_headers(admin_token),
        params={"scheduledAt": scheduled, "orderId": order_id},
    )
    assert techs.status_code == 200, techs.text
    tech_rows = techs.json()["data"]
    assert tech_rows, "No technicians available for slot"
    tech = tech_rows[0]

    blocked = client.post(
        f"/api/v1/admin/orders/{order_id}/confirm-scan-schedule",
        headers=auth_headers(admin_token),
        json={
            "scheduledAt": scheduled,
            "visitMode": "home",
            "timeSlot": slot["label"],
            "technicianId": tech["id"],
            "technicianName": tech["name"],
        },
    )
    assert blocked.status_code == 400
    assert "address" in blocked.json()["message"].lower()
