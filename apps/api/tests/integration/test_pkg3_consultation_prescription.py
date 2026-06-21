"""PKG-3 consultation and prescription pipeline."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import (
    auth_headers,
    complete_order,
    create_order,
    login,
    pay_offline,
    sample_rx_payload,
    setup_pkg3_prescription_ready,
)


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


@pytest.fixture
def tech_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "technician@livotale.com", "password": "Tech@123"},
    )
    if response.status_code != 200:
        pytest.skip("technician@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


@pytest.fixture
def doctor_token(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "doctor@livotale.com", "password": "Doctor@123"},
    )
    if response.status_code != 200:
        pytest.skip("doctor@livotale.com not available in test database")
    return response.json()["data"]["accessToken"]


def _save_and_publish(
    client: TestClient,
    doctor_headers: dict[str, str],
    order_id: str,
    visit_log_id: str,
    *,
    diagnosis: str = "NAFLD — lifestyle modification advised",
) -> dict:
    draft = client.put(
        f"/api/v1/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}",
        headers=doctor_headers,
        json=sample_rx_payload(diagnosis=diagnosis),
    )
    assert draft.status_code == 200, draft.text

    published = client.post(
        f"/api/v1/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}/publish",
        headers=doctor_headers,
    )
    assert published.status_code == 200, published.text
    assert published.json()["data"]["status"] == "published"
    return published.json()["data"]


def test_pkg3_consultation_prescription(
    client: TestClient,
    admin_token: str,
    tech_token: str,
    doctor_token: str,
):
    order_id, phone, visit_log_id = setup_pkg3_prescription_ready(
        client,
        admin_token,
        tech_token,
        doctor_token,
        patient_name="PKG3 Consult",
    )
    doctor_headers = auth_headers(doctor_token)
    admin_headers = auth_headers(admin_token)

    doctor_order = client.get(f"/api/v1/doctor/consultations/{order_id}/order", headers=doctor_headers)
    assert doctor_order.status_code == 200, doctor_order.text

    _save_and_publish(client, doctor_headers, order_id, visit_log_id)

    completed = complete_order(client, admin_token, order_id)
    assert completed["orderStatus"] == "completed"

    rx = client.get(
        f"/api/v1/patient-portal/orders/{order_id}/prescription",
        params={"phone": phone},
    )
    assert rx.status_code == 200, rx.text
    assert rx.json()["data"]["status"] == "published"


def test_prescription_revision_does_not_break_draft_save(
    client: TestClient,
    admin_token: str,
    tech_token: str,
    doctor_token: str,
):
    order_id, _, visit_log_id = setup_pkg3_prescription_ready(
        client,
        admin_token,
        tech_token,
        doctor_token,
        patient_name="PKG3 Revise",
    )
    doctor_headers = auth_headers(doctor_token)

    _save_and_publish(client, doctor_headers, order_id, visit_log_id)

    revised = client.post(
        f"/api/v1/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}/revise",
        headers=doctor_headers,
    )
    assert revised.status_code == 200, revised.text
    assert revised.json()["data"]["status"] == "draft"

    updated = client.put(
        f"/api/v1/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}",
        headers=doctor_headers,
        json=sample_rx_payload(diagnosis="Revised diagnosis"),
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["data"]["diagnosis"] == "Revised diagnosis"

    republished = client.post(
        f"/api/v1/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}/publish",
        headers=doctor_headers,
    )
    assert republished.status_code == 200, republished.text
    assert republished.json()["data"]["status"] == "published"


def test_pkg3_follow_up_visit_and_second_prescription(
    client: TestClient,
    admin_token: str,
    tech_token: str,
    doctor_token: str,
):
    order_id, phone, visit_log_id = setup_pkg3_prescription_ready(
        client,
        admin_token,
        tech_token,
        doctor_token,
        patient_name="PKG3 Follow Up",
    )
    doctor_headers = auth_headers(doctor_token)

    _save_and_publish(client, doctor_headers, order_id, visit_log_id)

    scheduled_at = (datetime.now(UTC) + timedelta(days=14)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    follow_up = client.post(
        f"/api/v1/doctor/consultations/{order_id}/visits/follow-up",
        headers=doctor_headers,
        json={"scheduledAt": scheduled_at},
    )
    assert follow_up.status_code == 200, follow_up.text
    follow_up_visit_id = follow_up.json()["data"]["id"]
    assert follow_up.json()["data"]["visitType"] == "follow_up"

    visits = client.get(f"/api/v1/doctor/consultations/{order_id}/visits", headers=doctor_headers)
    assert visits.status_code == 200, visits.text
    assert len(visits.json()["data"]) >= 2

    complete_visit = client.post(
        f"/api/v1/doctor/consultations/{order_id}/visits/{follow_up_visit_id}/complete",
        headers=doctor_headers,
        json={"doctorNotes": "Follow-up review completed"},
    )
    assert complete_visit.status_code == 200, complete_visit.text

    _save_and_publish(
        client,
        doctor_headers,
        order_id,
        follow_up_visit_id,
        diagnosis="Follow-up — continue current regimen",
    )

    rx = client.get(
        f"/api/v1/patient-portal/orders/{order_id}/prescription",
        params={"phone": phone},
    )
    assert rx.status_code == 200, rx.text
    assert rx.json()["data"]["diagnosis"] == "Follow-up — continue current regimen"


def test_follow_up_blocked_before_publish(
    client: TestClient,
    admin_token: str,
    tech_token: str,
    doctor_token: str,
):
    order_id, _, visit_log_id = setup_pkg3_prescription_ready(
        client,
        admin_token,
        tech_token,
        doctor_token,
        patient_name="PKG3 Follow Up Blocked",
    )
    doctor_headers = auth_headers(doctor_token)

    draft = client.put(
        f"/api/v1/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}",
        headers=doctor_headers,
        json=sample_rx_payload(),
    )
    assert draft.status_code == 200, draft.text

    scheduled_at = (datetime.now(UTC) + timedelta(days=14)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    blocked = client.post(
        f"/api/v1/doctor/consultations/{order_id}/visits/follow-up",
        headers=doctor_headers,
        json={"scheduledAt": scheduled_at},
    )
    assert blocked.status_code == 400, blocked.text


def test_publish_requires_medicines(
    client: TestClient,
    admin_token: str,
    tech_token: str,
    doctor_token: str,
):
    order_id, _, visit_log_id = setup_pkg3_prescription_ready(
        client,
        admin_token,
        tech_token,
        doctor_token,
        patient_name="PKG3 Empty Meds",
    )
    doctor_headers = auth_headers(doctor_token)

    draft = client.put(
        f"/api/v1/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}",
        headers=doctor_headers,
        json={"diagnosis": "Test", "medicines": []},
    )
    assert draft.status_code == 200, draft.text

    published = client.post(
        f"/api/v1/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}/publish",
        headers=doctor_headers,
    )
    assert published.status_code == 400, published.text


def test_prescription_api_returns_stored_doctor_fields(client: TestClient) -> None:
    from app.services.prescription_service import prescription_to_api
    from app.models.clinical import LiverCarePrescription
    from uuid import uuid4
    from datetime import UTC, datetime

    row = LiverCarePrescription(
        id=uuid4(),
        order_id=uuid4(),
        visit_log_id=uuid4(),
        patient_id=uuid4(),
        consultation_id=uuid4(),
        doctor_id=uuid4(),
        doctor_name="Dr. Ananya Sen",
        doctor_degree="DM MD",
        doctor_registration="LIV-KOL-DOC-SEED01",
        status="published",
        medicines=[{"name": "Test Med", "dosage": "1 tab", "frequency": "OD", "duration": "7 days"}],
        version=1,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    api = prescription_to_api(row)
    assert api["doctorName"] == "Dr. Ananya Sen"
    assert api["doctorDegree"] == "DM MD"
    assert api["doctorRegistration"] == "LIV-KOL-DOC-SEED01"
    assert api["medicines"][0]["form"] == "tablet"
    assert api["medicines"][0]["timing"] == "after_food"


def test_prescription_draft_uses_doctor_profile_from_database(
    client: TestClient,
    admin_token: str,
    tech_token: str,
    doctor_token: str,
):
    order_id, _, visit_log_id = setup_pkg3_prescription_ready(
        client,
        admin_token,
        tech_token,
        doctor_token,
        patient_name="PKG3 Doctor Profile",
    )
    doctor_headers = auth_headers(doctor_token)

    draft = client.put(
        f"/api/v1/doctor/orders/{order_id}/org/prescriptions/{visit_log_id}",
        headers=doctor_headers,
        json=sample_rx_payload(),
    )
    assert draft.status_code == 200, draft.text
    data = draft.json()["data"]
    assert data["doctorName"]
    assert data["doctorName"] != "Doctor"
    assert data["doctorRegistration"]
    assert data["doctorRegistration"] != "MMC-45821"
    assert data["doctorDegree"]
    assert data["doctorDegree"] != "MD, DM (Hepatology)"


def test_doctor_cannot_access_unassigned_order_context(client: TestClient, admin_token: str, doctor_token: str):
    order, _ = create_order(client, admin_token, package_code="PKG-3", patient_name="Unassigned Context")
    order_id = order["id"]
    doctor_headers = auth_headers(doctor_token)

    denied = client.get(f"/api/v1/doctor/consultations/{order_id}/context", headers=doctor_headers)
    assert denied.status_code == 403, denied.text

    admin_denied = client.get(
        f"/api/v1/admin/orders/{order_id}",
        headers=auth_headers(doctor_token),
    )
    assert admin_denied.status_code == 403, admin_denied.text


def test_doctor_cannot_save_prescription_on_unassigned_order(
    client: TestClient,
    admin_token: str,
    doctor_token: str,
):
    order, _ = create_order(client, admin_token, package_code="PKG-3", patient_name="Unassigned Rx")
    order_id = order["id"]
    pay_offline(client, admin_token, order)
    doctor_headers = auth_headers(doctor_token)
    fake_visit_id = "00000000-0000-0000-0000-000000000099"

    denied = client.put(
        f"/api/v1/doctor/orders/{order_id}/org/prescriptions/{fake_visit_id}",
        headers=doctor_headers,
        json=sample_rx_payload(),
    )
    assert denied.status_code == 403, denied.text
