"""Contract smoke tests for Operations hub tabs: orders, lab reports, appointments."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers, login


@pytest.fixture
def ops_token(client: TestClient) -> str:
    return login(client, "operations@livotale.com", "Ops@123")


def test_admin_orders_list(client: TestClient, ops_token: str):
    response = client.get("/api/v1/admin/orders", headers=auth_headers(ops_token))
    assert response.status_code == 200, response.text
    assert isinstance(response.json()["data"], list)


def test_lab_report_queue(client: TestClient, ops_token: str):
    response = client.get("/api/v1/admin/pathology/lab-report-queue", headers=auth_headers(ops_token))
    assert response.status_code == 200, response.text
    body = response.json()["data"]
    assert isinstance(body, list)
    if body:
        row = body[0]
        assert "orderId" in row
        assert "pathologyExternalAppointmentId" in row or row.get("pathologyExternalAppointmentId") is None


def test_consultations_queue(client: TestClient, ops_token: str):
    response = client.get("/api/v1/admin/consultations/queue", headers=auth_headers(ops_token))
    assert response.status_code == 200, response.text
    assert isinstance(response.json()["data"], list)


def test_operations_overview(client: TestClient, ops_token: str):
    response = client.get("/api/v1/admin/operations/overview", headers=auth_headers(ops_token))
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    for key in (
        "appointmentsToday",
        "pendingAssignments",
        "missedToday",
        "samplesPendingAssign",
        "unpaidOrders",
        "collectedToday",
    ):
        assert key in data
        assert isinstance(data[key], (int, float))


def test_admin_orders_unpaid_filter(client: TestClient, ops_token: str):
    all_response = client.get("/api/v1/admin/orders", headers=auth_headers(ops_token))
    assert all_response.status_code == 200, all_response.text
    all_orders = all_response.json()["data"]

    unpaid_response = client.get(
        "/api/v1/admin/orders",
        params={"paymentStatus": "unpaid"},
        headers=auth_headers(ops_token),
    )
    assert unpaid_response.status_code == 200, unpaid_response.text
    unpaid_orders = unpaid_response.json()["data"]
    assert all(o["paymentStatus"] != "success" for o in unpaid_orders)
    if all_orders:
        expected_unpaid = sum(1 for o in all_orders if o["paymentStatus"] != "success")
        assert len(unpaid_orders) == expected_unpaid


def test_assignable_technicians(client: TestClient, ops_token: str):
    response = client.get("/api/v1/admin/technicians/assignable", headers=auth_headers(ops_token))
    assert response.status_code == 200, response.text
    assert isinstance(response.json()["data"], list)
