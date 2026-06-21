"""Contract tests for login audit logs."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def _login(
    client: TestClient,
    identifier: str,
    password: str,
    *,
    portal: str | None = None,
) -> tuple[int, dict | None]:
    payload: dict = {"identifier": identifier, "password": password}
    if portal is not None:
        payload["portal"] = portal
    response = client.post("/api/v1/auth/login", json=payload)
    if response.status_code != 200:
        return response.status_code, None
    return response.status_code, response.json()["data"]


def _login_admin(client: TestClient) -> str:
    status, data = _login(client, "admin@livotale.com", "Admin@123")
    assert status == 200, "admin login failed"
    assert data is not None
    return data["accessToken"]


def _login_technician(client: TestClient) -> str | None:
    status, data = _login(client, "technician@livotale.com", "Tech@123")
    if status != 200:
        return None
    assert data is not None
    return data["accessToken"]


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return _login_admin(client)


def test_login_logs_returns_camel_case_shape(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/audit/login-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "data" in body
    assert isinstance(body["data"], list)
    if body["data"]:
        log = body["data"][0]
        assert "loginMethod" in log
        assert "createdAt" in log
        assert "ipAddress" in log
        assert "success" in log


def test_login_creates_login_log_row(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/audit/login-logs",
        params={"limit": 10},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    logs = response.json()["data"]
    assert any(log.get("success") is True for log in logs), "expected at least one successful login log"


def test_failed_login_creates_row(client: TestClient):
    client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@livotale.com", "password": "wrong-password-xyz"},
    )
    token = _login_admin(client)
    response = client.get(
        "/api/v1/audit/login-logs",
        params={"limit": 50, "all": "true"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.text
    logs = response.json()["data"]
    assert any(
        log.get("success") is False
        and log.get("failureReason") in {"invalid_password", "account_lockout_triggered"}
        for log in logs
    ), "expected failed login row with password-related failure reason"


def test_portal_denied_creates_row(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": "admin@livotale.com",
            "password": "Admin@123",
            "portal": "patient",
        },
    )
    assert response.status_code == 401, response.text

    token = _login_admin(client)
    logs_response = client.get(
        "/api/v1/audit/login-logs",
        params={"limit": 50, "all": "true"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logs_response.status_code == 200, logs_response.text
    logs = logs_response.json()["data"]
    assert any(
        log.get("success") is False and log.get("failureReason") == "portal_denied"
        for log in logs
    ), "expected portal_denied login log row"


def test_admin_all_users_requires_admin(client: TestClient):
    tech_token = _login_technician(client)
    if tech_token is None:
        pytest.skip("technician@livotale.com not available in test database")

    response = client.get(
        "/api/v1/audit/login-logs",
        params={"all": "true"},
        headers={"Authorization": f"Bearer {tech_token}"},
    )
    assert response.status_code == 403, response.text


def test_admin_all_users_returns_usernames(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/audit/login-logs",
        params={"all": "true", "limit": 10},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    logs = response.json()["data"]
    assert isinstance(logs, list)
    if logs:
        assert "username" in logs[0] or "fullName" in logs[0]
