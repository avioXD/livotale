"""Contract smoke tests for prescription endpoints."""

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


def test_prescription_endpoints_require_auth(client: TestClient) -> None:
    order_id = uuid4()
    visit_id = uuid4()
    base = f"/api/v1/doctor/orders/{order_id}"
    assert client.get(f"{base}/org/prescriptions").status_code in {401, 403}
    assert client.get(f"{base}/prescription").status_code in {401, 403}
    assert client.get(f"{base}/org/prescriptions/{visit_id}").status_code in {401, 403}
    assert client.put(f"{base}/org/prescriptions/{visit_id}", json={}).status_code in {401, 403}
    assert client.post(f"{base}/org/prescriptions/{visit_id}/publish").status_code in {401, 403}
    assert client.post(f"{base}/org/prescriptions/{visit_id}/revise").status_code in {401, 403}


def test_prescription_list_returns_envelope(client: TestClient, doctor_token: str) -> None:
    order_id = uuid4()
    response = client.get(
        f"/api/v1/doctor/orders/{order_id}/org/prescriptions",
        headers=auth_headers(doctor_token),
    )
    assert response.status_code in {200, 404}, response.text
    if response.status_code == 200:
        body = response.json()
        assert "data" in body
        assert isinstance(body["data"], list)


def test_patient_prescription_requires_phone(client: TestClient) -> None:
    order_id = uuid4()
    response = client.get(f"/api/v1/patient-portal/orders/{order_id}/prescription")
    assert response.status_code in {400, 404, 422}, response.text
