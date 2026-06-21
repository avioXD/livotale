"""Workflow edge cases: invalid transitions, package gates, optimistic locking."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers, create_order, login, pay_offline


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


def test_pkg1_blocks_assign_lab(client: TestClient, admin_token: str):
    order, _phone = create_order(client, admin_token, package_code="PKG-1", patient_name="PKG1 Lab Block")
    pay_offline(client, admin_token, order)

    response = client.post(
        f"/api/v1/admin/orders/{order['id']}/transition",
        headers=auth_headers(admin_token),
        json={"event": "assign_lab", "meta": {"partnerLabId": "00000000-0000-4000-8000-00000000b207"}},
    )
    assert response.status_code == 400, response.text
    assert response.json()["error"] == "invalid_transition"


def test_invalid_transition_from_created(client: TestClient, admin_token: str):
    order, _phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Invalid Transition")

    response = client.post(
        f"/api/v1/admin/orders/{order['id']}/transition",
        headers=auth_headers(admin_token),
        json={"event": "complete"},
    )
    assert response.status_code == 400, response.text
    assert response.json()["error"] == "invalid_transition"


def test_stale_version_conflict(client: TestClient, admin_token: str):
    order, _phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Version Conflict")
    headers = auth_headers(admin_token)
    order_id = order["id"]

    first = client.get(f"/api/v1/admin/orders/{order_id}", headers=headers)
    assert first.status_code == 200, first.text
    version = first.json()["data"]["version"]

    pay_offline(client, admin_token, order)

    stale = client.post(
        f"/api/v1/admin/orders/{order_id}/transition",
        headers=headers,
        json={"event": "cancel", "expectedVersion": version},
    )
    assert stale.status_code == 409, stale.text
    assert stale.json()["error"] == "conflict"
