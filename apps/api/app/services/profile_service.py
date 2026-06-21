from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError

VALID_GENDERS = frozenset({"male", "female", "other", "undisclosed"})


def _serialize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def _parse_dob(value: Any) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        return date.fromisoformat(value[:10])
    raise AppError("Invalid date of birth — use YYYY-MM-DD")


def _parse_gender(value: Any) -> str | None:
    if value is None or value == "":
        return None
    normalized = str(value).strip().lower()
    if normalized not in VALID_GENDERS:
        allowed = ", ".join(sorted(VALID_GENDERS))
        raise AppError(f"Invalid gender — must be one of: {allowed}")
    return normalized


class ProfileService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _patient_id(self, user_id: UUID) -> UUID | None:
        result = await self.db.execute(
            text(
                """
                SELECT id FROM clinical.patients
                WHERE user_id = :user_id AND status = 'active'
                ORDER BY created_at DESC LIMIT 1
                """
            ),
            {"user_id": user_id},
        )
        return result.scalar_one_or_none()

    async def get_profile(self, user_id: UUID) -> dict[str, Any]:
        user_result = await self.db.execute(
            text(
                """
                SELECT id, username, full_name, email, mobile, gender, dob, profile_photo_url,
                       status, last_login_at, twofa_enabled, password_changed_at
                FROM identity.users WHERE id = :user_id
                """
            ),
            {"user_id": user_id},
        )
        user = user_result.mappings().first()
        if not user:
            raise AppError("User not found", status_code=404)

        patient_id = await self._patient_id(user_id)
        patient = None
        addresses: list[dict[str, Any]] = []
        family_members: list[dict[str, Any]] = []
        insurance: list[dict[str, Any]] = []

        if patient_id:
            patient_result = await self.db.execute(
                text(
                    """
                    SELECT id, patient_code, emergency_contact_name, emergency_contact_mobile,
                           height_cm, current_weight_kg, bmi, blood_group
                    FROM clinical.patients WHERE id = :patient_id
                    """
                ),
                {"patient_id": patient_id},
            )
            patient = dict(patient_result.mappings().first() or {})

            addr_result = await self.db.execute(
                text(
                    """
                    SELECT id, address_type, line1, line2, city_id, pincode, is_default
                    FROM clinical.patient_addresses
                    WHERE patient_id = :patient_id
                    ORDER BY is_default DESC, created_at
                    """
                ),
                {"patient_id": patient_id},
            )
            addresses = [dict(r) for r in addr_result.mappings().all()]

            family_result = await self.db.execute(
                text(
                    """
                    SELECT id, full_name, relationship, mobile, email, dob,
                           is_emergency_contact, notes
                    FROM clinical.patient_family_members
                    WHERE patient_id = :patient_id ORDER BY created_at
                    """
                ),
                {"patient_id": patient_id},
            )
            family_members = [dict(r) for r in family_result.mappings().all()]

            insurance_result = await self.db.execute(
                text(
                    """
                    SELECT id, provider_name, policy_number, group_number,
                           valid_from, valid_until, is_primary
                    FROM clinical.patient_insurance
                    WHERE patient_id = :patient_id ORDER BY is_primary DESC
                    """
                ),
                {"patient_id": patient_id},
            )
            insurance = [dict(r) for r in insurance_result.mappings().all()]

        id_verify_result = await self.db.execute(
            text(
                """
                SELECT id, document_type, document_number, status, verified_at, created_at
                FROM identity.identity_verifications
                WHERE user_id = :user_id ORDER BY created_at DESC
                """
            ),
            {"user_id": user_id},
        )
        identity_verification = [dict(r) for r in id_verify_result.mappings().all()]

        basic = {key: _serialize_value(val) for key, val in dict(user).items()}

        return {
            "basic": basic,
            "patient": patient,
            "emergencyContact": (
                {
                    "name": patient.get("emergency_contact_name"),
                    "mobile": patient.get("emergency_contact_mobile"),
                }
                if patient
                else None
            ),
            "addresses": addresses,
            "familyMembers": family_members,
            "insurance": insurance,
            "identityVerification": identity_verification,
        }

    async def update_basic(self, user_id: UUID, body: dict[str, Any]) -> dict[str, Any]:
        # Self-service: identity email/username are org-managed and cannot be changed here.
        allowed = {
            "fullName": "full_name",
            "mobile": "mobile",
            "gender": "gender",
            "dob": "dob",
            "profilePhotoUrl": "profile_photo_url",
        }
        sets: list[str] = []
        params: dict[str, Any] = {"user_id": user_id}
        for key, col in allowed.items():
            if key not in body or body.get(key) is None:
                continue
            raw = body[key]
            if key == "dob":
                params[col] = _parse_dob(raw)
            elif key == "gender":
                parsed = _parse_gender(raw)
                if parsed is None:
                    continue
                params[col] = parsed
            elif key in ("mobile", "fullName", "profilePhotoUrl"):
                if isinstance(raw, str) and not raw.strip():
                    continue
                params[col] = raw.strip() if isinstance(raw, str) and key != "profilePhotoUrl" else raw
            else:
                params[col] = raw
            sets.append(f"{col} = :{col}")
        if not sets:
            raise AppError("No fields to update")
        await self.db.execute(
            text(f"UPDATE identity.users SET {', '.join(sets)} WHERE id = :user_id"),
            params,
        )
        return await self.get_profile(user_id)

    async def update_emergency_contact(self, user_id: UUID, body: dict[str, Any]) -> dict[str, Any]:
        patient_id = await self._patient_id(user_id)
        if not patient_id:
            raise AppError("Emergency contact is only available for patients")
        await self.db.execute(
            text(
                """
                UPDATE clinical.patients
                SET emergency_contact_name = :name, emergency_contact_mobile = :mobile
                WHERE id = :patient_id
                """
            ),
            {"patient_id": patient_id, "name": body.get("name"), "mobile": body.get("mobile")},
        )
        return await self.get_profile(user_id)
