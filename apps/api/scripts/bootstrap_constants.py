"""Deterministic IDs and seed data for project bootstrap."""

from __future__ import annotations

from uuid import UUID

BOOTSTRAP_IDS: dict[str, UUID] = {
    "doctor": UUID("00000000-0000-4000-8000-00000000b202"),
    "technician": UUID("00000000-0000-4000-8000-00000000b203"),
    "service_zone": UUID("00000000-0000-4000-8000-00000000b301"),
}

KOLKATA_CITY = ("Kolkata", "West Bengal", "India")
SERVICE_ZONE_NAME = "Kolkata"
DOCTOR_REGISTRATION = "LIV-KOL-DOC-001"
TECHNICIAN_EMPLOYEE_CODE = "TECH-KOL-001"

# username, password, full_name, role_code, email, employee_code
BOOTSTRAP_USERS: list[tuple[str, str, str, str, str, str]] = [
    ("abhishek@livotale.com", "Admin@123", "Abhishek", "admin", "abhishek@livotale.com", "LVT-ADM-001"),
    ("dipten@livotale.com", "Ops@123", "Dipten", "support", "dipten@livotale.com", "LVT-OPS-001"),
    ("dr.vijay@livotale.com", "Doctor@123", "Dr. Vijay Kumar Rai", "doctor", "dr.vijay@livotale.com", "LVT-DOC-001"),
    ("technician@livotale.com", "Tech@123", "Kolkata Technician", "technician", "technician@livotale.com", TECHNICIAN_EMPLOYEE_CODE),
    ("vivek", "Ops@123", "Vivek", "support", "vivek@livotale.com", "LVT-OPS-002"),
]


def kolkata_pincodes() -> list[str]:
    """Return Kolkata postal codes 700001 through 700156."""
    return [f"700{i:03d}" for i in range(1, 157)]
