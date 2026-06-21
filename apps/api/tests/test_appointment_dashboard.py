"""Appointment dashboard and analytics contract tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def _login_admin(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@livotale.com", "password": "Admin@123"},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]["accessToken"]


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return _login_admin(client)


def test_appointments_dashboard(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/appointments/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()["data"]
    assert "kpis" in body
    assert "upcoming" in body
    assert isinstance(body["upcoming"], list)


def test_appointment_analytics(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/analytics/org/appointments",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()["data"]
    assert "byType" in body
    assert "byStatus" in body
    assert "dailyVolume" in body
    assert "completionRate" in body


def test_sample_analytics_invalid_period_422(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/sample-collections/analytics",
        params={"period": "invalid"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422, response.text


def test_staff_dashboard_unknown_slug_404(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/staff/not-a-role/org/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404, response.text
