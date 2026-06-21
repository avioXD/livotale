from __future__ import annotations

import json
import re
from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.security import hash_password
from app.domain.enquiry_thread import normalize_enquiry_phone
from app.utils.phone import normalize_phone
from app.domain.rbac import RoleCode
from app.services.ops_scope_service import (
    build_patient_access_sql,
    patient_matches_scope,
    resolve_patient_access_scope,
)


CLINICAL_READ_ROLES = {
    RoleCode.ADMIN.value,
    RoleCode.SUPPORT.value,
    RoleCode.CITY_MANAGER.value,
    RoleCode.DOCTOR.value,
    RoleCode.DIETICIAN.value,
    RoleCode.HEALTH_COACH.value,
    RoleCode.TECHNICIAN.value,
}
PATIENT_EDIT_ROLES = {
    RoleCode.ADMIN.value,
    RoleCode.SUPPORT.value,
    RoleCode.CITY_MANAGER.value,
}


def _snake_to_camel(key: str) -> str:
    parts = key.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def _camel_to_snake(key: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", key).lower()


def _row_to_camel(row: dict[str, Any]) -> dict[str, Any]:
    return {_snake_to_camel(k): v for k, v in row.items()}


class PatientRegistryService:
    def __init__(self, session: AsyncSession):
        self.session = session

    @staticmethod
    def _patient_status_clause(status: str) -> tuple[str, dict[str, Any]]:
        """Map UI list status (active/inactive/pending) to journey_status groups."""
        allowed = frozenset({"inactive", "pending", "active", "registered", "archived"})
        if status not in allowed:
            raise AppError("Invalid patient status filter", status_code=400, error="validation_error")
        if status == "inactive":
            return "AND pt.journey_status IN ('inactive', 'archived')", {}
        if status == "pending":
            return "AND (pt.journey_status = 'registered' OR pt.journey_status LIKE '%pending%')", {}
        if status == "active":
            return (
                "AND pt.journey_status NOT IN ('inactive', 'archived', 'registered')"
                " AND pt.journey_status NOT LIKE '%pending%'",
                {},
            )
        return "AND pt.journey_status = :raw_status", {"raw_status": status}

    async def list_patients(
        self,
        *,
        page: int = 1,
        page_size: int = 10,
        search: str | None = None,
        status: str | None = None,
        assigned_doctor: str | None = None,
        user_id: UUID | None = None,
        roles: list[str] | None = None,
    ) -> dict[str, Any]:
        await self._assert_clinical_read(user_id, roles or [])
        scope = await resolve_patient_access_scope(self.session, user_id=user_id, roles=roles)
        page = max(1, page)
        page_size = min(50, max(1, page_size))
        offset = (page - 1) * page_size
        params: dict[str, Any] = {"limit": page_size, "offset": offset}
        where = "WHERE 1=1"
        from_clause = "clinical.patient_dashboard_summary pds"

        joined_from = f"""
            {from_clause}
            JOIN clinical.patients pt ON pt.id = pds.patient_id
            JOIN identity.users pt_u ON pt_u.id = pt.user_id
            LEFT JOIN clinical.doctors doc ON doc.id = pds.primary_doctor_id
            LEFT JOIN identity.users doc_u ON doc_u.id = doc.user_id
        """

        access_sql = build_patient_access_sql(scope, params)
        if access_sql:
            where += f" {access_sql}"

        if search:
            params["search"] = f"%{search.strip().lower()}%"
            where += (
                " AND (lower(pds.full_name) LIKE :search OR lower(pds.patient_code) LIKE :search"
                " OR lower(pt_u.mobile) LIKE :search)"
            )
        if status:
            status_clause, status_params = self._patient_status_clause(status)
            params.update(status_params)
            where += f" {status_clause}"
        if assigned_doctor:
            params["assigned_doctor"] = f"%{assigned_doctor.strip()}%"
            where += " AND doc_u.full_name ILIKE :assigned_doctor"

        count_result = await self.session.execute(
            text(f"SELECT COUNT(*)::int AS total FROM {joined_from} {where}"),
            params,
        )
        total = count_result.scalar_one()

        list_result = await self.session.execute(
            text(
                f"""
                SELECT pds.patient_id, pds.patient_code, pds.full_name,
                       pds.bmi, pds.risk_score, pds.liver_score,
                       pt.journey_status,
                       doc_u.full_name AS primary_doctor_name
                FROM {joined_from}
                {where}
                ORDER BY pt.updated_at DESC NULLS LAST, pt.created_at DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        )
        items = [_row_to_camel(dict(row)) for row in list_result.mappings().all()]
        total_pages = (total + page_size - 1) // page_size if total else 0
        return {
            "items": items,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": total_pages,
        }

    async def get_detail(self, patient_id: UUID, *, user_id: UUID | None, roles: list[str]) -> dict[str, Any]:
        await self._assert_patient_access(user_id, roles, patient_id)
        core = await self._get_patient_core(patient_id)
        dashboard_result = await self.session.execute(
            text("SELECT * FROM clinical.patient_dashboard_summary WHERE patient_id = :patient_id"),
            {"patient_id": patient_id},
        )
        dashboard = dashboard_result.mappings().first()
        dashboard_dict = dict(dashboard) if dashboard else None

        addresses_result = await self.session.execute(
            text(
                """
                SELECT * FROM clinical.patient_addresses
                WHERE patient_id = :patient_id
                ORDER BY is_default DESC
                """
            ),
            {"patient_id": patient_id},
        )
        allergies_result = await self.session.execute(
            text(
                """
                SELECT * FROM clinical.patient_allergies
                WHERE patient_id = :patient_id
                ORDER BY alert_flag DESC, created_at DESC
                """
            ),
            {"patient_id": patient_id},
        )
        addresses = [dict(row) for row in addresses_result.mappings().all()]
        allergy_alerts = [
            dict(row) for row in allergies_result.mappings().all() if row.get("alert_flag")
        ]
        return {
            "patient": _row_to_camel(core),
            "dashboard": _row_to_camel(dashboard_dict) if dashboard_dict else None,
            "summaryCard": self._build_summary_card(core, dashboard_dict),
            "addresses": [_row_to_camel(a) for a in addresses],
            "allergyAlerts": [_row_to_camel(a) for a in allergy_alerts],
        }

    async def get_history(self, patient_id: UUID, *, user_id: UUID | None, roles: list[str]) -> dict[str, Any]:
        await self._assert_patient_access(user_id, roles, patient_id)
        sections = ["conditions", "liver", "medications", "allergies", "family"]
        history: dict[str, Any] = {}
        for section in sections:
            table = {
                "conditions": "clinical.patient_conditions",
                "liver": "clinical.patient_liver_history",
                "medications": "clinical.patient_medications",
                "allergies": "clinical.patient_allergies",
                "family": "clinical.patient_family_members",
            }[section]
            result = await self.session.execute(
                text(f"SELECT * FROM {table} WHERE patient_id = :patient_id ORDER BY created_at ASC"),
                {"patient_id": patient_id},
            )
            history[section] = [_row_to_camel(dict(row)) for row in result.mappings().all()]
        history["familyMembers"] = history.get("family", [])
        return history

    async def update_demographics(
        self,
        patient_id: UUID,
        payload: dict[str, Any],
        *,
        user_id: UUID | None,
        roles: list[str],
    ) -> dict[str, Any]:
        if not set(roles or []).intersection(PATIENT_EDIT_ROLES):
            raise AppError("Only operations can edit demographics", status_code=403, error="forbidden")
        await self._assert_patient_access(user_id, roles, patient_id)
        core = await self._get_patient_core(patient_id)
        user_updates: dict[str, Any] = {}
        field_map = {
            "fullName": "full_name",
            "mobile": "mobile",
            "email": "email",
            "gender": "gender",
            "dob": "dob",
        }
        for key, col in field_map.items():
            if key in payload and payload[key] is not None:
                user_updates[col] = payload[key]
        if user_updates:
            sets = ", ".join(f"{col} = :{col}" for col in user_updates)
            await self.session.execute(
                text(f"UPDATE identity.users SET {sets}, updated_at = now() WHERE id = :user_id"),
                {**user_updates, "user_id": core["user_id"]},
            )
        patient_updates: dict[str, Any] = {}
        patient_field_map = {
            "heightCm": "height_cm",
            "currentWeightKg": "current_weight_kg",
            "occupation": "occupation",
            "waistCm": "waist_cm",
            "lifestyleType": "lifestyle_type",
            "foodPreference": "food_preference",
            "emergencyContactName": "emergency_contact_name",
            "emergencyContactMobile": "emergency_contact_mobile",
        }
        for key, col in patient_field_map.items():
            if key in payload and payload[key] is not None:
                patient_updates[col] = payload[key]
        if patient_updates:
            sets = ", ".join(f"{col} = :{col}" for col in patient_updates)
            await self.session.execute(
                text(f"UPDATE clinical.patients SET {sets}, updated_at = now() WHERE id = :patient_id"),
                {**patient_updates, "patient_id": patient_id},
            )
        await self.session.flush()
        return await self.get_detail(patient_id, user_id=user_id, roles=roles)

    async def update_history_section(
        self,
        patient_id: UUID,
        section: str,
        payload: dict[str, Any],
        *,
        user_id: UUID | None,
        roles: list[str],
    ) -> dict[str, Any]:
        if not set(roles or []).intersection(PATIENT_EDIT_ROLES):
            raise AppError("Only operations can edit history", status_code=403, error="forbidden")
        await self._assert_patient_access(user_id, roles, patient_id)
        allowed = {"conditions", "liver", "medications", "allergies", "family"}
        if section not in allowed:
            raise AppError("Invalid history section", status_code=400, error="validation_error")
        items = payload.get("items") or payload.get(section) or []
        table = {
            "conditions": "clinical.patient_conditions",
            "liver": "clinical.patient_liver_history",
            "medications": "clinical.patient_medications",
            "allergies": "clinical.patient_allergies",
            "family": "clinical.patient_family_members",
        }[section]
        await self.session.execute(
            text(f"DELETE FROM {table} WHERE patient_id = :patient_id"),
            {"patient_id": patient_id},
        )
        for item in items:
            if not isinstance(item, dict):
                continue
            snake_item = {_camel_to_snake(k): v for k, v in item.items()}
            cols = ["patient_id"] + list(snake_item.keys())
            params = {"patient_id": patient_id, **snake_item}
            col_sql = ", ".join(cols)
            val_sql = ", ".join(f":{c}" for c in cols)
            await self.session.execute(
                text(f"INSERT INTO {table} ({col_sql}) VALUES ({val_sql})"),
                params,
            )
        await self.session.flush()
        return await self.get_history(patient_id, user_id=user_id, roles=roles)

    async def get_clinical_context(
        self, patient_id: UUID, *, user_id: UUID | None, roles: list[str]
    ) -> dict[str, Any]:
        await self._assert_patient_access(user_id, roles, patient_id)
        orders_result = await self.session.execute(
            text(
                """
                SELECT so.*, pkg.code AS package_code
                FROM commerce.service_orders so
                JOIN commerce.liver_care_packages pkg ON pkg.id = so.package_id
                WHERE so.patient_id = :patient_id AND so.deleted_at IS NULL
                ORDER BY so.created_at DESC
                """
            ),
            {"patient_id": patient_id},
        )
        patient_orders = []
        for row in orders_result.mappings().all():
            o = _row_to_camel(dict(row))
            o["packageCode"] = row.get("package_code")
            o["patientId"] = patient_id
            patient_orders.append(o)
        payments = [
            {
                "orderId": o["id"],
                "orderNumber": o["orderNumber"],
                "packageName": o["packageName"],
                "amount": o["finalAmount"],
                "paymentMode": o.get("paymentMode"),
                "paymentStatus": o["paymentStatus"],
                "paidAt": o.get("updatedAt"),
            }
            for o in patient_orders
        ]
        scans_result = await self.session.execute(
            text(
                """
                SELECT fsr.*, so.order_number
                FROM clinical.fibrosis_scan_records fsr
                JOIN commerce.service_orders so ON so.id = fsr.order_id
                WHERE so.patient_id = :patient_id
                ORDER BY fsr.created_at DESC
                """
            ),
            {"patient_id": patient_id},
        )
        scans = [_row_to_camel(dict(row)) for row in scans_result.mappings().all()]
        pathology_result = await self.session.execute(
            text(
                """
                SELECT lr.*, so.order_number
                FROM integrations.lab_report_uploads lr
                JOIN commerce.service_orders so ON so.id = lr.order_id
                WHERE so.patient_id = :patient_id
                ORDER BY lr.uploaded_at DESC NULLS LAST
                """
            ),
            {"patient_id": patient_id},
        )
        pathology_reports = [_row_to_camel(dict(row)) for row in pathology_result.mappings().all()]
        appointments = [
            {
                "orderId": o["id"],
                "orderNumber": o["orderNumber"],
                "packageName": o["packageName"],
                "scheduledAt": o.get("consultationScheduledAt"),
                "doctorName": o.get("doctorName"),
                "status": o["orderStatus"],
            }
            for o in patient_orders
            if o.get("consultationScheduledAt") or o.get("doctorId")
        ]
        reports = [
            {
                "orderId": o["id"],
                "orderNumber": o["orderNumber"],
                "packageName": o["packageName"],
                "orderStatus": o["orderStatus"],
            }
            for o in patient_orders
            if o["orderStatus"] in ("final_report_generated", "completed", "prescription_generated")
        ]
        return {
            "orders": patient_orders,
            "payments": payments,
            "pathologyReports": pathology_reports,
            "scans": scans,
            "appointments": appointments,
            "reports": reports,
        }

    @staticmethod
    def portal_needs_onboarding(
        *,
        metadata: dict[str, Any] | None,
        full_name: str | None,
    ) -> bool:
        meta = metadata or {}
        if meta.get("portalOnboardingPending") is True:
            return True
        return not bool((full_name or "").strip())

    async def ensure_portal_patient_by_phone(self, phone: str) -> dict[str, Any]:
        """Find or create a patient account for OTP portal login."""
        normalized = normalize_phone(phone)
        if not normalized:
            raise AppError("Phone number is required")

        existing = await self._find_patient_by_phone(normalized)
        if existing:
            return await self._portal_session_from_patient(existing["id"], normalized)

        user_row = await self._find_user_by_mobile(normalized)
        if user_row:
            user_id = user_row["id"]
            patient_code = f"MR-{str(user_id)[:8].upper()}"
            result = await self.session.execute(
                text(
                    """
                    INSERT INTO clinical.patients (
                      user_id, patient_code, journey_status, registered_at, status
                    )
                    VALUES (:user_id, :patient_code, 'registered', now(), 'active')
                    ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
                    RETURNING id
                    """
                ),
                {"user_id": user_id, "patient_code": patient_code},
            )
            patient_id = result.scalar_one()
            await self.session.execute(
                text(
                    """
                    INSERT INTO identity.user_roles (user_id, role_id, is_primary)
                    SELECT :user_id, r.id, true
                    FROM identity.roles r
                    WHERE r.code = 'patient'
                      AND NOT EXISTS (
                        SELECT 1 FROM identity.user_roles ur
                        WHERE ur.user_id = :user_id AND ur.role_id = r.id AND ur.ends_at IS NULL
                      )
                    """
                ),
                {"user_id": user_id},
            )
            return await self._portal_session_from_patient(patient_id, normalized)

        user_id = uuid4()
        username = f"patient_{normalized}"
        await self.session.execute(
            text(
                """
                INSERT INTO identity.users (
                  id, username, password_hash, full_name, mobile, status, metadata
                )
                VALUES (
                  :id, :username, :password_hash, :full_name, :mobile, 'active',
                  CAST(:metadata AS jsonb)
                )
                """
            ),
            {
                "id": user_id,
                "username": username,
                "password_hash": hash_password(uuid4().hex),
                "full_name": "",
                "mobile": normalized,
                "metadata": json.dumps({"portalOnboardingPending": True}),
            },
        )
        await self.session.execute(
            text(
                """
                INSERT INTO identity.user_roles (user_id, role_id, is_primary)
                SELECT :user_id, r.id, true
                FROM identity.roles r
                WHERE r.code = 'patient'
                """
            ),
            {"user_id": user_id},
        )
        patient_code = f"MR-{str(user_id)[:8].upper()}"
        result = await self.session.execute(
            text(
                """
                INSERT INTO clinical.patients (
                  user_id, patient_code, journey_status, registered_at, status
                )
                VALUES (:user_id, :patient_code, 'registered', now(), 'active')
                RETURNING id
                """
            ),
            {"user_id": user_id, "patient_code": patient_code},
        )
        patient_id = result.scalar_one()
        await self.session.flush()
        return await self._portal_session_from_patient(patient_id, normalized)

    async def complete_portal_onboarding(
        self,
        phone: str,
        *,
        full_name: str,
        email: str | None = None,
        city: str | None = None,
        date_of_birth: str | None = None,
        gender: str | None = None,
    ) -> dict[str, Any]:
        normalized = normalize_phone(phone)
        existing = await self._find_patient_by_phone(normalized)
        if not existing:
            raise AppError("Patient not found", status_code=404)

        name = full_name.strip()
        if not name:
            raise AppError("Full name is required", status_code=400, error="validation_error")

        metadata_patch: dict[str, Any] = {"portalOnboardingPending": False}
        if city is not None:
            metadata_patch["city"] = city.strip()

        valid_genders = frozenset({"male", "female", "other", "undisclosed"})
        gender_value = gender if gender in valid_genders else None
        dob_value: date | None = None
        if date_of_birth:
            dob_value = date.fromisoformat(date_of_birth)

        gender_sql = ""
        params: dict[str, Any] = {
            "patient_id": existing["id"],
            "full_name": name,
            "email": email,
            "dob": dob_value,
            "metadata": json.dumps(metadata_patch),
        }
        if gender_value:
            gender_sql = "gender = CAST(:gender AS identity.gender_enum),"
            params["gender"] = gender_value

        await self.session.execute(
            text(
                f"""
                UPDATE identity.users u
                SET
                  full_name = :full_name,
                  email = COALESCE(:email, u.email),
                  dob = COALESCE(:dob, u.dob),
                  {gender_sql}
                  metadata = COALESCE(u.metadata, '{{}}'::jsonb) || CAST(:metadata AS jsonb),
                  updated_at = now()
                FROM clinical.patients p
                WHERE p.user_id = u.id AND p.id = :patient_id
                """
            ),
            params,
        )
        await self.session.execute(
            text(
                """
                UPDATE clinical.patients
                SET
                  journey_status = 'registered',
                  registered_at = COALESCE(registered_at, now()),
                  journey_timestamps = journey_timestamps || jsonb_build_object('registration', now()::text),
                  updated_at = now()
                WHERE id = :patient_id
                """
            ),
            {"patient_id": existing["id"]},
        )
        await self.session.flush()
        return await self._portal_session_from_patient(existing["id"], normalized)

    async def _portal_session_from_patient(self, patient_id: UUID, phone: str) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                SELECT
                  p.id AS patient_id,
                  u.full_name,
                  u.mobile,
                  u.metadata,
                  p.journey_timestamps
                FROM clinical.patients p
                JOIN identity.users u ON u.id = p.user_id
                WHERE p.id = :patient_id AND p.status = 'active'
                LIMIT 1
                """
            ),
            {"patient_id": patient_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError("Patient not found", status_code=404)

        metadata = row["metadata"] if isinstance(row["metadata"], dict) else {}
        display_name = (row["full_name"] or "").strip() or phone
        return {
            "phone": normalize_phone(row["mobile"] or phone),
            "patientId": row["patient_id"],
            "patientName": display_name,
            "needsOnboarding": self.portal_needs_onboarding(
                metadata=metadata,
                full_name=row["full_name"],
            ),
        }

    async def create_patient_from_intake(
        self,
        *,
        name: str,
        phone: str,
        intake: dict[str, Any] | None = None,
        actor_id: UUID | None = None,
    ) -> UUID:
        normalized_phone = normalize_enquiry_phone(phone)
        existing = await self._find_patient_by_phone(normalized_phone)
        if existing:
            patient_id = existing["id"]
            await self._apply_intake_vitals(patient_id, intake)
            return patient_id

        user_row = await self._find_user_by_mobile(normalized_phone)
        if user_row:
            user_id = user_row["id"]
        else:
            user_id = uuid4()
            username = f"patient_{normalized_phone[-10:]}"
            await self.session.execute(
                text(
                    """
                    INSERT INTO identity.users (
                      id, username, password_hash, full_name, mobile, status
                    )
                    VALUES (
                      :id, :username, :password_hash, :full_name, :mobile, 'active'
                    )
                    ON CONFLICT DO NOTHING
                    """
                ),
                {
                    "id": user_id,
                    "username": username,
                    "password_hash": hash_password(uuid4().hex),
                    "full_name": name.strip(),
                    "mobile": phone.strip(),
                },
            )
            await self.session.execute(
                text(
                    """
                    INSERT INTO identity.user_roles (user_id, role_id, is_primary)
                    SELECT :user_id, r.id, true
                    FROM identity.roles r
                    WHERE r.code = 'patient'
                      AND NOT EXISTS (
                        SELECT 1 FROM identity.user_roles ur
                        WHERE ur.user_id = :user_id AND ur.role_id = r.id AND ur.ends_at IS NULL
                      )
                    """
                ),
                {"user_id": user_id},
            )

        patient_code = f"MR-{str(user_id)[:8].upper()}"
        result = await self.session.execute(
            text(
                """
                INSERT INTO clinical.patients (
                  user_id, patient_code, journey_status, registered_at, status
                )
                VALUES (:user_id, :patient_code, 'registered', now(), 'active')
                ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
                RETURNING id
                """
            ),
            {"user_id": user_id, "patient_code": patient_code},
        )
        patient_id = result.scalar_one()
        await self._apply_intake_vitals(patient_id, intake)
        await self.session.flush()
        return patient_id

    async def _apply_intake_vitals(self, patient_id: UUID, intake: dict[str, Any] | None) -> None:
        if not intake:
            return
        updates: dict[str, Any] = {"patient_id": patient_id}
        if intake.get("weight"):
            updates["current_weight_kg"] = float(intake["weight"])
        if intake.get("height"):
            updates["height_cm"] = float(intake["height"]) * 100
        if len(updates) <= 1:
            return
        sets = ", ".join(f"{k} = :{k}" for k in updates if k != "patient_id")
        await self.session.execute(
            text(f"UPDATE clinical.patients SET {sets}, updated_at = now() WHERE id = :patient_id"),
            updates,
        )

    async def _find_patient_by_phone(self, normalized_phone: str) -> dict[str, Any] | None:
        result = await self.session.execute(
            text(
                """
                SELECT p.id, p.user_id
                FROM clinical.patients p
                JOIN identity.users u ON u.id = p.user_id
                WHERE right(regexp_replace(u.mobile, '\\D', '', 'g'), 10) = :phone
                LIMIT 1
                """
            ),
            {"phone": normalized_phone},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def _find_user_by_mobile(self, normalized_phone: str) -> dict[str, Any] | None:
        result = await self.session.execute(
            text(
                """
                SELECT id, full_name, mobile
                FROM identity.users
                WHERE right(regexp_replace(mobile, '\\D', '', 'g'), 10) = :phone
                LIMIT 1
                """
            ),
            {"phone": normalized_phone},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def _get_patient_core(self, patient_id: UUID) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                SELECT p.*, u.full_name, u.email, u.mobile, u.gender, u.dob
                FROM clinical.patients p
                JOIN identity.users u ON u.id = p.user_id
                WHERE p.id = :patient_id
                """
            ),
            {"patient_id": patient_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError("Patient not found", status_code=404, error="not_found")
        return dict(row)

    async def _assert_clinical_read(self, user_id: UUID | None, roles: list[str]) -> None:
        if not set(roles).intersection(CLINICAL_READ_ROLES):
            raise AppError("Insufficient permissions", status_code=403, error="forbidden")

    async def _assert_patient_access(self, user_id: UUID | None, roles: list[str], patient_id: UUID) -> None:
        await self._assert_clinical_read(user_id, roles)
        scope = await resolve_patient_access_scope(self.session, user_id=user_id, roles=roles)
        if await patient_matches_scope(self.session, patient_id=patient_id, scope=scope):
            return
        raise AppError("Patient not accessible for your role", status_code=403, error="forbidden")

    def _build_summary_card(self, core: dict[str, Any], dashboard: dict[str, Any] | None) -> dict[str, Any]:
        alerts: list[str] = []
        if dashboard and dashboard.get("latest_fibroscan_kpa") and float(dashboard["latest_fibroscan_kpa"]) >= 9:
            alerts.append("High Liver Fibrosis Scan")
        if core.get("diabetes"):
            alerts.append("Diabetes")
        risk = "Low"
        if dashboard:
            if float(dashboard.get("risk_score") or 0) >= 70:
                risk = "High"
            elif float(dashboard.get("risk_score") or 0) >= 40:
                risk = "Moderate"
        age = None
        if core.get("dob"):
            age = int((datetime.now(UTC) - core["dob"]).days / 365.25)
        age_gender = f"{age}/{core.get('gender') or '—'}" if age else str(core.get("gender") or "—")
        return {
            "patientCode": core["patient_code"],
            "name": core["full_name"],
            "ageGender": age_gender,
            "bmi": float(core["bmi"]) if core.get("bmi") is not None else None,
            "riskCategory": risk,
            "diagnosis": dashboard.get("active_package_name") if dashboard else None,
            "diabetes": "Yes" if core.get("diabetes") else "No",
            "alcohol": core.get("alcohol_status") or "Unknown",
            "currentPlan": dashboard.get("active_package_name") if dashboard else None,
            "liverScore": dashboard.get("liver_score") if dashboard else None,
            "fibrosisStage": dashboard.get("fibrosis_stage") if dashboard else None,
            "alerts": alerts,
            "journeyStatus": core.get("journey_status"),
        }
