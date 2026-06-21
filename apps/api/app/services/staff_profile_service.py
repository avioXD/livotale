from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError

HR_ROLES = frozenset({"doctor", "lab_partner", "dietician", "health_coach", "pharmacy", "operations"})

STAFF_PROFILE_SLUGS: dict[str, str] = {
    "doctors": "doctor",
    "lab-partners": "lab_partner",
    "dieticians": "dietician",
    "health-coaches": "health_coach",
    "pharmacy": "pharmacy",
    "operations": "operations",
    "super-admins": "operations",
}

DOCUMENT_TYPES = frozenset({
    "aadhaar", "pan", "driving_license", "police_verification", "medical_certificate",
    "employment_contract", "nda", "training_certificate", "medical_registration",
    "degree_certificate", "indemnity_insurance", "lab_registration", "nabl_certificate",
    "gst_certificate", "drug_license", "shop_establishment", "professional_registration",
    "coaching_certification", "other",
})

SELF_EMPLOYEE_FIELDS = frozenset({
    "homeLine1", "homeLine2", "homeCity", "homeState", "homePincode",
    "emergencyContactName", "emergencyContactMobile", "emergencyContactRelation",
    "clinicOrOrgName", "specialization", "certification", "vehicleType", "vehicleNumber",
    "languagesKnown",
})

FIELD_MAP = {
    "homeLine1": "home_line1",
    "homeLine2": "home_line2",
    "homeCity": "home_city",
    "homeState": "home_state",
    "homePincode": "home_pincode",
    "emergencyContactName": "emergency_contact_name",
    "emergencyContactMobile": "emergency_contact_mobile",
    "emergencyContactRelation": "emergency_contact_relation",
    "qualification": "qualification",
    "certification": "certification",
    "registrationNumber": "registration_number",
    "clinicOrOrgName": "clinic_or_org_name",
    "specialization": "specialization",
    "vehicleType": "vehicle_type",
    "vehicleNumber": "vehicle_number",
    "joinedOn": "joined_on",
    "bankAccountLast4": "bank_account_last4",
    "additionalNotes": "additional_notes",
    "verificationStatus": "verification_status",
    "status": "employment_status",
    "employeeCode": "employee_code",
}


def _map_document(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "documentType": row["document_type"],
        "documentNumber": row.get("document_number"),
        "fileId": row.get("file_id"),
        "storageUrl": row.get("storage_url"),
        "issuedOn": row.get("issued_on"),
        "expiresOn": row.get("expires_on"),
        "status": row["status"],
        "verifiedAt": row.get("verified_at"),
        "notes": row.get("notes"),
        "createdAt": row["created_at"],
    }


def _normalize_languages(value: Any) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise AppError("languagesKnown must be an array", status_code=400)
    return [str(lang).strip() for lang in value if str(lang).strip()]


def _map_profile(member: dict[str, Any], hr: dict[str, Any] | None, documents: list[dict[str, Any]]) -> dict[str, Any]:
    meta = dict((hr or {}).get("meta") or {})
    languages_known = member.get("languages_known")
    if isinstance(languages_known, list):
        languages = [str(lang) for lang in languages_known if lang]
    else:
        raw = meta.get("languagesKnown")
        languages = [str(lang) for lang in raw] if isinstance(raw, list) else []
    if languages:
        meta["languagesKnown"] = languages
    return {
        "id": member["id"],
        "role": member.get("role_key") or member.get("role"),
        "userId": member.get("user_id"),
        "employeeCode": (hr or {}).get("employee_code"),
        "fullName": member["full_name"],
        "email": member.get("email"),
        "mobile": member.get("mobile"),
        "gender": member.get("gender"),
        "dob": member.get("dob"),
        "profilePhotoUrl": member.get("profile_photo_url"),
        "verificationStatus": (hr or {}).get("verification_status") or "pending",
        "status": (hr or {}).get("employment_status") or "active",
        "employee": {
            "homeLine1": (hr or {}).get("home_line1"),
            "homeLine2": (hr or {}).get("home_line2"),
            "homeCity": (hr or {}).get("home_city"),
            "homeState": (hr or {}).get("home_state"),
            "homePincode": (hr or {}).get("home_pincode"),
            "emergencyContactName": (hr or {}).get("emergency_contact_name"),
            "emergencyContactMobile": (hr or {}).get("emergency_contact_mobile"),
            "emergencyContactRelation": (hr or {}).get("emergency_contact_relation"),
            "qualification": (hr or {}).get("qualification") or member.get("qualification"),
            "certification": (hr or {}).get("certification"),
            "registrationNumber": (hr or {}).get("registration_number") or member.get("registration_number"),
            "clinicOrOrgName": (hr or {}).get("clinic_or_org_name") or member.get("clinic_name"),
            "specialization": (hr or {}).get("specialization") or member.get("specialization"),
            "languagesKnown": languages,
            "vehicleType": (hr or {}).get("vehicle_type"),
            "vehicleNumber": (hr or {}).get("vehicle_number"),
            "joinedOn": (hr or {}).get("joined_on"),
            "bankAccountLast4": (hr or {}).get("bank_account_last4"),
            "additionalNotes": (hr or {}).get("additional_notes"),
        },
        "documents": [_map_document(d) for d in documents],
        "meta": meta,
    }


class StaffProfileService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def resolve_hr_role(self, role_slug: str) -> str:
        role = STAFF_PROFILE_SLUGS.get(role_slug)
        if not role:
            raise AppError(f"Unsupported staff role slug: {role_slug}", status_code=404)
        return role

    async def resolve_member(self, role: str, member_id: UUID) -> dict[str, Any]:
        member = await self._lookup_member(role, member_id)
        if member:
            return member
        member = await self._lookup_member_by_user(role, member_id)
        if member:
            return member
        raise AppError("Staff member not found", status_code=404)

    async def _lookup_member(self, role: str, member_id: UUID) -> dict[str, Any] | None:
        if role == "doctor":
            result = await self.db.execute(
                text(
                    """
                    SELECT d.id, d.user_id, u.full_name, u.email, u.mobile, u.gender, u.dob,
                           u.profile_photo_url, d.registration_number, d.specialization,
                           d.qualification, d.languages_known, c.name AS clinic_name
                    FROM clinical.doctors d
                    JOIN identity.users u ON u.id = d.user_id
                    LEFT JOIN core.clinics c ON c.id = d.clinic_id
                    WHERE d.id = :member_id
                    """
                ),
                {"member_id": member_id},
            )
        elif role == "lab_partner":
            result = await self.db.execute(
                text(
                    """
                    SELECT lp.id, lp.contact_user_id AS user_id, lp.name AS full_name,
                           lp.email, lp.contact_number AS mobile, NULL::varchar AS gender, NULL::date AS dob,
                           NULL::text AS profile_photo_url, lp.registration_number,
                           NULL::varchar AS specialization, NULL::varchar AS qualification,
                           lp.name AS clinic_name
                    FROM operations.lab_partners lp
                    WHERE lp.id = :member_id
                    """
                ),
                {"member_id": member_id},
            )
        elif role == "operations":
            result = await self.db.execute(
                text(
                    """
                    SELECT u.id, u.id AS user_id, u.full_name, u.email, u.mobile, u.gender, u.dob,
                           u.profile_photo_url, NULL::varchar AS registration_number,
                           NULL::varchar AS specialization, NULL::varchar AS qualification,
                           NULL::varchar AS clinic_name
                    FROM identity.users u
                    JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                    JOIN identity.roles r ON r.id = ur.role_id
                    WHERE u.id = :member_id
                      AND r.code = ANY(:role_codes)
                    """
                ),
                {"member_id": member_id, "role_codes": ["admin", "support", "city_manager"]},
            )
        else:
            role_code = role
            result = await self.db.execute(
                text(
                    """
                    SELECT u.id, u.id AS user_id, u.full_name, u.email, u.mobile, u.gender, u.dob,
                           u.profile_photo_url, NULL::varchar AS registration_number,
                           NULL::varchar AS specialization, NULL::varchar AS qualification,
                           NULL::varchar AS clinic_name
                    FROM identity.users u
                    JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                    JOIN identity.roles r ON r.id = ur.role_id
                    WHERE u.id = :member_id AND r.code = :role_code
                    """
                ),
                {"member_id": member_id, "role_code": role_code},
            )

        row = result.mappings().first()
        if not row:
            return None
        data = dict(row)
        data["role"] = role
        data["role_key"] = role
        return data

    async def _lookup_member_by_user(self, role: str, user_id: UUID) -> dict[str, Any] | None:
        if role == "doctor":
            result = await self.db.execute(
                text(
                    """
                    SELECT d.id, d.user_id, u.full_name, u.email, u.mobile, u.gender, u.dob,
                           u.profile_photo_url, d.registration_number, d.specialization,
                           d.qualification, d.languages_known, c.name AS clinic_name
                    FROM clinical.doctors d
                    JOIN identity.users u ON u.id = d.user_id
                    LEFT JOIN core.clinics c ON c.id = d.clinic_id
                    WHERE d.user_id = :user_id
                    """
                ),
                {"user_id": user_id},
            )
        elif role == "lab_partner":
            result = await self.db.execute(
                text(
                    """
                    SELECT lp.id, lp.contact_user_id AS user_id, lp.name AS full_name,
                           lp.email, lp.contact_number AS mobile, NULL::varchar AS gender, NULL::date AS dob,
                           NULL::text AS profile_photo_url, lp.registration_number,
                           NULL::varchar AS specialization, NULL::varchar AS qualification,
                           lp.name AS clinic_name
                    FROM operations.lab_partners lp
                    WHERE lp.contact_user_id = :user_id
                    """
                ),
                {"user_id": user_id},
            )
        elif role == "operations":
            result = await self.db.execute(
                text(
                    """
                    SELECT u.id, u.id AS user_id, u.full_name, u.email, u.mobile, u.gender, u.dob,
                           u.profile_photo_url, NULL::varchar AS registration_number,
                           NULL::varchar AS specialization, NULL::varchar AS qualification,
                           NULL::varchar AS clinic_name
                    FROM identity.users u
                    JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                    JOIN identity.roles r ON r.id = ur.role_id
                    WHERE u.id = :user_id
                      AND r.code = ANY(:role_codes)
                    """
                ),
                {"user_id": user_id, "role_codes": ["admin", "support", "city_manager"]},
            )
        else:
            role_code = role
            result = await self.db.execute(
                text(
                    """
                    SELECT u.id, u.id AS user_id, u.full_name, u.email, u.mobile, u.gender, u.dob,
                           u.profile_photo_url, NULL::varchar AS registration_number,
                           NULL::varchar AS specialization, NULL::varchar AS qualification,
                           NULL::varchar AS clinic_name
                    FROM identity.users u
                    JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                    JOIN identity.roles r ON r.id = ur.role_id
                    WHERE u.id = :user_id AND r.code = :role_code
                    """
                ),
                {"user_id": user_id, "role_code": role_code},
            )

        row = result.mappings().first()
        if not row:
            return None
        data = dict(row)
        data["role"] = role
        data["role_key"] = role
        return data

    async def resolve_member_id_for_user(self, role: str, user_id: UUID) -> UUID:
        if role == "doctor":
            result = await self.db.execute(
                text("SELECT id FROM clinical.doctors WHERE user_id = :user_id LIMIT 1"),
                {"user_id": user_id},
            )
            row = result.scalar_one_or_none()
            if not row:
                raise AppError("Doctor profile not found", status_code=404)
            return row
        if role == "lab_partner":
            result = await self.db.execute(
                text("SELECT id FROM operations.lab_partners WHERE contact_user_id = :user_id LIMIT 1"),
                {"user_id": user_id},
            )
            row = result.scalar_one_or_none()
            if not row:
                raise AppError("Lab partner profile not found", status_code=404)
            return row
        if role == "operations":
            result = await self.db.execute(
                text(
                    """
                    SELECT u.id FROM identity.users u
                    JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                    JOIN identity.roles r ON r.id = ur.role_id
                    WHERE u.id = :user_id AND r.code = ANY(:codes)
                    """
                ),
                {"user_id": user_id, "codes": ["admin", "support", "city_manager"]},
            )
            row = result.scalar_one_or_none()
            if not row:
                raise AppError("Staff profile not found", status_code=404)
            return row
        result = await self.db.execute(
            text(
                """
                SELECT u.id FROM identity.users u
                JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                JOIN identity.roles r ON r.id = ur.role_id
                WHERE u.id = :user_id AND r.code = :role_code
                """
            ),
            {"user_id": user_id, "role_code": role},
        )
        row = result.scalar_one_or_none()
        if not row:
            raise AppError("Staff profile not found", status_code=404)
        return row

    async def _ensure_hr_profile(self, role: str, member_id: UUID, member: dict[str, Any]) -> dict[str, Any] | None:
        existing = await self.db.execute(
            text(
                """
                SELECT * FROM operations.staff_hr_profiles
                WHERE role = CAST(:role AS operations.staff_hr_role_enum) AND member_id = :member_id
                """
            ),
            {"role": role, "member_id": member_id},
        )
        row = existing.mappings().first()
        if row:
            return dict(row)

        inserted = await self.db.execute(
            text(
                """
                INSERT INTO operations.staff_hr_profiles (
                  role, member_id, user_id, registration_number, specialization,
                  clinic_or_org_name, qualification
                )
                VALUES (
                  CAST(:role AS operations.staff_hr_role_enum), :member_id, :user_id,
                  :registration_number, :specialization, :clinic_or_org_name, :qualification
                )
                RETURNING *
                """
            ),
            {
                "role": role,
                "member_id": member_id,
                "user_id": member.get("user_id"),
                "registration_number": member.get("registration_number"),
                "specialization": member.get("specialization"),
                "clinic_or_org_name": member.get("clinic_name"),
                "qualification": member.get("qualification"),
            },
        )
        return dict(inserted.mappings().first())

    async def load_bundle(self, role: str, member_id: UUID) -> dict[str, Any]:
        member = await self.resolve_member(role, member_id)
        hr = await self._ensure_hr_profile(role, member_id, member)
        docs: list[dict[str, Any]] = []
        if hr:
            doc_result = await self.db.execute(
                text(
                    """
                    SELECT * FROM operations.staff_hr_documents
                    WHERE profile_id = :profile_id
                    ORDER BY created_at DESC
                    """
                ),
                {"profile_id": hr["id"]},
            )
            docs = [dict(r) for r in doc_result.mappings().all()]
        return _map_profile(member, hr, docs)

    async def update_profile(
        self,
        role: str,
        member_id: UUID,
        body: dict[str, Any],
        *,
        actor_role: str = "admin",
    ) -> dict[str, Any]:
        member = await self.resolve_member(role, member_id)
        hr = await self._ensure_hr_profile(role, member_id, member)
        if not hr:
            raise AppError("Staff HR profile tables are not configured", status_code=400)

        is_self = actor_role == "self"
        source = {**(body.get("employee") or {}), **body}
        sets: list[str] = []
        params: dict[str, Any] = {"profile_id": hr["id"]}

        for key, col in FIELD_MAP.items():
            if source.get(key) is None and body.get(key) is None:
                continue
            value = source.get(key) if key in source else body.get(key)
            if value is None:
                continue
            if is_self and key not in SELF_EMPLOYEE_FIELDS:
                continue
            param_key = f"f_{col}"
            params[param_key] = value
            sets.append(f"{col} = :{param_key}")

        if body.get("meta") is not None and not is_self:
            existing_meta = dict(hr.get("meta") or {})
            if isinstance(body["meta"], dict):
                incoming = body["meta"]
                if role == "operations":
                    incoming = self._normalize_operations_meta(incoming, existing_meta)
                existing_meta.update(incoming)
            params["meta"] = json.dumps(existing_meta)
            sets.append("meta = CAST(:meta AS jsonb)")
            body = {**body, "meta": existing_meta}

        if sets:
            await self.db.execute(
                text(f"UPDATE operations.staff_hr_profiles SET {', '.join(sets)} WHERE id = :profile_id"),
                params,
            )

        if not is_self and member.get("user_id"):
            user_fields = {
                "fullName": "full_name",
                "email": "email",
                "mobile": "mobile",
                "gender": "gender",
                "dob": "dob",
                "profilePhotoUrl": "profile_photo_url",
            }
            user_sets: list[str] = []
            user_params: dict[str, Any] = {"user_id": member["user_id"]}
            for key, col in user_fields.items():
                if body.get(key) is not None:
                    user_params[col] = body[key]
                    user_sets.append(f"{col} = :{col}")
            if user_sets:
                await self.db.execute(
                    text(f"UPDATE identity.users SET {', '.join(user_sets)} WHERE id = :user_id"),
                    user_params,
                )

        if role == "doctor" and is_self and isinstance(body.get("meta"), dict) and "languagesKnown" in body["meta"]:
            merged_meta = dict(hr.get("meta") or {})
            merged_meta["languagesKnown"] = _normalize_languages(body["meta"]["languagesKnown"])
            await self.db.execute(
                text("UPDATE operations.staff_hr_profiles SET meta = CAST(:meta AS jsonb) WHERE id = :profile_id"),
                {"meta": json.dumps(merged_meta), "profile_id": hr["id"]},
            )
            body = {**body, "meta": merged_meta}

        if role == "doctor":
            await self._sync_doctor_clinical(member_id, source, body)

        if role == "operations" and not is_self and member.get("user_id"):
            merged_meta = body.get("meta")
            if isinstance(merged_meta, dict):
                await self._sync_operations_scope(UUID(str(member["user_id"])), merged_meta)

        return await self.load_bundle(role, member_id)

    async def add_document(
        self,
        role: str,
        member_id: UUID,
        user_id: UUID,
        body: dict[str, Any],
    ) -> dict[str, Any]:
        doc_type = body.get("documentType")
        if not doc_type or doc_type not in DOCUMENT_TYPES:
            raise AppError(f"documentType must be one of: {', '.join(sorted(DOCUMENT_TYPES))}")

        member = await self.resolve_member(role, member_id)
        hr = await self._ensure_hr_profile(role, member_id, member)
        if not hr:
            raise AppError("Staff HR document tables are not configured", status_code=400)

        file_id = body.get("fileId")
        storage_url = body.get("storageUrl")
        if not file_id and body.get("fileName") and storage_url:
            file_result = await self.db.execute(
                text(
                    """
                    INSERT INTO storage.files (owner_user_id, file_type, file_name, mime_type, storage_url, uploaded_by)
                    VALUES (:owner, 'staff_compliance', :file_name, :mime_type, :storage_url, :uploaded_by)
                    RETURNING id
                    """
                ),
                {
                    "owner": user_id,
                    "file_name": body["fileName"],
                    "mime_type": body.get("mimeType") or "application/pdf",
                    "storage_url": storage_url,
                    "uploaded_by": user_id,
                },
            )
            file_id = file_result.scalar_one()

        inserted = await self.db.execute(
            text(
                """
                INSERT INTO operations.staff_hr_documents (
                  profile_id, document_type, document_number, file_id, storage_url,
                  issued_on, expires_on, notes
                )
                VALUES (
                  :profile_id, CAST(:document_type AS operations.staff_document_type_enum),
                  :document_number, :file_id, :storage_url, :issued_on, :expires_on, :notes
                )
                RETURNING *
                """
            ),
            {
                "profile_id": hr["id"],
                "document_type": doc_type,
                "document_number": body.get("documentNumber"),
                "file_id": file_id,
                "storage_url": storage_url,
                "issued_on": body.get("issuedOn"),
                "expires_on": body.get("expiresOn"),
                "notes": body.get("notes"),
            },
        )
        return _map_document(dict(inserted.mappings().first()))

    async def verify_document(
        self,
        document_id: UUID,
        reviewer_id: UUID,
        status: str,
        notes: str | None = None,
    ) -> dict[str, Any]:
        if status not in {"verified", "rejected", "expired"}:
            raise AppError("status must be verified, rejected, or expired")

        result = await self.db.execute(
            text(
                """
                UPDATE operations.staff_hr_documents
                SET status = CAST(:status AS operations.compliance_doc_status_enum),
                    verified_by = :reviewer_id,
                    verified_at = now(),
                    notes = COALESCE(:notes, notes)
                WHERE id = :document_id
                RETURNING *
                """
            ),
            {"document_id": document_id, "status": status, "reviewer_id": reviewer_id, "notes": notes},
        )
        row = result.mappings().first()
        if not row:
            raise AppError("Document not found", status_code=404)
        return _map_document(dict(row))

    async def mark_profile_verified(self, role: str, member_id: UUID) -> dict[str, Any]:
        member = await self.resolve_member(role, member_id)
        hr = await self._ensure_hr_profile(role, member_id, member)
        if not hr:
            raise AppError("Staff HR profile not found", status_code=404)
        await self.db.execute(
            text(
                """
                UPDATE operations.staff_hr_profiles
                SET verification_status = 'verified', employment_status = 'active'
                WHERE id = :profile_id
                """
            ),
            {"profile_id": hr["id"]},
        )
        if member.get("user_id"):
            await self.db.execute(
                text("UPDATE identity.users SET status = 'active' WHERE id = :user_id"),
                {"user_id": member["user_id"]},
            )
        if role == "doctor":
            await self.db.execute(
                text(
                    """
                    UPDATE clinical.doctors
                    SET status = 'active', updated_at = now()
                    WHERE id = :member_id
                    """
                ),
                {"member_id": member_id},
            )
            await self._sync_doctor_clinical(
                member_id,
                {
                    "registrationNumber": (hr or {}).get("registration_number"),
                    "specialization": (hr or {}).get("specialization"),
                    "qualification": (hr or {}).get("qualification"),
                },
                {"status": "active"},
            )
        return await self.load_bundle(role, member_id)

    async def _sync_doctor_clinical(
        self,
        member_id: UUID,
        source: dict[str, Any],
        body: dict[str, Any],
    ) -> None:
        """Keep clinical.doctors in sync with HR profile fields used by ops/assignment UIs."""
        clinical_fields = {
            "registrationNumber": "registration_number",
            "specialization": "specialization",
            "qualification": "qualification",
        }
        sets: list[str] = []
        params: dict[str, Any] = {"member_id": member_id}

        for key, col in clinical_fields.items():
            value = source.get(key) if key in source else body.get(key)
            if value is None:
                continue
            param_key = f"d_{col}"
            params[param_key] = value
            sets.append(f"{col} = :{param_key}")

        employment_status = body.get("status") or source.get("status")
        if employment_status is not None:
            clinical_status = "active" if employment_status == "active" else "inactive"
            params["clinical_status"] = clinical_status
            sets.append("status = CAST(:clinical_status AS core.record_status_enum)")

        languages = None
        meta = body.get("meta")
        if isinstance(meta, dict) and "languagesKnown" in meta:
            languages = meta["languagesKnown"]
        elif source.get("languagesKnown") is not None:
            languages = source.get("languagesKnown")

        if languages is not None:
            params["languages_known"] = _normalize_languages(languages)
            sets.append("languages_known = :languages_known")

        if not sets:
            return

        sets.append("updated_at = now()")
        await self.db.execute(
            text(f"UPDATE clinical.doctors SET {', '.join(sets)} WHERE id = :member_id"),
            params,
        )

    @staticmethod
    def _normalize_operations_meta(
        incoming: dict[str, Any],
        existing: dict[str, Any],
    ) -> dict[str, Any]:
        meta = {**existing, **incoming}
        zone_ids = [
            str(item).strip()
            for item in (meta.get("assignedServiceZoneIds") or [])
            if str(item).strip()
        ]
        pincodes = [
            str(item).strip()
            for item in (meta.get("assignedPincodes") or [])
            if str(item).strip()
        ]
        city_manager_zone_ids = [
            str(item).strip()
            for item in (meta.get("cityManagerServiceZoneIds") or [])
            if str(item).strip()
        ]
        city_manager_zone_ids = [zone_id for zone_id in city_manager_zone_ids if zone_id in zone_ids]
        if meta.get("isCityManagerPromoted") and zone_ids and not city_manager_zone_ids:
            city_manager_zone_ids = list(zone_ids)

        meta["assignedServiceZoneIds"] = zone_ids
        meta["assignedPincodes"] = pincodes
        meta["cityManagerServiceZoneIds"] = city_manager_zone_ids
        meta["isCityManagerPromoted"] = len(city_manager_zone_ids) > 0
        meta["assignedCity"] = meta.get("assignedCity")
        return meta

    async def _sync_operations_scope(self, user_id: UUID, meta: dict[str, Any]) -> None:
        city_manager_zone_ids = [
            str(item).strip()
            for item in (meta.get("cityManagerServiceZoneIds") or [])
            if str(item).strip()
        ]
        if city_manager_zone_ids:
            await self._ensure_role(user_id, "city_manager")
            return
        await self._end_role(user_id, "city_manager")

    async def _ensure_role(self, user_id: UUID, role_code: str) -> None:
        await self.db.execute(
            text(
                """
                INSERT INTO identity.user_roles (user_id, role_id)
                SELECT :user_id, r.id
                FROM identity.roles r
                WHERE r.code = :role_code
                  AND NOT EXISTS (
                    SELECT 1 FROM identity.user_roles ur
                    WHERE ur.user_id = :user_id AND ur.role_id = r.id AND ur.ends_at IS NULL
                  )
                """
            ),
            {"user_id": user_id, "role_code": role_code},
        )

    async def _end_role(self, user_id: UUID, role_code: str) -> None:
        await self.db.execute(
            text(
                """
                UPDATE identity.user_roles ur
                SET ends_at = now()
                FROM identity.roles r
                WHERE ur.role_id = r.id
                  AND ur.user_id = :user_id
                  AND r.code = :role_code
                  AND ur.ends_at IS NULL
                """
            ),
            {"user_id": user_id, "role_code": role_code},
        )
