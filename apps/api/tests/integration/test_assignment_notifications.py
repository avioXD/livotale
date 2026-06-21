"""Integration tests for assignment-targeted in-app notifications."""

from __future__ import annotations

import time
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import (
    auth_headers,
    confirm_scan_with_technician,
    create_order,
    login,
    patient_request_scan_slot,
    pay_offline,
)


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


@pytest.fixture
def ops_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "operations@livotale.com", "password": "Ops@123"},
    )
    if response.status_code != 200:
        pytest.skip("operations@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


@pytest.fixture
def tech_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "technician@livotale.com", "password": "Tech@123"},
    )
    if response.status_code != 200:
        pytest.skip("technician@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


def _inbox_actions(client: TestClient, token: str, *, role: str | None = None) -> list[str]:
    params = {"role": role} if role else {}
    response = client.get(
        "/api/v1/notifications/inbox",
        headers=auth_headers(token),
        params=params,
    )
    assert response.status_code == 200, response.text
    return [row.get("triggerAction") or "" for row in response.json()["data"]]


def _operations_user_id(client: TestClient, admin_token: str) -> UUID:
    response = client.get(
        "/api/v1/admin/staff/operations/users",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200, response.text
    rows = response.json()["data"]
    match = next((row for row in rows if row.get("email") == "operations@livotale.com"), rows[0] if rows else None)
    if not match:
        pytest.skip("No operations users in test database")
    return UUID(str(match["id"]))


def test_enquiry_assigned_notifies_executive(
    client: TestClient,
    admin_token: str,
    ops_token: str,
) -> None:
    suffix = int(time.time() * 1000) % 1_000_000_000
    phone = f"91{suffix:09d}"[-10:]
    enquiry = client.post(
        "/api/v1/public/enquiries",
        json={"patientName": "Assign Notify", "phone": phone},
    ).json()["data"]
    executive_id = _operations_user_id(client, admin_token)

    patch = client.patch(
        f"/api/v1/admin/enquiries/{enquiry['id']}",
        headers=auth_headers(admin_token),
        json={"assignedExecutiveId": str(executive_id)},
    )
    assert patch.status_code == 200, patch.text

    actions = _inbox_actions(client, ops_token, role="OPERATIONS")
    assert "enquiry_assigned" in actions


def test_enquiry_reassign_same_executive_is_noop(
    client: TestClient,
    admin_token: str,
    ops_token: str,
) -> None:
    suffix = int(time.time() * 1000) % 1_000_000_000
    phone = f"90{suffix:09d}"[-10:]
    enquiry = client.post(
        "/api/v1/public/enquiries",
        json={"patientName": "No Dupe Assign", "phone": phone},
    ).json()["data"]
    executive_id = _operations_user_id(client, admin_token)
    payload = {"assignedExecutiveId": str(executive_id)}

    first = client.patch(
        f"/api/v1/admin/enquiries/{enquiry['id']}",
        headers=auth_headers(admin_token),
        json=payload,
    )
    assert first.status_code == 200, first.text
    count_after_first = _inbox_actions(client, ops_token, role="OPERATIONS").count("enquiry_assigned")

    second = client.patch(
        f"/api/v1/admin/enquiries/{enquiry['id']}",
        headers=auth_headers(admin_token),
        json={"internalNotes": "still same assignee"},
    )
    assert second.status_code == 200, second.text
    third = client.patch(
        f"/api/v1/admin/enquiries/{enquiry['id']}",
        headers=auth_headers(admin_token),
        json=payload,
    )
    assert third.status_code == 200, third.text

    count_after_repeat = _inbox_actions(client, ops_token, role="OPERATIONS").count("enquiry_assigned")
    assert count_after_repeat == count_after_first


def test_order_from_enquiry_emits_converted_notification(
    client: TestClient,
    admin_token: str,
) -> None:
    order, _phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Enquiry Convert")
    order_id = order["id"]
    logs = client.get(
        "/api/v1/admin/notifications/log",
        headers=auth_headers(admin_token),
        params={"orderId": order_id, "limit": 100},
    )
    assert logs.status_code == 200, logs.text
    triggers = {
        row.get("triggerEvent")
        for row in logs.json()["data"]
        if str(row.get("orderId")) == order_id
    }
    assert "enquiry_converted" in triggers
    assert "order_created" in triggers


def test_scan_confirm_notifies_assigned_technician_user(
    client: TestClient,
    admin_token: str,
    tech_token: str,
) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Tech Assign Notify")
    order_id = order["id"]
    pay_offline(client, admin_token, order)
    patient_request_scan_slot(client, phone, order_id, admin_token)
    confirm_scan_with_technician(client, admin_token, order_id)

    actions = _inbox_actions(client, tech_token, role="TECHNICIAN")
    assert "technician_visit_assigned" in actions


def test_internal_emit_creates_user_inbox_row(
    client: TestClient,
    ops_token: str,
) -> None:
    me = client.get("/api/v1/profile", headers=auth_headers(ops_token))
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
            "context": {
                "patientName": "Bridge Patient",
                "dueDate": "2026-07-01",
                "taskType": "monthly_followup",
            },
        },
    )
    assert emit.status_code == 200, emit.text

    actions = _inbox_actions(client, ops_token, role="OPERATIONS")
    assert "care_task_assigned" in actions


def test_mark_read_rejects_foreign_notification(
    client: TestClient,
    admin_token: str,
    ops_token: str,
) -> None:
    executive_id = _operations_user_id(client, admin_token)
    emit = client.post(
        "/api/v1/internal/notifications/emit",
        headers={
            "X-Internal-Key": "livotale-internal-notifications-dev",
            "Content-Type": "application/json",
        },
        json={
            "triggerAction": "care_task_assigned",
            "targetUserIds": [str(executive_id)],
            "targetRoles": [],
            "context": {"patientName": "Foreign Read Test", "dueDate": "2026-07-02", "taskType": "monthly_followup"},
        },
    )
    assert emit.status_code == 200, emit.text

    inbox = client.get(
        "/api/v1/notifications/inbox",
        headers=auth_headers(ops_token),
        params={"role": "OPERATIONS"},
    ).json()["data"]
    target = next((row for row in inbox if row.get("triggerAction") == "care_task_assigned"), None)
    assert target is not None

    forbidden = client.patch(
        f"/api/v1/notifications/inbox/{target['id']}/read",
        headers=auth_headers(admin_token),
    )
    assert forbidden.status_code == 404, forbidden.text
