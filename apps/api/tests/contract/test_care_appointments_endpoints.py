"""Contract smoke tests for care coaching appointment endpoints."""

from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers, login


@pytest.fixture
def doctor_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "doctor@livotale.com", "password": "Doctor@123"},
    )
    if response.status_code != 200:
        pytest.skip("doctor@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


def test_care_appointments_require_auth(client: TestClient) -> None:
    appointment_id = uuid4()
    assert client.get("/api/v1/care/org/appointments").status_code in {401, 403}
    assert client.get(f"/api/v1/care/org/appointments/{appointment_id}").status_code in {401, 403}
    assert client.post(f"/api/v1/care/org/appointments/{appointment_id}/notes", json={"note": "x"}).status_code in {
        401,
        403,
    }
    assert client.post(
        f"/api/v1/care/org/appointments/{appointment_id}/recommend-follow-up",
        json={"reason": "Needs follow-up"},
    ).status_code in {401, 403}


def test_care_appointments_reject_doctor_role(client: TestClient, doctor_token: str) -> None:
    response = client.get(
        "/api/v1/care/org/appointments",
        headers=auth_headers(doctor_token),
    )
    assert response.status_code == 403, response.text


def test_care_appointments_admin_rejected(client: TestClient) -> None:
    admin_token = login(client, "admin@livotale.com", "Admin@123")
    response = client.get(
        "/api/v1/care/org/appointments",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 403, response.text
