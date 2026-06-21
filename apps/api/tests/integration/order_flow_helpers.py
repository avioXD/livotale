"""Shared helpers for order workflow integration tests."""

from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi.testclient import TestClient

MINIMAL_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\n"
    b"xref\n0 4\n0000000000 65535 f \n"
    b"trailer<</Size 4/Root 1 0 R>>\n"
    b"startxref\n9\n%%EOF"
)

DEMO_OTP = "123456"


def login(client: TestClient, identifier: str, password: str) -> str:
    response = client.post("/api/v1/auth/login", json={"identifier": identifier, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["data"]["accessToken"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def unique_phone() -> str:
    suffix = int(time.time() * 1000) % 1_000_000_000
    return f"98{suffix:09d}"[-10:]


def get_package(client: TestClient, admin_token: str, code: str) -> dict[str, Any] | None:
    packages = client.get("/api/v1/admin/packages", headers=auth_headers(admin_token)).json()["data"]
    return next((row for row in packages if row.get("code") == code), None)


def create_order(
    client: TestClient,
    admin_token: str,
    *,
    package_code: str,
    patient_name: str = "Workflow Test Patient",
) -> tuple[dict[str, Any], str]:
    pkg = get_package(client, admin_token, package_code)
    if pkg is None:
        raise RuntimeError(f"{package_code} not seeded")

    phone = unique_phone()
    enquiry = client.post(
        "/api/v1/public/enquiries",
        json={"patientName": patient_name, "phone": phone},
    ).json()["data"]

    order_response = client.post(
        "/api/v1/admin/orders",
        headers=auth_headers(admin_token),
        json={
            "patientName": patient_name,
            "patientPhone": phone,
            "enquiryId": enquiry["id"],
            "packageId": pkg["id"],
        },
    )
    assert order_response.status_code == 200, order_response.text
    return order_response.json()["data"], phone


def pay_offline(client: TestClient, admin_token: str, order: dict[str, Any]) -> dict[str, Any]:
    response = client.post(
        f"/api/v1/admin/orders/{order['id']}/offline-payment",
        headers=auth_headers(admin_token),
        json={
            "method": "cash",
            "amount": order["finalAmount"],
            "collectedBy": "Integration Test",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


def assign_first_technician(client: TestClient, admin_token: str, order_id: str) -> None:
    """Deprecated: technician assignment is bundled into schedule_scan via confirm-scan-schedule."""
    del client, admin_token, order_id


def _first_available_slot(client: TestClient, admin_token: str, order_id: str) -> dict[str, Any]:
    for offset in range(1, 61):
        scan_date = (datetime.now(UTC) + timedelta(days=offset)).date().isoformat()
        slots = client.get(
            f"/api/v1/admin/orders/{order_id}/scan-slots",
            headers=auth_headers(admin_token),
            params={"date": scan_date},
        )
        assert slots.status_code == 200, slots.text
        rows = slots.json()["data"]
        available = next((row for row in rows if row.get("available")), None)
        if available:
            return available
    raise AssertionError("No available scan slots in the next 60 days")


def patient_request_scan_slot(
    client: TestClient,
    phone: str,
    order_id: str,
    admin_token: str,
    *,
    date: str | None = None,
) -> dict[str, Any]:
    scan_date = date or (datetime.now(UTC) + timedelta(days=1)).date().isoformat()
    slot = _first_available_slot(client, admin_token, order_id)
    preferred_at = slot["scheduledAt"]
    response = client.post(
        f"/api/v1/patient-portal/orders/{order_id}/scan-date",
        params={"phone": phone},
        json={
            "preferredAt": preferred_at,
            "visitMode": "home",
            "timeSlot": slot["label"],
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


def confirm_scan_with_technician(
    client: TestClient,
    admin_token: str,
    order_id: str,
    *,
    scheduled_at: str | None = None,
    time_slot: str | None = None,
) -> dict[str, Any]:
    slot = _first_available_slot(client, admin_token, order_id)
    scheduled = scheduled_at or slot["scheduledAt"]
    label = time_slot or slot["label"]
    techs = client.get(
        "/api/v1/admin/technicians/available-for-slot",
        headers=auth_headers(admin_token),
        params={"scheduledAt": scheduled, "orderId": order_id},
    )
    assert techs.status_code == 200, techs.text
    tech_rows = techs.json()["data"]
    assert tech_rows, "No technicians available for slot"
    tech = tech_rows[0]
    response = client.post(
        f"/api/v1/admin/orders/{order_id}/confirm-scan-schedule",
        headers=auth_headers(admin_token),
        json={
            "scheduledAt": scheduled,
            "visitMode": "home",
            "timeSlot": label,
            "technicianId": tech["id"],
            "technicianName": tech["name"],
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


def schedule_scan(client: TestClient, admin_token: str, order_id: str) -> None:
    confirm_scan_with_technician(client, admin_token, order_id)


def save_operator_intake(
    client: TestClient,
    admin_token: str,
    order_id: str,
    *,
    phone: str,
    patient_name: str = "Workflow Test Patient",
) -> None:
    response = client.put(
        f"/api/v1/admin/orders/{order_id}/patient-intake",
        headers=auth_headers(admin_token),
        json={
            "name": patient_name,
            "sex": "female",
            "age": 45,
            "phone": phone,
            "comorbidities": {"bloodPressure": False, "sugar": False, "thyroid": False},
        },
    )
    assert response.status_code == 200, response.text


def technician_complete_scan(
    client: TestClient,
    tech_token: str,
    order_id: str,
    *,
    admin_token: str | None = None,
    patient_phone: str | None = None,
    patient_name: str = "Workflow Test Patient",
) -> None:
    headers = auth_headers(tech_token)
    now = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    if admin_token and patient_phone:
        save_operator_intake(
            client,
            admin_token,
            order_id,
            phone=patient_phone,
            patient_name=patient_name,
        )

    for path in ("visit-started", "reached"):
        response = client.post(f"/api/v1/technician/orders/{order_id}/{path}", headers=headers)
        assert response.status_code == 200, response.text

    intake_otp = client.post(
        f"/api/v1/technician/orders/{order_id}/patient-intake/otp",
        headers=headers,
    )
    assert intake_otp.status_code == 200, intake_otp.text

    verify_intake = client.post(
        f"/api/v1/technician/orders/{order_id}/patient-intake/verify",
        headers=headers,
        json={
            "name": patient_name,
            "sex": "female",
            "age": 45,
            "phone": patient_phone or "9876543210",
            "comorbidities": {"bloodPressure": False, "sugar": False, "thyroid": False},
            "otp": DEMO_OTP,
        },
    )
    assert verify_intake.status_code == 200, verify_intake.text

    fibro_intake = client.post(
        f"/api/v1/technician/orders/{order_id}/fibroscan-intake",
        headers=headers,
        json={
            "devicePatientCode": "DEV-001",
            "machinePatientName": patient_name,
            "machinePatientAge": 45,
            "machinePatientSex": "female",
            "machinePatientPhone": patient_phone or "9876543210",
        },
    )
    assert fibro_intake.status_code == 200, fibro_intake.text

    scan = client.post(
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
            "scanAt": now,
            "operatorName": "Technician User",
            "deviceSerial": "FS-TEST-001",
            "fastingStatus": True,
            "bmi": 24.5,
            "interpretation": "Mild fibrosis — monitor annually",
            "steatosisGrade": "S1",
            "fibrosisStage": "F1",
            "source": "manual",
        },
    )
    assert scan.status_code == 200, scan.text

    attach = client.post(
        f"/api/v1/technician/orders/{order_id}/fibrosis-scan/attach",
        headers=headers,
        json={
            "fileName": "fibroscan-report.pdf",
            "storageUrl": f"https://storage.test/fibroscan/{order_id}.pdf",
            "scanReportDocumentType": "scanner_pdf",
        },
    )
    assert attach.status_code == 200, attach.text

    otp = client.post(f"/api/v1/technician/orders/{order_id}/visit-completion-otp", headers=headers)
    assert otp.status_code == 200, otp.text

    complete = client.post(
        f"/api/v1/technician/orders/{order_id}/complete",
        headers=headers,
        json={"otp": DEMO_OTP},
    )
    assert complete.status_code == 200, complete.text


def generate_and_publish_report(client: TestClient, admin_token: str, order_id: str) -> None:
    headers = auth_headers(admin_token)
    generated = client.post(
        f"/api/v1/admin/orders/{order_id}/final-report/generate",
        headers=headers,
        json={"authorizedBy": "operations"},
    )
    assert generated.status_code == 200, generated.text

    published = client.post(f"/api/v1/admin/orders/{order_id}/final-report/publish", headers=headers)
    assert published.status_code == 200, published.text


def complete_order(client: TestClient, admin_token: str, order_id: str) -> dict[str, Any]:
    response = client.post(
        f"/api/v1/admin/orders/{order_id}/transition",
        headers=auth_headers(admin_token),
        json={"event": "complete"},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


def assign_lab_and_upload_report(client: TestClient, admin_token: str, order_id: str) -> None:
    headers = auth_headers(admin_token)
    labs = client.get("/api/v1/admin/staff/lab-partners", headers=headers)
    assert labs.status_code == 200, labs.text
    lab_rows = labs.json()["data"]
    assert lab_rows, "No lab partners seeded"
    lab_id = lab_rows[0]["id"]

    assign = client.post(
        f"/api/v1/admin/orders/{order_id}/assign-lab",
        headers=headers,
        json={"partnerLabId": lab_id},
    )
    assert assign.status_code == 200, assign.text

    create_ref = client.post(f"/api/v1/admin/orders/{order_id}/lab-partner-order", headers=headers)
    assert create_ref.status_code == 200, create_ref.text

    external = client.patch(
        f"/api/v1/admin/orders/{order_id}/pathology-external-appointment",
        headers=headers,
        json={"externalAppointmentId": "EXT-LAB-12345"},
    )
    assert external.status_code == 200, external.text

    scheduled_at = (datetime.now(UTC) + timedelta(days=2)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    schedule = client.post(
        f"/api/v1/admin/orders/{order_id}/schedule-pathology",
        headers=headers,
        json={"scheduledAt": scheduled_at, "timeSlot": "14:00–16:00"},
    )
    assert schedule.status_code == 200, schedule.text

    visit = client.post(
        f"/api/v1/admin/orders/{order_id}/lab-partner-visit",
        headers=headers,
        json={"outcome": "visited"},
    )
    assert visit.status_code == 200, visit.text

    collected = client.post(f"/api/v1/admin/orders/{order_id}/lab-partner-collected", headers=headers)
    assert collected.status_code == 200, collected.text

    for path in (
        "sample-dispatch/received",
        "sample-dispatch/awaiting-report",
    ):
        response = client.post(f"/api/v1/admin/orders/{order_id}/{path}", headers=headers)
        assert response.status_code == 200, response.text

    upload = client.post(
        f"/api/v1/admin/orders/{order_id}/lab-report",
        headers=headers,
        files={"file": ("lab-report.pdf", MINIMAL_PDF, "application/pdf")},
    )
    assert upload.status_code == 200, upload.text

    extract = client.post(f"/api/v1/admin/orders/{order_id}/ai-extract", headers=headers)
    assert extract.status_code == 200, extract.text

    verify = client.post(f"/api/v1/admin/orders/{order_id}/ai-extraction/verify", headers=headers, json={})
    assert verify.status_code == 200, verify.text


def _first_available_consult_slot(client: TestClient, admin_token: str, order_id: str) -> dict[str, Any]:
    headers = auth_headers(admin_token)
    for offset in range(1, 15):
        consult_date = (datetime.now(UTC) + timedelta(days=offset)).date().isoformat()
        slots = client.get(
            f"/api/v1/admin/orders/{order_id}/consult-slots",
            headers=headers,
            params={"date": consult_date},
        )
        assert slots.status_code == 200, slots.text
        rows = slots.json()["data"]
        available = next((row for row in rows if row.get("available") and row.get("scheduledAt")), None)
        if available:
            return available
    raise AssertionError("No available consult slots in the next 14 days")


def patient_request_consult_slot(
    client: TestClient,
    phone: str,
    order_id: str,
    admin_token: str,
) -> dict[str, Any]:
    slot = _first_available_consult_slot(client, admin_token, order_id)
    response = client.post(
        f"/api/v1/patient-portal/orders/{order_id}/consult-date",
        params={"phone": phone},
        json={
            "preferredAt": slot["scheduledAt"],
            "timeSlot": slot["label"],
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


def confirm_consult_with_doctor(
    client: TestClient,
    admin_token: str,
    order_id: str,
    *,
    scheduled_at: str | None = None,
    time_slot: str | None = None,
) -> dict[str, Any]:
    slot = _first_available_consult_slot(client, admin_token, order_id)
    scheduled = scheduled_at or slot["scheduledAt"]
    label = time_slot or slot["label"]
    doctors = client.get(
        "/api/v1/admin/doctors/available-for-slot",
        headers=auth_headers(admin_token),
        params={"scheduledAt": scheduled, "excludeOrderId": order_id},
    )
    assert doctors.status_code == 200, doctors.text
    doctor_rows = doctors.json()["data"]
    assert doctor_rows, "No doctors available for slot"
    doctor = doctor_rows[0]
    response = client.post(
        f"/api/v1/admin/orders/{order_id}/confirm-consultation-schedule",
        headers=auth_headers(admin_token),
        json={
            "scheduledAt": scheduled,
            "timeSlot": label,
            "doctorId": doctor["id"],
            "doctorName": doctor["name"],
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


SAMPLE_RX_MEDICINE: dict[str, Any] = {
    "id": "med-1",
    "name": "Ursodeoxycholic acid",
    "form": "tablet",
    "dosage": "300mg",
    "frequency": "Once daily",
    "timing": "after_food",
    "duration": "30 days",
    "instruction": "After dinner",
}


def sample_rx_payload(*, diagnosis: str = "NAFLD — lifestyle modification advised") -> dict[str, Any]:
    return {
        "diagnosis": diagnosis,
        "medicines": [SAMPLE_RX_MEDICINE],
    }


def setup_pkg3_prescription_ready(
    client: TestClient,
    admin_token: str,
    tech_token: str,
    doctor_token: str,
    *,
    patient_name: str = "PKG3 Prescription Flow",
) -> tuple[str, str, str]:
    """Return (order_id, phone, visit_log_id) with consultation completed and visit ready for Rx."""
    order, phone = create_order(client, admin_token, package_code="PKG-3", patient_name=patient_name)
    order_id = order["id"]
    admin_headers = auth_headers(admin_token)
    doctor_headers = auth_headers(doctor_token)

    pay_offline(client, admin_token, order)
    schedule_scan(client, admin_token, order_id)
    technician_complete_scan(
        client,
        tech_token,
        order_id,
        admin_token=admin_token,
        patient_phone=phone,
        patient_name=patient_name,
    )
    assign_lab_and_upload_report(client, admin_token, order_id)
    generate_and_publish_report(client, admin_token, order_id)

    doctors = client.get("/api/v1/admin/doctors", headers=admin_headers)
    assert doctors.status_code == 200, doctors.text
    doctor_rows = doctors.json()["data"]
    assert doctor_rows, "No doctors seeded"
    doctor = next((d for d in doctor_rows if d.get("fullName") == "Doctor User"), doctor_rows[0])

    assign_doc = client.post(
        f"/api/v1/admin/orders/{order_id}/assign-doctor",
        headers=admin_headers,
        json={"doctorId": doctor["id"], "doctorName": doctor["fullName"]},
    )
    assert assign_doc.status_code == 200, assign_doc.text

    scheduled_at = (datetime.now(UTC) + timedelta(days=3)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    schedule = client.post(
        f"/api/v1/admin/orders/{order_id}/schedule-consultation",
        headers=admin_headers,
        json={"scheduledAt": scheduled_at, "slotLabel": "Morning"},
    )
    assert schedule.status_code == 200, schedule.text

    start = client.post(f"/api/v1/doctor/consultations/{order_id}/start", headers=doctor_headers)
    assert start.status_code == 200, start.text

    complete = client.post(f"/api/v1/doctor/consultations/{order_id}/complete", headers=doctor_headers, json={})
    assert complete.status_code == 200, complete.text

    visit_log = client.post(
        f"/api/v1/doctor/consultations/{order_id}/visits/ensure-initial",
        headers=doctor_headers,
    )
    assert visit_log.status_code == 200, visit_log.text
    visit_log_id = visit_log.json()["data"]["id"]
    return order_id, phone, visit_log_id
