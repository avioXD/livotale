"""Integration tests for patient UPI submit → ops verify/reject payment flow."""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.integration.order_flow_helpers import auth_headers, create_order, login


class _FakeS3:
    async def generate_presigned_upload(self, key: str, content_type: str, *, expires_in: int = 3600) -> str:
        return f"https://storage.test/upload/{key}"

    async def upload_file(self, file_bytes: bytes, key: str, content_type: str) -> None:
        del file_bytes, key, content_type

    def get_public_url(self, key: str) -> str:
        return f"https://storage.test/files/{key}"

    def head_object_sync(self, key: str) -> dict[str, Any] | None:
        del key
        return {"ContentLength": 1234}


@pytest.fixture(autouse=True)
def _mock_s3(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = _FakeS3()
    monkeypatch.setattr("app.services.storage_service.S3Service", lambda *args, **kwargs: fake)


def _patient_presign_receipt(client: TestClient, phone: str, order_id: str) -> str:
    presign = client.post(
        "/api/v1/patient-portal/storage/presign",
        params={"phone": phone},
        json={
            "fileName": "payment-proof.png",
            "mimeType": "image/png",
            "entityType": "payment_receipt",
            "entityId": order_id,
        },
    )
    assert presign.status_code == 200, presign.text
    file_id = presign.json()["data"]["fileId"]
    confirm = client.post(
        f"/api/v1/patient-portal/storage/{file_id}/confirm",
        params={"phone": phone},
    )
    assert confirm.status_code == 200, confirm.text
    return file_id


def _patient_upload_receipt(client: TestClient, phone: str, order_id: str) -> str:
    upload = client.post(
        "/api/v1/patient-portal/storage/upload",
        params={"phone": phone},
        files={"file": ("payment-proof.png", b"\x89PNG\r\n\x1a\n", "image/png")},
        data={"entityType": "payment_receipt", "entityId": order_id},
    )
    assert upload.status_code == 200, upload.text
    return upload.json()["data"]["fileId"]


@pytest.fixture
def admin_token(client: TestClient) -> str:
    return login(client, "admin@livotale.com", "Admin@123")


def test_patient_submit_verify_and_reject_resubmit(client: TestClient, admin_token: str):
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name="UPI Flow Patient")
    order_id = order["id"]

    config = client.get("/api/v1/patient-portal/payment-config")
    assert config.status_code == 200, config.text

    receipt_file_id = _patient_upload_receipt(client, phone, order_id)

    submitted = client.post(
        f"/api/v1/patient-portal/orders/{order_id}/pay",
        json={
            "phone": phone,
            "method": "upi",
            "receiptFileId": receipt_file_id,
            "transactionRef": "UPI123456",
        },
    )
    assert submitted.status_code == 200, submitted.text
    body = submitted.json()["data"]
    assert body["paymentStatus"] == "processing"

    scan_blocked = client.post(
        f"/api/v1/patient-portal/orders/{order_id}/scan-date",
        params={"phone": phone},
        json={
            "preferredAt": "2030-06-01T10:00:00Z",
            "visitMode": "home",
            "timeSlot": "10:00–12:00",
        },
    )
    assert scan_blocked.status_code == 400

    rejected = client.post(
        f"/api/v1/admin/orders/{order_id}/reject-payment",
        headers=auth_headers(admin_token),
        json={"remarks": "Amount mismatch"},
    )
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["data"]["paymentStatus"] == "pending"

    receipt_file_id_2 = _patient_upload_receipt(client, phone, order_id)
    resubmitted = client.post(
        f"/api/v1/patient-portal/orders/{order_id}/pay",
        json={
            "phone": phone,
            "method": "upi",
            "receiptFileId": receipt_file_id_2,
            "transactionRef": "UPI789012",
        },
    )
    assert resubmitted.status_code == 200, resubmitted.text
    assert resubmitted.json()["data"]["paymentStatus"] == "processing"

    verified = client.post(
        f"/api/v1/admin/orders/{order_id}/verify-payment",
        headers=auth_headers(admin_token),
    )
    assert verified.status_code == 200, verified.text
    verified_body = verified.json()["data"]
    assert verified_body["paymentStatus"] == "success"
    assert verified_body["orderStatus"] == "payment_completed"

    payments = client.get(
        f"/api/v1/admin/orders/{order_id}/offline-payments",
        headers=auth_headers(admin_token),
    )
    assert payments.status_code == 200, payments.text
    rows = payments.json()["data"]
    assert any(row.get("status") == "success" for row in rows)
    assert any(row.get("receiptFileId") for row in rows)
