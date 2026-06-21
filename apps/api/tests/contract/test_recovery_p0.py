"""Contract tests for Phase H P0 recovery endpoints."""

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


def test_auth_sessions_returns_envelope(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/auth/sessions",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "data" in body
    assert isinstance(body["data"], list)
    if body["data"]:
        session = body["data"][0]
        assert "createdAt" in session
        assert "expiresAt" in session


def test_lab_partners_roster_not_shadowed(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/staff/lab-partners/roster",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code != 422, response.text
    assert response.status_code == 200, response.text
    assert isinstance(response.json()["data"], list)


def test_admin_audit_list(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/audit",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    assert isinstance(response.json()["data"], list)


def test_notifications_inbox(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/notifications/inbox",
        params={"role": "SUPER_ADMIN"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "data" in body


def test_notifications_inbox_merged_for_user(client: TestClient, admin_token: str):
    me = client.get(
        "/api/v1/profile",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert me.status_code == 200, me.text
    user_id = me.json()["data"]["basic"]["id"]

    emit = client.post(
        "/api/v1/internal/notifications/emit",
        headers={
            "X-Internal-Key": "livotale-internal-notifications-dev",
            "Content-Type": "application/json",
        },
        json={
            "triggerAction": "care_task_assigned",
            "targetUserIds": [user_id],
            "targetRoles": [],
            "context": {"patientName": "Merged Inbox", "dueDate": "2026-07-03", "taskType": "monthly_followup"},
        },
    )
    assert emit.status_code == 200, emit.text

    inbox = client.get(
        "/api/v1/notifications/inbox",
        params={"role": "SUPER_ADMIN"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert inbox.status_code == 200, inbox.text
    actions = [row.get("triggerAction") for row in inbox.json()["data"]]
    assert "care_task_assigned" in actions


def test_dashboard_summary(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/dashboard/summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()["data"]
    assert "enquiries" in body
    assert "orders" in body


def test_admin_enquiries_list(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/enquiries",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    assert isinstance(response.json()["data"], list)


def test_staff_doctors_users(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/staff/doctors/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    assert isinstance(response.json()["data"], list)


def test_admin_notification_log(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/notifications/log",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    assert isinstance(response.json()["data"], list)


def test_openapi_lists_recovery_routes(client: TestClient):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/admin/audit" in paths
    assert "/api/v1/admin/staff/lab-partners/roster" in paths
    assert "/api/v1/admin/notifications/log" in paths
