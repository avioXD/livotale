from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.domain.order_workflow import OrderWorkflowEvent, apply_transition, get_package_flags
from app.domain.package_flags import PackageWorkflowFlags
from app.models.commerce import LiverCarePackage, OrderTimelineEvent, ServiceOrder


async def load_order_row(db: AsyncSession, order_id: UUID) -> dict[str, Any]:
    result = await db.execute(
        text(
            """
            SELECT
              o.id,
              o.order_number,
              o.patient_id,
              o.package_id,
              o.package_name,
              o.package_price,
              o.discount,
              o.final_amount,
              o.payment_mode,
              o.payment_status,
              o.order_status,
              o.technician_id,
              o.partner_lab_id,
              o.doctor_id,
              o.scan_scheduled_at,
              o.scan_time_slot,
              o.scan_patient_preferred_at,
              o.pathology_lab_order_ref,
              o.pathology_external_appointment_id,
              o.pathology_visit_outcome,
              o.pathology_visit_confirmed_at,
              o.pathology_time_slot,
              o.pathology_patient_preferred_at,
              o.pathology_scheduled_at,
              o.consultation_patient_preferred_at,
              o.consultation_time_slot,
              o.consultation_scheduled_at,
              o.created_at,
              o.updated_at,
              p.code AS package_code,
              p.pathology_included,
              p.consultation_included,
              p.fibrosis_scan_included,
              pt.patient_code,
              u.full_name AS patient_name,
              u.mobile AS patient_phone,
              lp.name AS partner_lab_name,
              d.registration_number AS doctor_registration,
              du.full_name AS doctor_name,
              tu.full_name AS technician_name
            FROM commerce.service_orders o
            JOIN commerce.liver_care_packages p ON p.id = o.package_id
            JOIN clinical.patients pt ON pt.id = o.patient_id
            JOIN identity.users u ON u.id = pt.user_id
            LEFT JOIN operations.lab_partners lp ON lp.id = o.partner_lab_id
            LEFT JOIN clinical.doctors d ON d.id = o.doctor_id
            LEFT JOIN identity.users du ON du.id = d.user_id
            LEFT JOIN identity.users tu ON tu.id = o.technician_id
            WHERE o.id = :order_id AND o.deleted_at IS NULL
            """
        ),
        {"order_id": order_id},
    )
    row = result.mappings().first()
    if not row:
        raise AppError("Order not found", status_code=404, error="not_found")
    return dict(row)


async def load_package_flags(db: AsyncSession, order_id: UUID) -> PackageWorkflowFlags:
    result = await db.execute(
        select(LiverCarePackage).join(ServiceOrder, ServiceOrder.package_id == LiverCarePackage.id).where(
            ServiceOrder.id == order_id
        )
    )
    package = result.scalar_one_or_none()
    if package is None:
        raise AppError("Order not found", status_code=404, error="not_found")
    return get_package_flags(package)


async def transition_order(
    db: AsyncSession,
    order_id: UUID,
    event: OrderWorkflowEvent | str,
    *,
    performed_by: UUID | None = None,
    timeline_label: str | None = None,
    timeline_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    result = await db.execute(select(ServiceOrder).where(ServiceOrder.id == order_id))
    order = result.scalar_one_or_none()
    if order is None:
        raise AppError("Order not found", status_code=404, error="not_found")

    flags = await load_package_flags(db, order_id)
    try:
        transition = apply_transition(order, event, flags)
    except ValueError as exc:
        raise AppError(str(exc), status_code=409, error="invalid_transition") from exc

    order.order_status = transition.order_status.value
    order.updated_at = transition.updated_at

    if timeline_label:
        await append_timeline(
            db,
            order_id,
            str(event),
            timeline_label,
            performed_by=performed_by,
            metadata=timeline_metadata,
        )

    await db.flush()
    return await load_order_row(db, order_id)


async def append_timeline(
    db: AsyncSession,
    order_id: UUID,
    event_type: str,
    label: str,
    *,
    performed_by: UUID | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    db.add(
        OrderTimelineEvent(
            order_id=order_id,
            event_type=event_type,
            label=label,
            performed_by=performed_by,
            metadata_=metadata or {},
        )
    )


def iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.isoformat()


def json_safe_value(value: Any) -> Any:
    """Coerce a value to JSON-serializable form for JSONB columns."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return iso(value)
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {str(key): json_safe_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe_value(item) for item in value]
    return str(value)


def intake_json_storage(data: dict[str, Any]) -> dict[str, Any]:
    """Strip API-only keys and coerce intake payload values for JSONB storage."""
    return {
        key: json_safe_value(value)
        for key, value in data.items()
        if key != "orderId"
    }


def order_to_api(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "orderNumber": row["order_number"],
        "patientId": row["patient_id"],
        "patientName": row["patient_name"],
        "patientPhone": row["patient_phone"],
        "packageId": row["package_id"],
        "packageCode": row["package_code"],
        "packageName": row["package_name"],
        "packagePrice": float(row["package_price"]),
        "discount": float(row["discount"]),
        "finalAmount": float(row["final_amount"]),
        "paymentMode": row["payment_mode"],
        "paymentStatus": row["payment_status"],
        "orderStatus": row["order_status"],
        "technicianId": row["technician_id"],
        "technicianName": row["technician_name"],
        "partnerLabId": row["partner_lab_id"],
        "partnerLabName": row["partner_lab_name"],
        "doctorId": row["doctor_id"],
        "doctorName": row["doctor_name"],
        "scanTimeSlot": row["scan_time_slot"],
        "scanPatientPreferredAt": iso(row["scan_patient_preferred_at"]),
        "scanScheduledAt": iso(row["scan_scheduled_at"]),
        "pathologyLabOrderRef": row["pathology_lab_order_ref"],
        "pathologyExternalAppointmentId": row.get("pathology_external_appointment_id"),
        "pathologyVisitOutcome": row.get("pathology_visit_outcome"),
        "pathologyVisitConfirmedAt": iso(row.get("pathology_visit_confirmed_at")),
        "pathologyTimeSlot": row["pathology_time_slot"],
        "pathologyPatientPreferredAt": iso(row["pathology_patient_preferred_at"]),
        "pathologyScheduledAt": iso(row["pathology_scheduled_at"]),
        "consultationPatientPreferredAt": iso(row["consultation_patient_preferred_at"]),
        "consultationTimeSlot": row["consultation_time_slot"],
        "consultationScheduledAt": iso(row["consultation_scheduled_at"]),
        "createdAt": iso(row["created_at"]),
        "updatedAt": iso(row["updated_at"]),
    }


async def resolve_doctor_id(db: AsyncSession, user_id: UUID) -> UUID:
    result = await db.execute(
        text(
            """
            SELECT id
            FROM clinical.doctors
            WHERE user_id = :user_id AND status IN ('active', 'draft')
            ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC
            LIMIT 1
            """
        ),
        {"user_id": user_id},
    )
    row = result.mappings().first()
    if not row:
        raise AppError("Doctor profile not found", status_code=404, error="not_found")
    return row["id"]


def require_technician_order(row: dict[str, Any], user_id: UUID, roles: list[str]) -> None:
    if "admin" in roles or "support" in roles or "city_manager" in roles:
        return
    technician_id = row.get("technician_id")
    if technician_id is None:
        raise AppError(
            "No technician is assigned to this order yet.",
            status_code=403,
            error="forbidden",
        )
    if technician_id != user_id:
        raise AppError(
            "This order is not assigned to you. Open it from your assigned field orders list.",
            status_code=403,
            error="forbidden",
        )


def require_doctor_order(row: dict[str, Any], doctor_id: UUID, roles: list[str]) -> None:
    if "admin" in roles or "support" in roles:
        return
    if row.get("doctor_id") != doctor_id:
        raise AppError("Forbidden", status_code=403, error="forbidden")


def visit_location_for_order(location: dict[str, Any]) -> dict[str, Any]:
    """Nested visitLocation shape for admin/patient order APIs."""
    return {
        "address": location.get("address"),
        "city": location.get("city"),
        "pincode": location.get("pincode"),
        "source": location.get("source", "none"),
        "isComplete": bool(location.get("isComplete")),
    }


async def load_order_visit_location(
    db: AsyncSession, order_id: UUID, patient_id: UUID
) -> dict[str, Any]:
    """Patient home address and email for technician field visits."""
    result = await db.execute(
        text(
            """
            SELECT
              pa.line1,
              pa.line2,
              pa.pincode,
              c.name AS city_name,
              u.email AS patient_email
            FROM clinical.patient_addresses pa
            JOIN clinical.patients pt ON pt.id = pa.patient_id
            JOIN identity.users u ON u.id = pt.user_id
            LEFT JOIN core.cities c ON c.id = pa.city_id
            WHERE pa.patient_id = :patient_id
            ORDER BY pa.is_default DESC, pa.created_at DESC
            LIMIT 1
            """
        ),
        {"patient_id": patient_id},
    )
    row = result.mappings().first()
    if row:
        parts = [row["line1"], row.get("line2")]
        pincode = row.get("pincode")
        line1 = row.get("line1")
        is_complete = bool(line1 and pincode)
        return {
            "address": ", ".join(p for p in parts if p),
            "city": row.get("city_name"),
            "pincode": pincode,
            "patientEmail": row.get("patient_email"),
            "source": "patient_address",
            "isComplete": is_complete,
        }

    enquiry_result = await db.execute(
        text(
            """
            SELECT
              e.address,
              e.city,
              e.email AS patient_email
            FROM commerce.service_orders o
            JOIN operations.enquiries e ON e.id = o.enquiry_id
            WHERE o.id = :order_id
            """
        ),
        {"order_id": order_id},
    )
    enquiry = enquiry_result.mappings().first()
    if enquiry and enquiry.get("address"):
        return {
            "address": enquiry["address"],
            "city": enquiry.get("city"),
            "pincode": None,
            "patientEmail": enquiry.get("patient_email"),
            "source": "enquiry",
            "isComplete": False,
        }

    email_result = await db.execute(
        text(
            """
            SELECT u.email AS patient_email
            FROM clinical.patients pt
            JOIN identity.users u ON u.id = pt.user_id
            WHERE pt.id = :patient_id
            """
        ),
        {"patient_id": patient_id},
    )
    email_row = email_result.mappings().first()
    return {
        "address": None,
        "city": None,
        "pincode": None,
        "patientEmail": email_row.get("patient_email") if email_row else None,
        "source": "none",
        "isComplete": False,
    }
