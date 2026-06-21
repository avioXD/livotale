"""Deterministic IDs and seed data for project bootstrap."""

from __future__ import annotations

from uuid import UUID

BOOTSTRAP_IDS: dict[str, UUID] = {
    "doctor": UUID("00000000-0000-4000-8000-00000000b202"),
    "technician": UUID("00000000-0000-4000-8000-00000000b203"),
    "lab_partner": UUID("00000000-0000-4000-8000-00000000b207"),
    "service_zone": UUID("00000000-0000-4000-8000-00000000b301"),
    "patient_rohan_user": UUID("00000000-0000-4000-8000-000000000101"),
    "patient_rohan": UUID("00000000-0000-4000-8000-000000000201"),
    "patient_rohan_order": UUID("00000000-0000-4000-8000-000000000401"),
    "patient_anita_user": UUID("00000000-0000-4000-8000-000000000102"),
    "patient_anita": UUID("00000000-0000-4000-8000-000000000202"),
    "patient_anita_order": UUID("00000000-0000-4000-8000-000000000402"),
}

KOLKATA_CITY = ("Kolkata", "West Bengal", "India")
SERVICE_ZONE_NAME = "Kolkata"
LAB_PARTNER_REGISTRATION = "LIV-KOL-LAB-001"
DOCTOR_REGISTRATION = "LIV-KOL-DOC-001"
TECHNICIAN_EMPLOYEE_CODE = "TECH-KOL-001"

# username, password, full_name, role_code, email
BOOTSTRAP_USERS: list[tuple[str, str, str, str, str]] = [
    ("administration", "Admin@123", "Super Admin", "admin", "admin@livotale.com"),
    ("operations", "Ops@123", "Operations User", "support", "operations@livotale.com"),
    ("technician", "Tech@123", "Technician User", "technician", "technician@livotale.com"),
    ("doctor", "Doctor@123", "Doctor User", "doctor", "doctor@livotale.com"),
    ("labpartner", "Lab@123", "Lab Partner User", "lab_partner", "labpartner@livotale.com"),
]

# Demo patient portal accounts (OTP + optional username/password login).
DEMO_PATIENTS: list[dict[str, str | UUID]] = [
    {
        "key": "rohan",
        "user_id": BOOTSTRAP_IDS["patient_rohan_user"],
        "patient_id": BOOTSTRAP_IDS["patient_rohan"],
        "order_id": BOOTSTRAP_IDS["patient_rohan_order"],
        "username": "patient.rohan",
        "password": "Patient@123",
        "full_name": "Rohan Mehta",
        "mobile": "9900000001",
        "email": "rohan.demo@livotale.com",
        "package_code": "PKG-2",
        "order_number": "ORD-DEMO-ROHAN",
        "order_status": "payment_pending",
        "payment_status": "pending",
    },
    {
        "key": "anita",
        "user_id": BOOTSTRAP_IDS["patient_anita_user"],
        "patient_id": BOOTSTRAP_IDS["patient_anita"],
        "order_id": BOOTSTRAP_IDS["patient_anita_order"],
        "username": "patient.anita",
        "password": "Patient@123",
        "full_name": "Anita Desai",
        "mobile": "9988776655",
        "email": "anita.demo@livotale.com",
        "package_code": "PKG-3",
        "order_number": "ORD-DEMO-ANITA",
        "order_status": "payment_completed",
        "payment_status": "success",
    },
]


def kolkata_pincodes() -> list[str]:
    """Return Kolkata postal codes 700001 through 700156."""
    return [f"700{i:03d}" for i in range(1, 157)]
