"""Integration tests for enquiry follow-up logging."""

from __future__ import annotations

import time

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


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_enquiry_follow_up_appends_log(client: TestClient, admin_token: str):
    suffix = int(time.time() * 1000) % 1_000_000_000
    phone = f"96{suffix:09d}"[-10:]

    create_response = client.post(
        "/api/v1/public/enquiries",
        json={"patientName": "Follow Up Test", "phone": phone},
    )
    assert create_response.status_code == 201, create_response.text
    enquiry_id = create_response.json()["data"]["id"]

    follow_up = client.post(
        f"/api/v1/admin/enquiries/{enquiry_id}/follow-ups",
        headers=_auth_headers(admin_token),
        json={
            "status": "contacted",
            "internalNotes": "Called patient — interested in PKG-1",
            "callRemarks": "Will call back tomorrow",
        },
    )
    assert follow_up.status_code == 200, follow_up.text
    data = follow_up.json()["data"]
    assert data["status"] == "contacted"
    assert data["followUpLogs"]
    assert any("interested" in (log.get("internalNotes") or "") for log in data["followUpLogs"])
