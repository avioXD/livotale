"""FibroScan intake API integration tests."""

from __future__ import annotations

import asyncio
import json
import os
from datetime import UTC, datetime
from uuid import UUID

import asyncpg
import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import (
    DEMO_OTP,
    auth_headers,
    create_order,
    login,
    pay_offline,
    save_operator_intake,
    schedule_scan,
)

FIBROSCAN_BODY = {
    "devicePatientCode": "DEV-FIBRO-001",
    "machinePatientName": "Fibro Intake Test",
    "machinePatientAge": 45,
    "machinePatientSex": "female",
    "machinePatientPhone": "9876543210",
}

SCAN_BODY = {
    "liverStiffnessKpa": 6.2,
    "capDbm": 250,
    "iqr": 0.8,
    "iqrMedianPercent": 12,
    "validMeasurements": 10,
    "totalMeasurements": 10,
    "successRatePercent": 100,
    "probeType": "M",
    "scanAt": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    "operatorName": "Technician User",
    "deviceSerial": "FS-TEST-001",
    "fastingStatus": True,
    "bmi": 24.5,
    "interpretation": "Mild fibrosis",
    "steatosisGrade": "S1",
    "fibrosisStage": "F1",
    "source": "manual",
}


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


def _db_dsn() -> str:
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        pytest.skip("DATABASE_URL not configured")
    return db_url.replace("postgresql+asyncpg://", "postgresql://")


async def _fetch_intake_flags(order_id: str) -> dict:
    conn = await asyncpg.connect(_db_dsn())
    try:
        row = await conn.fetchrow(
            """
            SELECT fibroscan_intake_submitted, fibroscan_intake_verified
            FROM clinical.scan_patient_intake
            WHERE order_id = $1
            """,
            UUID(order_id),
        )
        return dict(row) if row else {}
    finally:
        await conn.close()


def _prepare_field_visit(
    client: TestClient,
    admin_token: str,
    tech_token: str,
    *,
    patient_name: str = "Fibro Intake Test",
    verify_patient: bool = True,
) -> tuple[str, str]:
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name=patient_name)
    order_id = order["id"]
    pay_offline(client, admin_token, order)
    schedule_scan(client, admin_token, order_id)
    save_operator_intake(
        client,
        admin_token,
        order_id,
        phone=phone,
        patient_name=patient_name,
    )

    headers = auth_headers(tech_token)
    client.post(f"/api/v1/technician/orders/{order_id}/visit-started", headers=headers)
    client.post(f"/api/v1/technician/orders/{order_id}/reached", headers=headers)

    if verify_patient:
        client.post(f"/api/v1/technician/orders/{order_id}/patient-intake/otp", headers=headers)
        client.post(
            f"/api/v1/technician/orders/{order_id}/patient-intake/verify",
            headers=headers,
            json={
                "name": patient_name,
                "sex": "female",
                "age": 45,
                "phone": phone,
                "comorbidities": {"bloodPressure": False, "sugar": False, "thyroid": False},
                "otp": DEMO_OTP,
            },
        )

    body = {**FIBROSCAN_BODY, "machinePatientName": patient_name, "machinePatientPhone": phone}
    return order_id, phone


async def _fetch_intake_json(order_id: str) -> dict:
    conn = await asyncpg.connect(_db_dsn())
    try:
        row = await conn.fetchrow(
            """
            SELECT data
            FROM clinical.scan_patient_intake
            WHERE order_id = $1
            """,
            UUID(order_id),
        )
        if not row:
            return {}
        raw = row["data"]
        return dict(raw) if isinstance(raw, dict) else json.loads(raw)
    finally:
        await conn.close()


def test_submit_after_patient_verify_merges_order_id_without_jsonb_error(
    client: TestClient, admin_token: str, tech_token: str
) -> None:
    """Reproduces production path: GET intake adds orderId UUID, submit merges and persists."""
    order_id, phone = _prepare_field_visit(client, admin_token, tech_token, patient_name="UUID Merge Path")
    headers = auth_headers(tech_token)

    intake_get = client.get(
        f"/api/v1/technician/orders/{order_id}/patient-intake",
        headers=headers,
    )
    assert intake_get.status_code == 200, intake_get.text
    assert intake_get.json()["data"]["orderId"] == order_id
    assert intake_get.json()["data"]["technicianVerifiedAt"]

    response = client.post(
        f"/api/v1/technician/orders/{order_id}/fibroscan-intake",
        headers=headers,
        json={
            **FIBROSCAN_BODY,
            "machinePatientName": "UUID Merge Path",
            "machinePatientPhone": phone,
        },
    )
    assert response.status_code == 200, response.text

    stored = asyncio.run(_fetch_intake_json(order_id))
    assert "orderId" not in stored
    assert stored["devicePatientCode"] == FIBROSCAN_BODY["devicePatientCode"]
    assert stored["fibroscanOperatorVerificationStatus"] == "pending"


def test_submit_requires_patient_intake_verify(
    client: TestClient, admin_token: str, tech_token: str
) -> None:
    order_id, phone = _prepare_field_visit(
        client, admin_token, tech_token, verify_patient=False
    )
    headers = auth_headers(tech_token)
    body = {**FIBROSCAN_BODY, "machinePatientPhone": phone}

    response = client.post(
        f"/api/v1/technician/orders/{order_id}/fibroscan-intake",
        headers=headers,
        json=body,
    )
    assert response.status_code == 400, response.text
    assert "patient details intake" in response.json()["message"].lower()


def test_submit_success_sets_flags(client: TestClient, admin_token: str, tech_token: str) -> None:
    order_id, phone = _prepare_field_visit(client, admin_token, tech_token)
    headers = auth_headers(tech_token)
    body = {**FIBROSCAN_BODY, "machinePatientPhone": phone}

    response = client.post(
        f"/api/v1/technician/orders/{order_id}/fibroscan-intake",
        headers=headers,
        json=body,
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["fibroscanIntakeSubmittedAt"]
    assert data["fibroscanOperatorVerificationStatus"] == "pending"

    flags = asyncio.run(_fetch_intake_flags(order_id))
    assert flags["fibroscan_intake_submitted"] is True
    assert flags["fibroscan_intake_verified"] is False


def test_ops_verify_approve(client: TestClient, admin_token: str, tech_token: str) -> None:
    order_id, phone = _prepare_field_visit(client, admin_token, tech_token)
    tech_headers = auth_headers(tech_token)
    admin_headers = auth_headers(admin_token)

    submit = client.post(
        f"/api/v1/technician/orders/{order_id}/fibroscan-intake",
        headers=tech_headers,
        json={**FIBROSCAN_BODY, "machinePatientPhone": phone},
    )
    assert submit.status_code == 200, submit.text

    verify = client.patch(
        f"/api/v1/admin/orders/{order_id}/fibroscan-intake/verify",
        headers=admin_headers,
        json={"status": "approved", "notes": "Device code matches"},
    )
    assert verify.status_code == 200, verify.text
    data = verify.json()["data"]
    assert data["fibroscanOperatorVerificationStatus"] == "approved"
    assert data["fibroscanOperatorNotes"] == "Device code matches"

    flags = asyncio.run(_fetch_intake_flags(order_id))
    assert flags["fibroscan_intake_verified"] is True

    timeline = client.get(
        f"/api/v1/admin/orders/{order_id}/timeline",
        headers=admin_headers,
    )
    assert timeline.status_code == 200
    event_types = [row["eventType"] for row in timeline.json()["data"]]
    assert "fibroscan_intake_approved" in event_types


def test_ops_verify_reject_and_resubmit(
    client: TestClient, admin_token: str, tech_token: str
) -> None:
    order_id, phone = _prepare_field_visit(client, admin_token, tech_token)
    tech_headers = auth_headers(tech_token)
    admin_headers = auth_headers(admin_token)
    body = {**FIBROSCAN_BODY, "machinePatientPhone": phone}

    client.post(
        f"/api/v1/technician/orders/{order_id}/fibroscan-intake",
        headers=tech_headers,
        json=body,
    )
    reject = client.patch(
        f"/api/v1/admin/orders/{order_id}/fibroscan-intake/verify",
        headers=admin_headers,
        json={"status": "rejected", "notes": "Wrong device code"},
    )
    assert reject.status_code == 200, reject.text
    assert reject.json()["data"]["fibroscanOperatorVerificationStatus"] == "rejected"

    resubmit = client.post(
        f"/api/v1/technician/orders/{order_id}/fibroscan-intake",
        headers=tech_headers,
        json={**body, "devicePatientCode": "DEV-FIBRO-002"},
    )
    assert resubmit.status_code == 200, resubmit.text
    assert resubmit.json()["data"]["fibroscanOperatorVerificationStatus"] == "pending"
    assert resubmit.json()["data"]["devicePatientCode"] == "DEV-FIBRO-002"


def test_ops_verify_without_submitted_intake(client: TestClient, admin_token: str) -> None:
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="No Fibro Submit")
    order_id = order["id"]
    pay_offline(client, admin_token, order)
    save_operator_intake(client, admin_token, order_id, phone=phone, patient_name="No Fibro Submit")

    response = client.patch(
        f"/api/v1/admin/orders/{order_id}/fibroscan-intake/verify",
        headers=auth_headers(admin_token),
        json={"status": "approved", "notes": "Should fail"},
    )
    assert response.status_code == 400, response.text


def test_save_scan_requires_fibroscan_intake(
    client: TestClient, admin_token: str, tech_token: str
) -> None:
    order_id, phone = _prepare_field_visit(
        client, admin_token, tech_token, verify_patient=False
    )
    headers = auth_headers(tech_token)

    response = client.post(
        f"/api/v1/technician/orders/{order_id}/fibrosis-scan",
        headers=headers,
        json=SCAN_BODY,
    )
    assert response.status_code == 400, response.text
    assert "fibroscan intake" in response.json()["message"].lower()
