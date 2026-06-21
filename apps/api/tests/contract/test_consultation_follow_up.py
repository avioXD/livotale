"""Contract smoke tests for consultation follow-up visit endpoints."""

from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers


@pytest.fixture
def doctor_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "doctor@livotale.com", "password": "Doctor@123"},
    )
    if response.status_code != 200:
        pytest.skip("doctor@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


def test_follow_up_visit_requires_auth(client: TestClient) -> None:
    order_id = uuid4()
    response = client.post(
        f"/api/v1/doctor/consultations/{order_id}/visits/follow-up",
        json={"scheduledAt": "2099-01-01T10:00:00Z"},
    )
    assert response.status_code in {401, 403}


def test_follow_up_visit_unknown_order(client: TestClient, doctor_token: str) -> None:
    order_id = uuid4()
    response = client.post(
        f"/api/v1/doctor/consultations/{order_id}/visits/follow-up",
        headers=auth_headers(doctor_token),
        json={"scheduledAt": "2099-01-01T10:00:00Z"},
    )
    assert response.status_code in {403, 404}, response.text
