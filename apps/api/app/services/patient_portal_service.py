from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import UploadFile

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.integrations.twilio_service import TwilioVerifyService
from app.services.integration_settings_service import IntegrationSettingsService
from app.services.otp_challenge_service import (
    DEMO_OTP_CODE,
    OtpChallengeService,
    PURPOSE_PATIENT_PORTAL,
)
from app.services.auth_service import AuthService
from app.services.bank_details_service import BankDetailsService
from app.services.order_helpers import load_order_visit_location, visit_location_for_order
from app.services.patient_registry_service import PatientRegistryService
from app.services.storage_service import StorageService
from app.services.workflow_notifications import WorkflowNotificationService
from app.services.patient_portal_access import ensure_patient_portal_phone, resolve_patient_user_id
from app.schemas.patient_portal import patient_enquiry_status_label
from app.utils.phone import normalize_phone, phones_match

CONSULT_PREFERENCE_ELIGIBLE_STATUSES = frozenset(
    {
        "final_report_generated",
        "doctor_assignment_pending",
        "doctor_assigned",
    }
)

_ORDER_SELECT = """
SELECT
  o.id,
  o.order_number,
  o.patient_id,
  u.full_name AS patient_name,
  u.mobile AS patient_phone,
  o.enquiry_id,
  o.package_id,
  p.code AS package_code,
  o.package_name,
  o.package_price,
  o.discount,
  o.final_amount,
  o.payment_mode,
  o.payment_status,
  o.order_status,
  o.technician_id,
  tu.full_name AS technician_name,
  o.partner_lab_id,
  lp.name AS partner_lab_name,
  o.doctor_id,
  du.full_name AS doctor_name,
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
  o.created_by,
  o.created_at,
  o.updated_at
FROM commerce.service_orders o
JOIN clinical.patients pt ON pt.id = o.patient_id
JOIN identity.users u ON u.id = pt.user_id
JOIN commerce.liver_care_packages p ON p.id = o.package_id
LEFT JOIN identity.users tu ON tu.id = o.technician_id
LEFT JOIN operations.lab_partners lp ON lp.id = o.partner_lab_id
LEFT JOIN clinical.doctors d ON d.id = o.doctor_id
LEFT JOIN identity.users du ON du.id = d.user_id
WHERE o.deleted_at IS NULL
"""


def _order_row_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "orderNumber": row["order_number"],
        "patientId": row["patient_id"],
        "patientName": row["patient_name"],
        "patientPhone": row["patient_phone"],
        "enquiryId": row["enquiry_id"],
        "packageId": row["package_id"],
        "packageCode": row["package_code"],
        "packageName": row["package_name"],
        "packagePrice": row["package_price"],
        "discount": row["discount"] or Decimal("0"),
        "finalAmount": row["final_amount"],
        "paymentMode": row["payment_mode"],
        "paymentStatus": row["payment_status"],
        "orderStatus": row["order_status"],
        "technicianId": row["technician_id"],
        "technicianName": row["technician_name"],
        "partnerLabId": row["partner_lab_id"],
        "partnerLabName": row["partner_lab_name"],
        "doctorId": row["doctor_id"],
        "doctorName": row["doctor_name"],
        "scanVisitMode": "home" if row.get("scan_time_slot") or row.get("scan_patient_preferred_at") else None,
        "scanTimeSlot": row["scan_time_slot"],
        "scanClinicLocation": None,
        "scanPatientPreferredAt": row["scan_patient_preferred_at"],
        "scanScheduledAt": row["scan_scheduled_at"],
        "pathologyLabOrderRef": row["pathology_lab_order_ref"],
        "pathologyExternalAppointmentId": row.get("pathology_external_appointment_id"),
        "pathologyVisitOutcome": row.get("pathology_visit_outcome"),
        "pathologyVisitConfirmedAt": row["pathology_visit_confirmed_at"],
        "pathologyTimeSlot": row["pathology_time_slot"],
        "pathologyPatientPreferredAt": row["pathology_patient_preferred_at"],
        "pathologyScheduledAt": row["pathology_scheduled_at"],
        "consultationPatientPreferredAt": row["consultation_patient_preferred_at"],
        "consultationTimeSlot": row["consultation_time_slot"],
        "consultationScheduledAt": row["consultation_scheduled_at"],
        "createdBy": row["created_by"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def _enquiry_row_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    status = row["status"]
    return {
        "id": row["id"],
        "enquiryNumber": row["enquiry_number"],
        "status": status,
        "patientStatusLabel": patient_enquiry_status_label(status),
        "enquiryAt": row["enquiry_at"],
        "preferredPackageName": row.get("preferred_package_name"),
        "preferredPackageCode": row.get("preferred_package_code"),
        "message": row.get("message"),
        "orderId": row.get("order_id"),
        "orderNumber": row.get("order_number"),
    }


_ENQUIRY_SELECT = """
SELECT
  e.id,
  e.enquiry_number,
  e.status,
  e.enquiry_at,
  e.message,
  e.order_id,
  o.order_number,
  pkg.name AS preferred_package_name,
  pkg.code AS preferred_package_code
FROM operations.enquiries e
LEFT JOIN commerce.service_orders o ON o.id = e.order_id
LEFT JOIN commerce.liver_care_packages pkg ON pkg.id = e.preferred_package_id
WHERE e.deleted_at IS NULL
"""


class PatientPortalService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_otp(self, phone: str) -> dict[str, Any]:
        normalized = normalize_phone(phone)
        if not normalized:
            raise AppError("Phone number is required")

        settings = get_settings()
        otp_service = OtpChallengeService(self.db)
        await otp_service.check_send_allowed(normalized, PURPOSE_PATIENT_PORTAL)

        verify = TwilioVerifyService(IntegrationSettingsService(self.db))

        if settings.effective_otp_mode == "demo":
            demo_otp = OtpChallengeService.demo_code()
            if not demo_otp:
                raise AppError(
                    "SMS OTP is not configured. Please contact Livotale support.",
                    status_code=503,
                    error="not_configured",
                )
            await otp_service.create_challenge(normalized, PURPOSE_PATIENT_PORTAL, demo_otp)
        else:
            try:
                await verify.send_verification(normalized)
            except AppError as exc:
                if exc.error == "not_configured":
                    raise AppError(
                        "SMS OTP is not configured. Please contact Livotale support.",
                        status_code=503,
                        error="not_configured",
                    ) from exc
                raise
            await otp_service.create_challenge(normalized, PURPOSE_PATIENT_PORTAL, "twilio_verify")

        workflow = WorkflowNotificationService(self.db)
        await workflow.emit("otp_sent", context={"patientName": normalized}, recipient_phone=normalized, channels=["sms"])
        return {"sent": True, **otp_service.send_response_fields()}

    async def verify_otp(self, phone: str, otp: str) -> dict[str, Any]:
        normalized = normalize_phone(phone)
        settings = get_settings()
        otp_service = OtpChallengeService(self.db)
        if settings.effective_otp_mode == "demo":
            await otp_service.verify_challenge(normalized, PURPOSE_PATIENT_PORTAL, otp)
        else:
            verify = TwilioVerifyService(IntegrationSettingsService(self.db))
            try:
                approved = await verify.check_verification(normalized, otp)
            except AppError as exc:
                if exc.error == "not_configured":
                    raise AppError(
                        "SMS OTP is not configured. Please contact Livotale support.",
                        status_code=503,
                        error="not_configured",
                    ) from exc
                raise
            if not approved:
                raise AppError("Invalid or expired OTP", status_code=401)

        registry = PatientRegistryService(self.db)
        return await registry.ensure_portal_patient_by_phone(normalized)

    async def login_with_password(
        self,
        identifier: str,
        password: str,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
        device_fingerprint: str | None = None,
    ) -> dict[str, Any]:
        login_data = await AuthService(self.db).login(
            identifier,
            password,
            portal_code="patient",
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
        )
        user = login_data["user"]
        patient_ctx = (login_data.get("context") or {}).get("patient")
        if not patient_ctx or not patient_ctx.get("id"):
            raise AppError("Patient profile not found for this account.", status_code=403, error="forbidden")
        mobile = user.get("mobile")
        if not mobile:
            raise AppError("No mobile number on file. Use OTP login instead.", status_code=400)
        registry = PatientRegistryService(self.db)
        return await registry.ensure_portal_patient_by_phone(normalize_phone(mobile))

    async def list_orders(self, phone: str) -> list[dict[str, Any]]:
        normalized = normalize_phone(phone)
        result = await self.db.execute(
            text(
                f"""
                {_ORDER_SELECT}
                  AND right(regexp_replace(u.mobile, '\\D', '', 'g'), 10) = :phone
                ORDER BY o.created_at DESC
                """
            ),
            {"phone": normalized},
        )
        return [_order_row_to_dict(dict(row)) for row in result.mappings().all()]

    async def get_order(self, phone: str, order_id: UUID) -> dict[str, Any] | None:
        normalized = normalize_phone(phone)
        if not normalized:
            raise AppError("Phone number is required", status_code=400)
        result = await self.db.execute(
            text(
                f"""
                {_ORDER_SELECT}
                  AND o.id = :order_id
                  AND right(regexp_replace(u.mobile, '\\D', '', 'g'), 10) = :phone
                LIMIT 1
                """
            ),
            {"order_id": order_id, "phone": normalized},
        )
        row = result.mappings().first()
        if not row:
            return None
        order = _order_row_to_dict(dict(row))
        location = await load_order_visit_location(self.db, order_id, order["patientId"])
        order["visitLocation"] = visit_location_for_order(location)
        return order

    async def _get_order_by_id(self, order_id: UUID) -> dict[str, Any] | None:
        """Ops/admin lookup — not scoped to portal phone."""
        result = await self.db.execute(
            text(
                f"""
                {_ORDER_SELECT}
                  AND o.id = :order_id
                LIMIT 1
                """
            ),
            {"order_id": order_id},
        )
        row = result.mappings().first()
        return _order_row_to_dict(dict(row)) if row else None

    async def _resolve_portal_patient_id(self, phone: str) -> UUID:
        normalized = await ensure_patient_portal_phone(self.db, phone)
        result = await self.db.execute(
            text(
                """
                SELECT p.id
                FROM clinical.patients p
                JOIN identity.users u ON u.id = p.user_id
                WHERE p.status = 'active'
                  AND right(regexp_replace(u.mobile, '\\D', '', 'g'), 10) = :phone
                ORDER BY p.created_at DESC
                LIMIT 1
                """
            ),
            {"phone": normalized},
        )
        row = result.first()
        if not row:
            raise AppError("No portal access for this phone number", status_code=403, error="forbidden")
        return row[0]

    async def list_enquiries(self, phone: str) -> list[dict[str, Any]]:
        normalized = await ensure_patient_portal_phone(self.db, phone)
        patient_id = await self._resolve_portal_patient_id(normalized)
        result = await self.db.execute(
            text(
                f"""
                {_ENQUIRY_SELECT}
                  AND (
                    right(regexp_replace(e.phone, '\\D', '', 'g'), 10) = :phone
                    OR e.patient_id = :patient_id
                  )
                ORDER BY e.enquiry_at DESC
                """
            ),
            {"phone": normalized, "patient_id": patient_id},
        )
        return [_enquiry_row_to_dict(dict(row)) for row in result.mappings().all()]

    async def get_enquiry(self, phone: str, enquiry_id: UUID) -> dict[str, Any] | None:
        normalized = await ensure_patient_portal_phone(self.db, phone)
        patient_id = await self._resolve_portal_patient_id(normalized)
        result = await self.db.execute(
            text(
                f"""
                {_ENQUIRY_SELECT}
                  AND e.id = :enquiry_id
                  AND (
                    right(regexp_replace(e.phone, '\\D', '', 'g'), 10) = :phone
                    OR e.patient_id = :patient_id
                  )
                LIMIT 1
                """
            ),
            {"phone": normalized, "patient_id": patient_id, "enquiry_id": enquiry_id},
        )
        row = result.mappings().first()
        return _enquiry_row_to_dict(dict(row)) if row else None

    async def get_profile(self, phone: str) -> dict[str, Any]:
        normalized = normalize_phone(phone)
        result = await self.db.execute(
            text(
                """
                SELECT
                  p.id AS patient_id,
                  u.mobile,
                  u.full_name,
                  u.email,
                  u.dob,
                  u.gender::text AS gender,
                  u.metadata->>'city' AS city,
                  p.updated_at
                FROM clinical.patients p
                JOIN identity.users u ON u.id = p.user_id
                WHERE right(regexp_replace(u.mobile, '\\D', '', 'g'), 10) = :phone
                  AND p.status = 'active'
                ORDER BY p.created_at DESC
                LIMIT 1
                """
            ),
            {"phone": normalized},
        )
        row = result.mappings().first()
        if not row:
            raise AppError("No profile found", status_code=404)

        dob = row["dob"]
        return {
            "patientId": row["patient_id"],
            "phone": normalize_phone(row["mobile"] or normalized),
            "name": row["full_name"],
            "email": row["email"],
            "city": row["city"],
            "dateOfBirth": dob.isoformat() if dob else None,
            "gender": row["gender"],
            "updatedAt": row["updated_at"],
        }

    async def update_profile(
        self,
        phone: str,
        *,
        email: str | None = None,
        city: str | None = None,
        date_of_birth: str | None = None,
    ) -> dict[str, Any]:
        profile = await self.get_profile(phone)
        patient_id = profile["patientId"]

        metadata_patch: dict[str, Any] = {}
        if city is not None:
            metadata_patch["city"] = city

        dob_value: date | None = None
        if date_of_birth:
            dob_value = date.fromisoformat(date_of_birth)

        await self.db.execute(
            text(
                """
                UPDATE identity.users u
                SET
                  email = COALESCE(:email, u.email),
                  dob = COALESCE(:dob, u.dob),
                  metadata = COALESCE(u.metadata, '{}'::jsonb) || CAST(:metadata AS jsonb),
                  updated_at = now()
                FROM clinical.patients p
                WHERE p.user_id = u.id AND p.id = :patient_id
                """
            ),
            {
                "patient_id": patient_id,
                "email": email,
                "dob": dob_value,
                "metadata": json.dumps(metadata_patch or {}),
            },
        )
        return await self.get_profile(phone)

    async def get_onboarding_status(self, phone: str) -> dict[str, Any]:
        registry = PatientRegistryService(self.db)
        session = await registry.ensure_portal_patient_by_phone(phone)
        return {
            "needsOnboarding": session["needsOnboarding"],
            "patientId": session["patientId"],
            "patientName": session["patientName"],
        }

    async def complete_onboarding(
        self,
        phone: str,
        *,
        full_name: str,
        email: str | None = None,
        city: str | None = None,
        date_of_birth: str | None = None,
        gender: str | None = None,
    ) -> dict[str, Any]:
        registry = PatientRegistryService(self.db)
        return await registry.complete_portal_onboarding(
            phone,
            full_name=full_name,
            email=email,
            city=city,
            date_of_birth=date_of_birth,
            gender=gender,
        )

    async def _user_id_for_phone(self, phone: str) -> UUID:
        return await resolve_patient_user_id(self.db, phone)

    async def get_bank_details(self, phone: str) -> dict[str, Any]:
        user_id = await self._user_id_for_phone(phone)
        return await BankDetailsService(self.db).get_self(user_id)

    async def upsert_bank_details(
        self,
        phone: str,
        body: dict[str, Any],
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        user_id = await self._user_id_for_phone(phone)
        return await BankDetailsService(self.db).upsert_for_user(
            user_id,
            body,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def presign_storage_upload(
        self,
        phone: str,
        *,
        file_name: str,
        mime_type: str,
        entity_type: str,
        entity_id: UUID | None = None,
        subfolder: str | None = None,
    ) -> dict[str, Any]:
        user_id = await self._user_id_for_phone(phone)
        normalized_type = entity_type.strip().lower()
        target_entity_id = entity_id or user_id
        if normalized_type == "payment_receipt":
            if entity_id is None:
                raise AppError("entityId (order id) is required for payment receipts", status_code=400)
            order = await self.get_order(phone, entity_id)
            if not order:
                raise AppError("Order not found", status_code=404)
            target_entity_id = entity_id
        return await StorageService(self.db).presign_upload(
            user_id,
            file_name,
            mime_type,
            entity_type,
            target_entity_id,
            subfolder=subfolder,
        )

    async def upload_storage_multipart(
        self,
        phone: str,
        file: UploadFile,
        *,
        entity_type: str,
        entity_id: UUID | None = None,
        subfolder: str | None = None,
    ) -> dict[str, Any]:
        """Server-side upload — avoids browser presigned PUT to internal LocalStack host."""
        user_id = await self._user_id_for_phone(phone)
        normalized_type = entity_type.strip().lower()
        target_entity_id = entity_id or user_id
        if normalized_type == "payment_receipt":
            if entity_id is None:
                raise AppError("entityId (order id) is required for payment receipts", status_code=400)
            order = await self.get_order(phone, entity_id)
            if not order:
                raise AppError("Order not found", status_code=404)
            target_entity_id = entity_id
        uploaded = await StorageService(self.db).upload_multipart(
            file,
            user_id,
            entity_type,
            target_entity_id,
            subfolder=subfolder,
        )
        return {
            "fileId": uploaded["fileId"],
            "storageUrl": uploaded["storageUrl"],
            "confirmed": True,
        }

    async def confirm_storage_upload(self, phone: str, file_id: UUID) -> dict[str, Any]:
        user_id = await self._user_id_for_phone(phone)
        return await StorageService(self.db).confirm_upload(file_id, user_id)

    async def list_downloads(self, phone: str) -> list[dict[str, Any]]:
        orders = await self.list_orders(phone)
        items: list[dict[str, Any]] = []

        for order in orders:
            if order["paymentStatus"] == "success":
                invoice = await self.get_invoice(order["id"], phone)
                if invoice:
                    items.append(
                        {
                            "id": f"dl-inv-{order['id']}",
                            "type": "invoice",
                            "label": f"Invoice — {order['orderNumber']}",
                            "orderId": order["id"],
                            "orderNumber": order["orderNumber"],
                            "pdfUrl": invoice["pdfUrl"],
                            "availableAt": invoice.get("paidAt") or order["updatedAt"],
                        }
                    )

            report = await self.db.execute(
                text(
                    """
                    SELECT report_number, pdf_url, published_at, generated_at
                    FROM clinical.final_reports
                    WHERE order_id = :order_id AND status = 'published' AND pdf_url IS NOT NULL
                    ORDER BY published_at DESC NULLS LAST
                    LIMIT 1
                    """
                ),
                {"order_id": order["id"]},
            )
            report_row = report.mappings().first()
            if report_row and report_row["pdf_url"]:
                items.append(
                    {
                        "id": f"dl-rpt-{order['id']}",
                        "type": "report",
                        "label": f"Final report — {report_row['report_number']}",
                        "orderId": order["id"],
                        "orderNumber": order["orderNumber"],
                        "pdfUrl": report_row["pdf_url"],
                        "availableAt": report_row["published_at"] or report_row["generated_at"],
                    }
                )

            rx = await self.db.execute(
                text(
                    """
                    SELECT pr.id, pr.doctor_name, pr.pdf_url, pr.published_at, pr.updated_at
                    FROM clinical.liver_care_prescriptions pr
                    WHERE pr.order_id = :order_id AND pr.status = 'published' AND pr.pdf_url IS NOT NULL
                    ORDER BY pr.published_at DESC NULLS LAST
                    LIMIT 1
                    """
                ),
                {"order_id": order["id"]},
            )
            rx_row = rx.mappings().first()
            if rx_row and rx_row["pdf_url"]:
                items.append(
                    {
                        "id": f"dl-rx-{order['id']}",
                        "type": "prescription",
                        "label": f"Prescription — {rx_row['doctor_name']}",
                        "orderId": order["id"],
                        "orderNumber": order["orderNumber"],
                        "pdfUrl": rx_row["pdf_url"],
                        "availableAt": rx_row["published_at"] or rx_row["updated_at"],
                    }
                )

        items.sort(key=lambda item: item["availableAt"], reverse=True)
        return items

    async def get_invoice(self, order_id: UUID, phone: str | None) -> dict[str, Any] | None:
        if phone:
            order = await self.get_order(phone, order_id)
        else:
            order = await self._get_order_by_id(order_id)
        if not order or order["paymentStatus"] != "success":
            return None

        payment = await self.db.execute(
            text(
                """
                SELECT op.paid_at, op.amount, f.storage_url, f.id AS file_id
                FROM commerce.order_payments op
                LEFT JOIN storage.files f ON f.id = op.receipt_file_id
                WHERE op.order_id = :order_id AND op.status = 'success'
                ORDER BY op.paid_at DESC NULLS LAST
                LIMIT 1
                """
            ),
            {"order_id": order_id},
        )
        row = payment.mappings().first()
        paid_at = row["paid_at"] if row else order["updatedAt"]
        pdf_url = (row["storage_url"] if row else None) or f"/api/v1/patient-portal/orders/{order_id}/invoice.pdf"
        file_id = str(row["file_id"]) if row and row["file_id"] else f"invoice-{order_id}"

        return {
            "orderId": order_id,
            "orderNumber": order["orderNumber"],
            "patientName": order["patientName"],
            "amount": order["finalAmount"],
            "paidAt": paid_at,
            "pdfUrl": pdf_url,
            "fileId": file_id,
        }

    async def pay_order(
        self,
        order_id: UUID,
        phone: str | None,
        method: str,
        *,
        receipt_file_id: UUID | None = None,
        transaction_ref: str | None = None,
        outcome: str | None = None,
    ) -> dict[str, Any]:
        order = await self.get_order(phone, order_id)
        if not order:
            raise AppError("Order not found", status_code=404)
        from app.services.order_service import OrderService

        order_service = OrderService(self.db)
        result = await order_service.mark_portal_payment(
            order_id,
            method=method,
            amount=float(order["finalAmount"]),
            receipt_file_id=receipt_file_id,
            transaction_ref=transaction_ref,
            outcome=outcome,
        )
        return result

    async def get_payment_config(self) -> dict[str, Any]:
        from app.services.integration_settings_service import IntegrationSettingsService

        return await IntegrationSettingsService(self.db).get_payment_config()

    async def get_timeline(self, phone: str | None, order_id: UUID) -> list[dict[str, Any]]:
        order = await self.get_order(phone, order_id)
        if not order:
            raise AppError("Order not found", status_code=404)
        from app.services.order_service import OrderService

        return await OrderService(self.db).get_timeline(order_id)

    async def request_scan_date(
        self,
        phone: str | None,
        order_id: UUID,
        *,
        preferred_at: datetime,
        visit_mode: str,
        time_slot: str,
    ) -> dict[str, Any]:
        order = await self._require_order_for_date_request(phone, order_id)
        if order["scanScheduledAt"]:
            raise AppError("Scan is already confirmed by operations")
        if order["paymentStatus"] != "success":
            raise AppError("Complete payment before selecting a scan date")
        if order["orderStatus"] in ("scan_in_progress", "scan_completed", "completed"):
            raise AppError("Scan date can no longer be changed")

        await self.db.execute(
            text(
                """
                UPDATE commerce.service_orders
                SET scan_patient_preferred_at = :preferred_at,
                    scan_time_slot = :time_slot,
                    updated_at = now()
                WHERE id = :order_id
                """
            ),
            {"order_id": order_id, "preferred_at": preferred_at, "time_slot": time_slot},
        )
        await self.db.execute(
            text(
                """
                INSERT INTO commerce.order_timeline_events (order_id, event_type, label, metadata)
                VALUES (:order_id, 'scan_date_requested', :label, CAST(:metadata AS jsonb))
                """
            ),
            {
                "order_id": order_id,
                "label": f"FibroScan home visit · {time_slot}",
                "metadata": json.dumps(
                    {
                        "preferredAt": preferred_at.isoformat(),
                        "visitMode": visit_mode,
                        "timeSlot": time_slot,
                        "performedBy": "patient",
                    }
                ),
            },
        )
        updated = await self.get_order(phone, order_id)
        workflow = WorkflowNotificationService(self.db)
        await workflow.scan_date_requested(order=updated or order, time_slot=time_slot)
        return updated or order

    async def request_consult_date(
        self,
        phone: str | None,
        order_id: UUID,
        *,
        preferred_at: datetime,
        time_slot: str,
    ) -> dict[str, Any]:
        order = await self._require_order_for_date_request(phone, order_id)
        if order["consultationScheduledAt"]:
            raise AppError("Consultation is already confirmed by operations", status_code=409)
        if order["orderStatus"] not in CONSULT_PREFERENCE_ELIGIBLE_STATUSES:
            raise AppError(
                "Consultation scheduling is available after your report is ready",
                status_code=400,
                error="invalid_state",
            )

        package_row = await self.db.execute(
            text(
                """
                SELECT consultation_included
                FROM commerce.liver_care_packages
                WHERE id = :package_id
                """
            ),
            {"package_id": order["packageId"]},
        )
        package = package_row.mappings().first()
        if not package or not package["consultation_included"]:
            raise AppError("This order does not include a doctor consultation", status_code=400)

        await self.db.execute(
            text(
                """
                UPDATE commerce.service_orders
                SET consultation_patient_preferred_at = :preferred_at,
                    consultation_time_slot = :time_slot,
                    updated_at = now()
                WHERE id = :order_id
                """
            ),
            {"order_id": order_id, "preferred_at": preferred_at, "time_slot": time_slot},
        )
        await self.db.execute(
            text(
                """
                INSERT INTO commerce.order_timeline_events (order_id, event_type, label, metadata)
                VALUES (:order_id, 'consultation_date_requested', :label, CAST(:metadata AS jsonb))
                """
            ),
            {
                "order_id": order_id,
                "label": f"Teleconsult · {time_slot}",
                "metadata": json.dumps(
                    {
                        "preferredAt": preferred_at.isoformat(),
                        "timeSlot": time_slot,
                        "performedBy": "patient",
                    }
                ),
            },
        )
        updated = await self.get_order(phone, order_id)
        workflow = WorkflowNotificationService(self.db)
        await workflow.consultation_date_requested(order=updated or order, time_slot=time_slot)
        return updated or order

    async def request_pathology_date(
        self,
        phone: str | None,
        order_id: UUID,
        *,
        preferred_at: datetime,
        time_slot: str,
    ) -> dict[str, Any]:
        order = await self._require_order_for_date_request(phone, order_id)
        if order["pathologyScheduledAt"]:
            raise AppError("Pathology visit is already confirmed by operations")
        if order["paymentStatus"] != "success":
            raise AppError("Complete payment before selecting a pathology visit date")

        await self.db.execute(
            text(
                """
                UPDATE commerce.service_orders
                SET pathology_patient_preferred_at = :preferred_at,
                    pathology_time_slot = :time_slot,
                    updated_at = now()
                WHERE id = :order_id
                """
            ),
            {"order_id": order_id, "preferred_at": preferred_at, "time_slot": time_slot},
        )
        await self.db.execute(
            text(
                """
                INSERT INTO commerce.order_timeline_events (order_id, event_type, label, metadata)
                VALUES (:order_id, 'pathology_date_requested', :label, CAST(:metadata AS jsonb))
                """
            ),
            {
                "order_id": order_id,
                "label": f"Lab visit · {time_slot}",
                "metadata": json.dumps(
                    {
                        "preferredAt": preferred_at.isoformat(),
                        "timeSlot": time_slot,
                        "performedBy": "patient",
                    }
                ),
            },
        )
        updated = await self.get_order(phone, order_id)
        return updated or order

    async def _require_order_for_date_request(self, phone: str | None, order_id: UUID) -> dict[str, Any]:
        order = await self.get_order(phone, order_id)
        if not order:
            raise AppError("Order not found", status_code=404)
        if order["orderStatus"] == "cancelled":
            raise AppError("This order was cancelled")
        return order

    async def _resolve_session(self, phone: str) -> dict[str, Any] | None:
        result = await self.db.execute(
            text(
                """
                SELECT p.id AS patient_id, u.full_name, u.mobile
                FROM clinical.patients p
                JOIN identity.users u ON u.id = p.user_id
                JOIN commerce.service_orders o ON o.patient_id = p.id
                WHERE right(regexp_replace(u.mobile, '\\D', '', 'g'), 10) = :phone
                  AND o.deleted_at IS NULL
                ORDER BY o.created_at DESC
                LIMIT 1
                """
            ),
            {"phone": phone},
        )
        row = result.mappings().first()
        if not row:
            return None
        return {
            "phone": normalize_phone(row["mobile"] or phone),
            "patientId": row["patient_id"],
            "patientName": row["full_name"],
        }

    async def _count_orders_for_phone(self, phone: str) -> int:
        result = await self.db.execute(
            text(
                """
                SELECT COUNT(*) AS count
                FROM commerce.service_orders o
                JOIN clinical.patients p ON p.id = o.patient_id
                JOIN identity.users u ON u.id = p.user_id
                WHERE right(regexp_replace(u.mobile, '\\D', '', 'g'), 10) = :phone
                  AND o.deleted_at IS NULL
                """
            ),
            {"phone": phone},
        )
        return int(result.mappings().first()["count"])

    @staticmethod
    def phone_matches(stored: str | None, requested: str) -> bool:
        return phones_match(stored or "", requested)
