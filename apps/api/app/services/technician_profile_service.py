from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError

TECH_DOCUMENT_TYPES = frozenset({
    "aadhaar", "pan", "driving_license", "police_verification", "medical_certificate",
    "employment_contract", "nda", "training_certificate", "other",
})

TECH_SELF_FIELDS = frozenset({
    "emergencyContactName", "emergencyContactMobile", "emergencyContactRelation",
    "homeLine1", "homeLine2", "homeCity", "homeState", "homePincode",
    "vehicleType", "vehicleNumber",
})

EMPLOYEE_FIELD_MAP = {
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
    "vehicleType": "vehicle_type",
    "vehicleNumber": "vehicle_number",
    "joinedOn": "joined_on",
    "bankAccountLast4": "bank_account_last4",
    "additionalNotes": "additional_notes",
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


def _map_profile(
    tech: dict[str, Any],
    employee: dict[str, Any] | None,
    pincodes: list[dict[str, Any]],
    documents: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "id": tech["id"],
        "userId": tech["user_id"],
        "employeeCode": tech.get("employee_code"),
        "fullName": tech["full_name"],
        "email": tech.get("email"),
        "mobile": tech.get("mobile"),
        "gender": tech.get("gender"),
        "dob": tech.get("dob"),
        "profilePhotoUrl": tech.get("profile_photo_url"),
        "clinicId": tech.get("clinic_id"),
        "cityId": tech.get("city_id"),
        "verificationStatus": tech.get("verification_status") or "pending",
        "status": tech.get("status") or "active",
        "technicianType": tech.get("technician_type"),
        "maxAppointmentsPerDay": tech.get("max_appointments_per_day"),
        "serviceZone": tech.get("service_zone"),
        "rating": float(tech["rating"]) if tech.get("rating") is not None else None,
        "employee": {
            "homeLine1": (employee or {}).get("home_line1"),
            "homeLine2": (employee or {}).get("home_line2"),
            "homeCity": (employee or {}).get("home_city"),
            "homeState": (employee or {}).get("home_state"),
            "homePincode": (employee or {}).get("home_pincode"),
            "emergencyContactName": (employee or {}).get("emergency_contact_name"),
            "emergencyContactMobile": (employee or {}).get("emergency_contact_mobile"),
            "emergencyContactRelation": (employee or {}).get("emergency_contact_relation"),
            "qualification": (employee or {}).get("qualification"),
            "certification": (employee or {}).get("certification"),
            "vehicleType": (employee or {}).get("vehicle_type"),
            "vehicleNumber": (employee or {}).get("vehicle_number"),
            "joinedOn": (employee or {}).get("joined_on"),
            "bankAccountLast4": (employee or {}).get("bank_account_last4"),
            "additionalNotes": (employee or {}).get("additional_notes"),
        },
        "servicePincodes": [{"pincode": p["pincode"], "isActive": p["is_active"]} for p in pincodes],
        "documents": [_map_document(d) for d in documents],
    }


class TechnicianProfileService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def resolve_technician_id(self, technician_or_user_id: UUID, *, by_user: bool = False) -> UUID:
        col = "user_id" if by_user else "id"
        result = await self.db.execute(
            text(f"SELECT id FROM operations.technicians WHERE {col} = :value LIMIT 1"),
            {"value": technician_or_user_id},
        )
        row = result.scalar_one_or_none()
        if not row:
            raise AppError("Technician not found", status_code=404)
        return row

    async def resolve_technician_id_flexible(self, technician_or_user_id: UUID) -> UUID:
        try:
            return await self.resolve_technician_id(technician_or_user_id, by_user=False)
        except AppError:
            return await self.resolve_technician_id(technician_or_user_id, by_user=True)

    async def load_bundle(self, technician_id: UUID) -> dict[str, Any]:
        tech_result = await self.db.execute(
            text(
                """
                SELECT t.*, u.full_name, u.email, u.mobile, u.gender, u.dob, u.profile_photo_url
                FROM operations.technicians t
                JOIN identity.users u ON u.id = t.user_id
                WHERE t.id = :technician_id
                """
            ),
            {"technician_id": technician_id},
        )
        tech = tech_result.mappings().first()
        if not tech:
            raise AppError("Technician not found", status_code=404)

        emp_result = await self.db.execute(
            text("SELECT * FROM operations.technician_employee_profiles WHERE technician_id = :id"),
            {"id": technician_id},
        )
        employee = emp_result.mappings().first()

        pin_result = await self.db.execute(
            text(
                """
                SELECT pincode, is_active FROM operations.technician_service_pincodes
                WHERE technician_id = :id ORDER BY pincode
                """
            ),
            {"id": technician_id},
        )
        doc_result = await self.db.execute(
            text(
                """
                SELECT * FROM operations.technician_compliance_documents
                WHERE technician_id = :id ORDER BY created_at DESC
                """
            ),
            {"id": technician_id},
        )
        return _map_profile(
            dict(tech),
            dict(employee) if employee else None,
            [dict(r) for r in pin_result.mappings().all()],
            [dict(r) for r in doc_result.mappings().all()],
        )

    async def _upsert_employee(self, technician_id: UUID, body: dict[str, Any]) -> None:
        await self.db.execute(
            text(
                """
                INSERT INTO operations.technician_employee_profiles (technician_id)
                VALUES (:technician_id) ON CONFLICT (technician_id) DO NOTHING
                """
            ),
            {"technician_id": technician_id},
        )
        sets: list[str] = []
        params: dict[str, Any] = {"technician_id": technician_id}
        for key, col in EMPLOYEE_FIELD_MAP.items():
            if body.get(key) is not None:
                params[col] = body[key]
                sets.append(f"{col} = :{col}")
        if sets:
            await self.db.execute(
                text(
                    f"UPDATE operations.technician_employee_profiles SET {', '.join(sets)} "
                    "WHERE technician_id = :technician_id"
                ),
                params,
            )

    async def update_profile(
        self,
        technician_id: UUID,
        body: dict[str, Any],
        *,
        actor_role: str = "admin",
    ) -> dict[str, Any]:
        tech_result = await self.db.execute(
            text("SELECT user_id FROM operations.technicians WHERE id = :id"),
            {"id": technician_id},
        )
        tech = tech_result.mappings().first()
        if not tech:
            raise AppError("Technician not found", status_code=404)

        is_self = actor_role == "technician"
        source = {**(body.get("employee") or {}), **body}

        if is_self:
            employee_payload = {k: source[k] for k in TECH_SELF_FIELDS if source.get(k) is not None}
            await self._upsert_employee(technician_id, employee_payload)
        else:
            await self._upsert_employee(technician_id, body.get("employee") or source)
            user_fields = {
                "fullName": "full_name",
                "email": "email",
                "mobile": "mobile",
                "gender": "gender",
                "dob": "dob",
                "profilePhotoUrl": "profile_photo_url",
            }
            user_sets: list[str] = []
            user_params: dict[str, Any] = {"user_id": tech["user_id"]}
            for key, col in user_fields.items():
                if body.get(key) is not None:
                    user_params[col] = body[key]
                    user_sets.append(f"{col} = :{col}")
            if user_sets:
                await self.db.execute(
                    text(f"UPDATE identity.users SET {', '.join(user_sets)} WHERE id = :user_id"),
                    user_params,
                )

            tech_fields = {
                "clinicId": "clinic_id",
                "cityId": "city_id",
                "verificationStatus": "verification_status",
                "technicianType": "technician_type",
                "maxAppointmentsPerDay": "max_appointments_per_day",
                "serviceZone": "service_zone",
                "status": "status",
                "rating": "rating",
            }
            tech_sets: list[str] = []
            tech_params: dict[str, Any] = {"id": technician_id}
            for key, col in tech_fields.items():
                if body.get(key) is not None:
                    tech_params[col] = body[key]
                    tech_sets.append(f"{col} = :{col}")
            if tech_sets:
                await self.db.execute(
                    text(
                        f"UPDATE operations.technicians SET {', '.join(tech_sets)}, updated_at = now() "
                        "WHERE id = :id"
                    ),
                    tech_params,
                )

        return await self.load_bundle(technician_id)

    async def set_service_pincodes(self, technician_id: UUID, pincodes: list[str]) -> dict[str, Any]:
        normalized = list(dict.fromkeys(str(p).strip() for p in pincodes if str(p).strip()))
        await self.db.execute(
            text(
                "UPDATE operations.technician_service_pincodes SET is_active = false WHERE technician_id = :id"
            ),
            {"id": technician_id},
        )
        for pincode in normalized:
            await self.db.execute(
                text(
                    """
                    INSERT INTO operations.technician_service_pincodes (technician_id, pincode, is_active)
                    VALUES (:technician_id, :pincode, true)
                    ON CONFLICT (technician_id, pincode) DO UPDATE SET is_active = true
                    """
                ),
                {"technician_id": technician_id, "pincode": pincode},
            )
        return await self.load_bundle(technician_id)

    async def add_document(self, technician_id: UUID, user_id: UUID, body: dict[str, Any]) -> dict[str, Any]:
        doc_type = body.get("documentType")
        if not doc_type or doc_type not in TECH_DOCUMENT_TYPES:
            raise AppError(f"documentType must be one of: {', '.join(sorted(TECH_DOCUMENT_TYPES))}")

        file_id = body.get("fileId")
        storage_url = body.get("storageUrl")
        if not file_id and body.get("fileName") and storage_url:
            file_result = await self.db.execute(
                text(
                    """
                    INSERT INTO storage.files (owner_user_id, file_type, file_name, mime_type, storage_url, uploaded_by)
                    VALUES (:owner, 'technician_compliance', :file_name, :mime_type, :storage_url, :uploaded_by)
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
                INSERT INTO operations.technician_compliance_documents (
                  technician_id, document_type, document_number, file_id, storage_url,
                  issued_on, expires_on, notes
                )
                VALUES (
                  :technician_id, CAST(:document_type AS operations.technician_document_type_enum),
                  :document_number, :file_id, :storage_url, :issued_on, :expires_on, :notes
                )
                RETURNING *
                """
            ),
            {
                "technician_id": technician_id,
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
                UPDATE operations.technician_compliance_documents
                SET status = CAST(:status AS operations.compliance_doc_status_enum),
                    verified_by = :reviewer_id, verified_at = now(),
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

    async def mark_profile_verified(self, technician_id: UUID) -> dict[str, Any]:
        await self.db.execute(
            text(
                """
                UPDATE operations.technicians
                SET verification_status = 'verified', status = 'active', updated_at = now()
                WHERE id = :id
                """
            ),
            {"id": technician_id},
        )
        tech = await self.db.execute(
            text("SELECT user_id FROM operations.technicians WHERE id = :id"),
            {"id": technician_id},
        )
        user_id = tech.scalar_one_or_none()
        if user_id:
            await self.db.execute(
                text("UPDATE identity.users SET status = 'active' WHERE id = :user_id"),
                {"user_id": user_id},
            )
        return await self.load_bundle(technician_id)
