"""Integration tests for enquiry thread model."""

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


def test_duplicate_phone_creates_new_thread(client: TestClient, admin_token: str):
    suffix = int(time.time() * 1000) % 1_000_000_000
    phone = f"95{suffix:09d}"[-10:]

    first = client.post(
        "/api/v1/public/enquiries",
        json={"patientName": "Thread Test", "phone": phone, "message": "First thread"},
    )
    assert first.status_code == 201, first.text
    first_data = first.json()["data"]
    thread_id = first_data["threadId"]

    second = client.post(
        "/api/v1/admin/enquiries",
        headers=_auth_headers(admin_token),
        json={
            "source": "whatsapp",
            "patientName": "Thread Test",
            "phone": phone,
            "message": "Second thread via CRM",
        },
    )
    assert second.status_code == 200, second.text
    second_data = second.json()["data"]
    assert second_data["threadId"] == thread_id
    assert second_data["threadSequence"] == 2

    thread_response = client.get(
        f"/api/v1/admin/enquiries/threads/{thread_id}",
        headers=_auth_headers(admin_token),
    )
    assert thread_response.status_code == 200, thread_response.text
    rows = thread_response.json()["data"]
    assert len(rows) >= 2


def test_new_thread_endpoint(client: TestClient, admin_token: str):
    suffix = int(time.time() * 1000) % 1_000_000_000
    phone = f"94{suffix:09d}"[-10:]

    create = client.post(
        "/api/v1/public/enquiries",
        json={"patientName": "Return Lead", "phone": phone},
    )
    assert create.status_code == 201, create.text
    enquiry_id = create.json()["data"]["id"]

    client.patch(
        f"/api/v1/admin/enquiries/{enquiry_id}",
        headers=_auth_headers(admin_token),
        json={"status": "converted"},
    )

    new_thread = client.post(
        f"/api/v1/admin/enquiries/{enquiry_id}/new-thread",
        headers=_auth_headers(admin_token),
        json={"message": "Patient called again"},
    )
    assert new_thread.status_code == 200, new_thread.text
    data = new_thread.json()["data"]
    assert data["threadSequence"] >= 2
    assert data["status"] == "new"
