"""Integration tests for FibroScan report proof upload (presign → confirm → attach)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

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


def _prepare_scan_ready_order(
    client: TestClient,
    admin_token: str,
    tech_token: str,
    *,
    patient_name: str = "Scan Upload Test",
) -> tuple[str, str]:
    order, phone = create_order(client, admin_token, package_code="PKG-1", patient_name=patient_name)
    order_id = order["id"]
    pay_offline(client, admin_token, order)
    schedule_scan(client, admin_token, order_id)
    save_operator_intake(client, admin_token, order_id, phone=phone, patient_name=patient_name)

    headers = auth_headers(tech_token)
    client.post(f"/api/v1/technician/orders/{order_id}/visit-started", headers=headers)
    client.post(f"/api/v1/technician/orders/{order_id}/reached", headers=headers)
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
    fibro = client.post(
        f"/api/v1/technician/orders/{order_id}/fibroscan-intake",
        headers=headers,
        json={
            "devicePatientCode": "DEV-UPLOAD-001",
            "machinePatientName": patient_name,
            "machinePatientAge": 45,
            "machinePatientSex": "female",
            "machinePatientPhone": phone,
        },
    )
    assert fibro.status_code == 200, fibro.text
    return order_id, phone


def _presign_and_confirm(
    client: TestClient,
    tech_token: str,
    order_id: str,
    *,
    file_name: str = "fibroscan-report.pdf",
) -> dict[str, Any]:
    headers = auth_headers(tech_token)
    presign = client.post(
        "/api/v1/storage/presign",
        headers=headers,
        json={
            "fileName": file_name,
            "mimeType": "application/pdf",
            "entityType": "fibroscan_report",
            "entityId": order_id,
        },
    )
    assert presign.status_code == 200, presign.text
    data = presign.json()["data"]
    file_id = data["fileId"]

    confirm = client.post(f"/api/v1/storage/{file_id}/confirm", headers=headers)
    assert confirm.status_code == 200, confirm.text
    confirmed = confirm.json()["data"]
    return {"fileId": str(confirmed["fileId"]), "storageUrl": confirmed["storageUrl"]}


def test_full_upload_chain_presign_confirm_attach(
    client: TestClient, admin_token: str, tech_token: str
) -> None:
    order_id, _phone = _prepare_scan_ready_order(client, admin_token, tech_token)
    headers = auth_headers(tech_token)

    uploaded = _presign_and_confirm(client, tech_token, order_id)

    save = client.post(
        f"/api/v1/technician/orders/{order_id}/fibrosis-scan",
        headers=headers,
        json=SCAN_BODY,
    )
    assert save.status_code == 200, save.text

    attach = client.post(
        f"/api/v1/technician/orders/{order_id}/fibrosis-scan/attach",
        headers=headers,
        json={
            "fileName": "fibroscan-report.pdf",
            "fileType": "application/pdf",
            "fileId": uploaded["fileId"],
            "storageUrl": uploaded["storageUrl"],
            "scanReportDocumentType": "scanner_pdf",
        },
    )
    assert attach.status_code == 200, attach.text
    attach_data = attach.json()["data"]
    assert attach_data["scanFileUrl"]
    assert attach_data["scanReportDocumentType"] == "scanner_pdf"
    assert attach_data["source"] in ("upload", "manual")

    scan_get = client.get(f"/api/v1/technician/orders/{order_id}/fibrosis-scan", headers=headers)
    assert scan_get.status_code == 200, scan_get.text
    scan_data = scan_get.json()["data"]
    assert scan_data["scanFileUrl"] == attach_data["scanFileUrl"]


def test_attach_before_save_scan_rejected(client: TestClient, admin_token: str, tech_token: str) -> None:
    order_id, _phone = _prepare_scan_ready_order(client, admin_token, tech_token)
    headers = auth_headers(tech_token)
    uploaded = _presign_and_confirm(client, tech_token, order_id)

    attach = client.post(
        f"/api/v1/technician/orders/{order_id}/fibrosis-scan/attach",
        headers=headers,
        json={
            "fileName": "fibroscan-report.pdf",
            "storageUrl": uploaded["storageUrl"],
            "scanReportDocumentType": "report_photo",
        },
    )
    assert attach.status_code == 400, attach.text
    assert "save scan" in attach.json()["message"].lower()


def test_attach_missing_storage_url_rejected(
    client: TestClient, admin_token: str, tech_token: str
) -> None:
    order_id, _phone = _prepare_scan_ready_order(client, admin_token, tech_token)
    headers = auth_headers(tech_token)

    save = client.post(
        f"/api/v1/technician/orders/{order_id}/fibrosis-scan",
        headers=headers,
        json=SCAN_BODY,
    )
    assert save.status_code == 200, save.text

    attach = client.post(
        f"/api/v1/technician/orders/{order_id}/fibrosis-scan/attach",
        headers=headers,
        json={
            "fileName": "fibroscan-report.pdf",
            "scanReportDocumentType": "scanner_pdf",
        },
    )
    assert attach.status_code == 400, attach.text
    assert "storageurl" in attach.json()["message"].lower()


def test_confirm_fails_when_s3_object_missing(
    client: TestClient, admin_token: str, tech_token: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    order_id, _phone = _prepare_scan_ready_order(client, admin_token, tech_token)
    headers = auth_headers(tech_token)

    presign = client.post(
        "/api/v1/storage/presign",
        headers=headers,
        json={
            "fileName": "missing.pdf",
            "mimeType": "application/pdf",
            "entityType": "fibroscan_report",
            "entityId": order_id,
        },
    )
    assert presign.status_code == 200, presign.text
    file_id = presign.json()["data"]["fileId"]

    class _MissingS3(_FakeS3):
        def head_object_sync(self, key: str) -> dict[str, Any] | None:
            del key
            return None

    monkeypatch.setattr("app.services.storage_service.S3Service", lambda *a, **k: _MissingS3())

    confirm = client.post(f"/api/v1/storage/{file_id}/confirm", headers=headers)
    assert confirm.status_code == 400, confirm.text
    assert "not found" in confirm.json()["message"].lower()


def test_attach_file_multipart_upload(
    client: TestClient, admin_token: str, tech_token: str
) -> None:
    order_id, _phone = _prepare_scan_ready_order(client, admin_token, tech_token)
    headers = auth_headers(tech_token)

    save = client.post(
        f"/api/v1/technician/orders/{order_id}/fibrosis-scan",
        headers=headers,
        json=SCAN_BODY,
    )
    assert save.status_code == 200, save.text

    pdf_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\nxref\n0 3\ntrailer<</Size 3/Root 1 0 R>>\n%%EOF"
    attach = client.post(
        f"/api/v1/technician/orders/{order_id}/fibrosis-scan/attach-file",
        headers=headers,
        files={"file": ("fibroscan-report.pdf", pdf_bytes, "application/pdf")},
        data={"scanReportDocumentType": "scanner_pdf"},
    )
    assert attach.status_code == 200, attach.text
    attach_data = attach.json()["data"]
    assert attach_data["scanFileUrl"]
    assert attach_data["scanReportDocumentType"] == "scanner_pdf"
