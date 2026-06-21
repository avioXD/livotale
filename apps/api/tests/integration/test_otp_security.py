"""OTP challenge security integration tests (demo mode, table-backed validation)."""

from __future__ import annotations

import asyncio
import os
import time

import asyncpg
import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_token
from app.services.otp_challenge_service import (
    DEMO_OTP_CODE,
    PURPOSE_PATIENT_PORTAL,
    PURPOSE_TECHNICIAN_COMPLETION,
    PURPOSE_TECHNICIAN_INTAKE,
)
from tests.integration.order_flow_helpers import (
    DEMO_OTP,
    assign_first_technician,
    auth_headers,
    create_order,
    login,
    pay_offline,
    save_operator_intake,
    schedule_scan,
)


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


@pytest.fixture
def live_otp_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    """Rate limits apply only when otp_mode is live; tests opt in explicitly."""
    from app.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "otp_mode", "live")


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


def _normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    return digits[-10:] if len(digits) >= 10 else digits


async def _fetch_latest_challenge(mobile: str, purpose: str) -> dict | None:
    conn = await asyncpg.connect(_db_dsn())
    try:
        row = await conn.fetchrow(
            """
            SELECT id, otp_hash, attempts, max_attempts, expires_at, consumed_at
            FROM identity.otp_challenges
            WHERE mobile = $1 AND purpose = $2
            ORDER BY created_at DESC
            LIMIT 1
            """,
            mobile,
            purpose,
        )
        return dict(row) if row else None
    finally:
        await conn.close()


async def _backdate_challenge_expiry(challenge_id: str) -> None:
    conn = await asyncpg.connect(_db_dsn())
    try:
        await conn.execute(
            """
            UPDATE identity.otp_challenges
            SET expires_at = now() - interval '1 minute'
            WHERE id = $1::uuid
            """,
            challenge_id,
        )
    finally:
        await conn.close()


def test_patient_send_creates_challenge_row(client: TestClient, admin_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="OTP Row Test")
    pay_offline(client, admin_token, order)

    response = client.post("/api/v1/patient-portal/otp/send", json={"phone": phone})
    assert response.status_code == 200, response.text
    body = response.json()["data"]
    assert body["sent"] is True
    assert body.get("retryAfterSeconds") == 0
    assert body.get("demoOtp") == DEMO_OTP_CODE

    normalized = _normalize_phone(phone)
    row = asyncio.run(_fetch_latest_challenge(normalized, PURPOSE_PATIENT_PORTAL))
    assert row is not None
    assert row["otp_hash"] == hash_token(DEMO_OTP_CODE)
    assert row["consumed_at"] is None


def test_patient_verify_correct_otp_succeeds(client: TestClient, admin_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="OTP Verify OK")
    pay_offline(client, admin_token, order)

    send = client.post("/api/v1/patient-portal/otp/send", json={"phone": phone})
    assert send.status_code == 200, send.text

    verify = client.post(
        "/api/v1/patient-portal/otp/verify",
        json={"phone": phone, "otp": DEMO_OTP},
    )
    assert verify.status_code == 200, verify.text
    assert verify.json()["data"]["patientName"]

    normalized = _normalize_phone(phone)
    row = asyncio.run(_fetch_latest_challenge(normalized, PURPOSE_PATIENT_PORTAL))
    assert row is not None
    assert row["consumed_at"] is not None


def test_patient_verify_wrong_otp_increments_attempts(client: TestClient, admin_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="OTP Wrong")
    pay_offline(client, admin_token, order)
    client.post("/api/v1/patient-portal/otp/send", json={"phone": phone})

    response = client.post(
        "/api/v1/patient-portal/otp/verify",
        json={"phone": phone, "otp": "000000"},
    )
    assert response.status_code == 401, response.text

    normalized = _normalize_phone(phone)
    row = asyncio.run(_fetch_latest_challenge(normalized, PURPOSE_PATIENT_PORTAL))
    assert row is not None
    assert row["attempts"] == 1


def test_patient_verify_max_attempts_blocked(client: TestClient, admin_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="OTP Max Attempts")
    pay_offline(client, admin_token, order)
    client.post("/api/v1/patient-portal/otp/send", json={"phone": phone})

    for _ in range(5):
        client.post(
            "/api/v1/patient-portal/otp/verify",
            json={"phone": phone, "otp": "000000"},
        )

    blocked = client.post(
        "/api/v1/patient-portal/otp/verify",
        json={"phone": phone, "otp": DEMO_OTP},
    )
    assert blocked.status_code == 401, blocked.text
    assert "Too many OTP attempts" in blocked.json()["message"]


def test_patient_verify_expired_challenge(client: TestClient, admin_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="OTP Expired")
    pay_offline(client, admin_token, order)
    client.post("/api/v1/patient-portal/otp/send", json={"phone": phone})

    normalized = _normalize_phone(phone)
    row = asyncio.run(_fetch_latest_challenge(normalized, PURPOSE_PATIENT_PORTAL))
    assert row is not None
    asyncio.run(_backdate_challenge_expiry(str(row["id"])))

    expired = client.post(
        "/api/v1/patient-portal/otp/verify",
        json={"phone": phone, "otp": DEMO_OTP},
    )
    assert expired.status_code == 401, expired.text
    assert "expired" in expired.json()["message"].lower()


def test_patient_send_cooldown_429(client: TestClient, admin_token: str, live_otp_mode: None):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="OTP Cooldown")
    pay_offline(client, admin_token, order)

    first = client.post("/api/v1/patient-portal/otp/send", json={"phone": phone})
    assert first.status_code == 200, first.text

    second = client.post("/api/v1/patient-portal/otp/send", json={"phone": phone})
    assert second.status_code == 429, second.text
    assert second.json().get("retryAfterSeconds")


def test_patient_send_rate_limit_429(client: TestClient, admin_token: str, live_otp_mode: None):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="OTP Rate Limit")
    pay_offline(client, admin_token, order)

    for index in range(3):
        if index > 0:
            time.sleep(61)
        response = client.post("/api/v1/patient-portal/otp/send", json={"phone": phone})
        assert response.status_code == 200, response.text

    time.sleep(61)
    blocked = client.post("/api/v1/patient-portal/otp/send", json={"phone": phone})
    assert blocked.status_code == 429, blocked.text


def test_technician_intake_otp_table_flow(
    client: TestClient, admin_token: str, tech_token: str
):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Tech OTP Intake")
    order_id = order["id"]
    headers = auth_headers(tech_token)

    pay_offline(client, admin_token, order)
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)
    save_operator_intake(client, admin_token, order_id, phone=phone, patient_name="Tech OTP Intake")

    client.post(f"/api/v1/technician/orders/{order_id}/visit-started", headers=headers)
    client.post(f"/api/v1/technician/orders/{order_id}/reached", headers=headers)

    send = client.post(f"/api/v1/technician/orders/{order_id}/patient-intake/otp", headers=headers)
    assert send.status_code == 200, send.text
    assert send.json()["data"].get("demoOtp") == DEMO_OTP_CODE

    normalized = _normalize_phone(phone)
    row = asyncio.run(_fetch_latest_challenge(normalized, PURPOSE_TECHNICIAN_INTAKE))
    assert row is not None

    verify = client.post(
        f"/api/v1/technician/orders/{order_id}/patient-intake/verify",
        headers=headers,
        json={
            "name": "Tech OTP Intake",
            "sex": "female",
            "age": 45,
            "phone": phone,
            "comorbidities": {"bloodPressure": False, "sugar": False, "thyroid": False},
            "otp": DEMO_OTP,
        },
    )
    assert verify.status_code == 200, verify.text
    assert verify.json()["data"]["phoneOtpVerified"] is True


def test_technician_completion_wrong_otp(
    client: TestClient, admin_token: str, tech_token: str
):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="Tech OTP Complete")
    order_id = order["id"]
    headers = auth_headers(tech_token)

    pay_offline(client, admin_token, order)
    assign_first_technician(client, admin_token, order_id)
    schedule_scan(client, admin_token, order_id)
    save_operator_intake(client, admin_token, order_id, phone=phone, patient_name="Tech OTP Complete")

    client.post(f"/api/v1/technician/orders/{order_id}/visit-started", headers=headers)
    client.post(f"/api/v1/technician/orders/{order_id}/reached", headers=headers)
    client.post(f"/api/v1/technician/orders/{order_id}/patient-intake/otp", headers=headers)
    client.post(
        f"/api/v1/technician/orders/{order_id}/patient-intake/verify",
        headers=headers,
        json={
            "name": "Tech OTP Complete",
            "sex": "female",
            "age": 45,
            "phone": phone,
            "comorbidities": {"bloodPressure": False, "sugar": False, "thyroid": False},
            "otp": DEMO_OTP,
        },
    )
    client.post(
        f"/api/v1/technician/orders/{order_id}/fibroscan-intake",
        headers=headers,
        json={
            "devicePatientCode": "DEV-OTP",
            "machinePatientName": "Tech OTP Complete",
            "machinePatientAge": 45,
            "machinePatientSex": "female",
            "machinePatientPhone": phone,
        },
    )
    client.post(
        f"/api/v1/technician/orders/{order_id}/fibrosis-scan",
        headers=headers,
        json={
            "liverStiffnessKpa": 6.2,
            "capDbm": 250,
            "iqr": 0.8,
            "iqrMedianPercent": 12,
            "validMeasurements": 10,
            "totalMeasurements": 10,
            "successRatePercent": 100,
            "probeType": "M",
            "operatorName": "Tech",
            "fastingStatus": True,
            "bmi": 24,
            "interpretation": "Normal",
            "steatosisGrade": "S0",
            "fibrosisStage": "F0",
            "source": "manual",
        },
    )
    client.post(
        f"/api/v1/technician/orders/{order_id}/fibrosis-scan/attach",
        headers=headers,
        json={
            "fileId": "test-scan-file",
            "fileName": "scan.pdf",
            "storageUrl": f"https://storage.test/fibroscan/{order_id}.pdf",
            "scanReportDocumentType": "scanner_pdf",
        },
    )
    client.post(f"/api/v1/technician/orders/{order_id}/visit-completion-otp", headers=headers)

    normalized = _normalize_phone(phone)
    row = asyncio.run(_fetch_latest_challenge(normalized, PURPOSE_TECHNICIAN_COMPLETION))
    assert row is not None

    wrong = client.post(
        f"/api/v1/technician/orders/{order_id}/complete",
        headers=headers,
        json={"otp": "000000"},
    )
    assert wrong.status_code == 400, wrong.text
    assert "Invalid OTP" in wrong.json()["message"]
