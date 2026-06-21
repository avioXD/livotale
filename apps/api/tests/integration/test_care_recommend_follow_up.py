"""Integration tests for care coaching follow-up API."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers, login


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


@pytest.fixture
def doctor_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "doctor@livotale.com", "password": "Doctor@123"},
    )
    if response.status_code != 200:
        pytest.skip("doctor@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


def test_care_list_empty_for_non_care_role(client: TestClient, doctor_token: str) -> None:
    response = client.get(
        "/api/v1/care/org/appointments",
        headers=auth_headers(doctor_token),
    )
    assert response.status_code == 403, response.text


def test_care_health_coach_list_or_skip(client: TestClient) -> None:
    for identifier, password in (
        ("healthcoach@livotale.com", "Coach@123"),
        ("dietician@livotale.com", "Diet@123"),
    ):
        login_response = client.post(
            "/api/v1/auth/login",
            json={"identifier": identifier, "password": password},
        )
        if login_response.status_code != 200:
            continue
        token = login_response.json()["data"]["accessToken"]
        response = client.get(
            "/api/v1/care/org/appointments",
            headers=auth_headers(token),
        )
        if response.status_code == 403:
            pytest.skip(f"{identifier} is not a care team member in test database")
        assert response.status_code == 200, response.text
        assert isinstance(response.json()["data"], list)
        return
    pytest.skip("No health coach or dietician credentials seeded for care integration test")
