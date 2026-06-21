from __future__ import annotations

import re
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.field_encryption import decrypt_field, encrypt_field
from app.services.audit_service import AuditService

IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
UPI_RE = re.compile(r"^[\w.\-]{2,256}@[\w]{2,64}$")
ADMIN_ROLES = frozenset({"admin"})
MASKED_VIEW_ROLES = frozenset({"support", "city_manager"})


def validate_ifsc(value: str) -> str:
    normalized = value.strip().upper()
    if not IFSC_RE.match(normalized):
        raise AppError("Invalid IFSC code", status_code=422)
    return normalized


def validate_account_number(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if not (9 <= len(digits) <= 18):
        raise AppError("Account number must be 9–18 digits", status_code=422)
    return digits


def validate_account_holder_name(value: str) -> str:
    name = value.strip()
    if len(name) < 2 or len(name) > 160:
        raise AppError("Account holder name must be 2–160 characters", status_code=422)
    return name


def validate_upi(value: str | None) -> str | None:
    if value is None:
        return None
    upi = value.strip()
    if not upi:
        return None
    if not UPI_RE.match(upi):
        raise AppError("Invalid UPI ID", status_code=422)
    return upi


class BankDetailsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditService(db)

    async def _fetch_row(self, user_id: UUID) -> dict[str, Any] | None:
        result = await self.db.execute(
            text(
                """
                SELECT
                  b.*,
                  u.full_name,
                  u.email,
                  u.mobile
                FROM identity.user_bank_accounts b
                JOIN identity.users u ON u.id = b.user_id
                WHERE b.user_id = :user_id
                """
            ),
            {"user_id": user_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    @staticmethod
    def _is_complete(row: dict[str, Any]) -> bool:
        return bool(
            row.get("account_holder_name")
            and row.get("account_number_encrypted")
            and row.get("ifsc_code")
            and row.get("verification_doc_file_id")
        )

    def _view_mode(
        self,
        *,
        target_user_id: UUID,
        viewer_id: UUID,
        viewer_roles: list[str],
        effective_roles: list[str],
    ) -> str:
        roles = effective_roles or viewer_roles
        if any(role in ADMIN_ROLES for role in roles):
            return "full"
        if viewer_id == target_user_id:
            return "full"
        if any(role in MASKED_VIEW_ROLES for role in roles):
            return "masked"
        raise AppError("Forbidden", status_code=403, error="forbidden")

    def _serialize_row(self, row: dict[str, Any], *, view_mode: str) -> dict[str, Any]:
        has_doc = bool(row.get("verification_doc_file_id"))
        payload: dict[str, Any] = {
            "userId": row["user_id"],
            "accountHolderName": row.get("account_holder_name"),
            "accountNumberLast4": row.get("account_number_last4"),
            "ifscCode": row.get("ifsc_code"),
            "bankName": row.get("bank_name"),
            "branchName": row.get("branch_name"),
            "upiId": row.get("upi_id"),
            "verificationStatus": row.get("verification_status") or "pending",
            "hasVerificationDoc": has_doc,
            "requiredForPayout": bool(row.get("required_for_payout")),
            "verifiedAt": row.get("verified_at"),
        }
        if view_mode == "full":
            encrypted = row.get("account_number_encrypted")
            if encrypted:
                payload["accountNumber"] = decrypt_field(bytes(encrypted))
            else:
                payload["accountNumber"] = None
            payload["verificationDocFileId"] = row.get("verification_doc_file_id")
            payload["verificationNotes"] = row.get("verification_notes")
        return payload

    async def get_self(self, user_id: UUID) -> dict[str, Any]:
        row = await self._fetch_row(user_id)
        if not row:
            return {"configured": False, "requiredForPayout": False}
        return {
            "configured": True,
            "details": self._serialize_row(row, view_mode="full"),
        }

    async def get_for_user(
        self,
        target_user_id: UUID,
        *,
        viewer_id: UUID,
        viewer_roles: list[str],
        effective_roles: list[str],
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        row = await self._fetch_row(target_user_id)
        if not row:
            raise AppError("Bank details not found", status_code=404, error="not_found")

        view_mode = self._view_mode(
            target_user_id=target_user_id,
            viewer_id=viewer_id,
            viewer_roles=viewer_roles,
            effective_roles=effective_roles,
        )
        if viewer_id != target_user_id:
            await self.audit.log_activity(
                viewer_id,
                "bank_details.viewed",
                entity_type="user_bank_account",
                entity_id=target_user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"targetUserId": str(target_user_id), "masked": view_mode == "masked"},
            )
        return self._serialize_row(row, view_mode=view_mode)

    async def upsert_for_user(
        self,
        user_id: UUID,
        body: dict[str, Any],
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        holder = validate_account_holder_name(body["accountHolderName"])
        account_number = validate_account_number(body["accountNumber"])
        ifsc = validate_ifsc(body["ifscCode"])
        upi = validate_upi(body.get("upiId"))
        bank_name = (body.get("bankName") or "").strip() or None
        branch_name = (body.get("branchName") or "").strip() or None
        doc_id = body.get("verificationDocFileId")

        existing = await self._fetch_row(user_id)
        reset_verification = True
        if existing:
            reset_verification = False
            if existing.get("account_number_encrypted"):
                try:
                    current_number = decrypt_field(bytes(existing["account_number_encrypted"]))
                    if current_number != account_number:
                        reset_verification = True
                except AppError:
                    reset_verification = True
            else:
                reset_verification = True
            if doc_id and str(existing.get("verification_doc_file_id") or "") != str(doc_id):
                reset_verification = True
            if not doc_id and not existing.get("verification_doc_file_id"):
                raise AppError("Verification document is required", status_code=422)

        if doc_id:
            await self._assert_owned_file(user_id, UUID(str(doc_id)))

        encrypted = encrypt_field(account_number)
        last4 = account_number[-4:]
        verification_status = "pending" if reset_verification else (existing or {}).get("verification_status", "pending")
        verified_by = None if reset_verification else (existing or {}).get("verified_by")
        verified_at = None if reset_verification else (existing or {}).get("verified_at")
        verification_notes = None if reset_verification else (existing or {}).get("verification_notes")
        doc_value = doc_id or (existing or {}).get("verification_doc_file_id")

        await self.db.execute(
            text(
                """
                INSERT INTO identity.user_bank_accounts (
                  user_id, account_holder_name, account_number_encrypted, account_number_last4,
                  ifsc_code, bank_name, branch_name, upi_id, verification_status,
                  verification_doc_file_id, verified_by, verified_at, verification_notes
                )
                VALUES (
                  :user_id, :account_holder_name, :account_number_encrypted, :account_number_last4,
                  :ifsc_code, :bank_name, :branch_name, :upi_id, :verification_status,
                  :verification_doc_file_id, :verified_by, :verified_at, :verification_notes
                )
                ON CONFLICT (user_id) DO UPDATE SET
                  account_holder_name = EXCLUDED.account_holder_name,
                  account_number_encrypted = EXCLUDED.account_number_encrypted,
                  account_number_last4 = EXCLUDED.account_number_last4,
                  ifsc_code = EXCLUDED.ifsc_code,
                  bank_name = EXCLUDED.bank_name,
                  branch_name = EXCLUDED.branch_name,
                  upi_id = EXCLUDED.upi_id,
                  verification_status = EXCLUDED.verification_status,
                  verification_doc_file_id = EXCLUDED.verification_doc_file_id,
                  verified_by = EXCLUDED.verified_by,
                  verified_at = EXCLUDED.verified_at,
                  verification_notes = EXCLUDED.verification_notes,
                  updated_at = now()
                """
            ),
            {
                "user_id": user_id,
                "account_holder_name": holder,
                "account_number_encrypted": encrypted,
                "account_number_last4": last4,
                "ifsc_code": ifsc,
                "bank_name": bank_name,
                "branch_name": branch_name,
                "upi_id": upi,
                "verification_status": verification_status,
                "verification_doc_file_id": doc_value,
                "verified_by": verified_by,
                "verified_at": verified_at,
                "verification_notes": verification_notes,
            },
        )

        await self.audit.log_activity(
            user_id,
            "bank_details.updated",
            entity_type="user_bank_account",
            entity_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"targetUserId": str(user_id)},
        )

        row = await self._fetch_row(user_id)
        assert row is not None
        return self._serialize_row(row, view_mode="full")

    async def verify(
        self,
        target_user_id: UUID,
        verifier_id: UUID,
        status: str,
        notes: str | None,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        if status not in {"verified", "rejected"}:
            raise AppError("status must be verified or rejected", status_code=422)

        row = await self._fetch_row(target_user_id)
        if not row:
            raise AppError("Bank details not found", status_code=404)

        await self.db.execute(
            text(
                """
                UPDATE identity.user_bank_accounts
                SET verification_status = :status,
                    verified_by = :verified_by,
                    verified_at = now(),
                    verification_notes = :notes,
                    updated_at = now()
                WHERE user_id = :user_id
                """
            ),
            {
                "user_id": target_user_id,
                "status": status,
                "verified_by": verifier_id,
                "notes": notes,
            },
        )

        await self.audit.log_activity(
            verifier_id,
            "bank_details.verified",
            entity_type="user_bank_account",
            entity_id=target_user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"targetUserId": str(target_user_id), "status": status},
        )

        updated = await self._fetch_row(target_user_id)
        assert updated is not None
        return self._serialize_row(updated, view_mode="full")

    async def list_directory(
        self,
        *,
        status: str | None = None,
        role: str | None = None,
        q: str | None = None,
    ) -> list[dict[str, Any]]:
        if status == "missing":
            return []

        clauses = ["1=1"]
        params: dict[str, Any] = {}

        if status in {"pending", "verified", "rejected"}:
            clauses.append("b.verification_status = :status")
            params["status"] = status

        if q:
            clauses.append(
                "(u.full_name ILIKE :q OR u.email ILIKE :q OR u.mobile ILIKE :q OR b.ifsc_code ILIKE :q)"
            )
            params["q"] = f"%{q.strip()}%"

        if role:
            clauses.append(
                """
                EXISTS (
                  SELECT 1 FROM identity.user_roles ur
                  JOIN identity.roles r ON r.id = ur.role_id
                  WHERE ur.user_id = u.id AND ur.ends_at IS NULL AND r.code = :role_code
                )
                """
            )
            params["role_code"] = role

        result = await self.db.execute(
            text(
                f"""
                SELECT
                  u.id AS user_id,
                  u.full_name,
                  u.email,
                  u.mobile,
                  (
                    SELECT r.code
                    FROM identity.user_roles ur
                    JOIN identity.roles r ON r.id = ur.role_id
                    WHERE ur.user_id = u.id AND ur.ends_at IS NULL
                    ORDER BY r.code ASC
                    LIMIT 1
                  ) AS role,
                  b.account_holder_name,
                  b.account_number_last4,
                  b.ifsc_code,
                  b.bank_name,
                  b.verification_status,
                  b.required_for_payout,
                  b.verification_doc_file_id,
                  true AS configured
                FROM identity.user_bank_accounts b
                JOIN identity.users u ON u.id = b.user_id
                WHERE {' AND '.join(clauses)}
                ORDER BY b.updated_at DESC NULLS LAST, u.created_at DESC
                LIMIT 500
                """
            ),
            params,
        )

        rows: list[dict[str, Any]] = []
        for row in result.mappings().all():
            data = dict(row)
            rows.append(
                {
                    "userId": data["user_id"],
                    "fullName": data["full_name"],
                    "email": data.get("email"),
                    "mobile": data.get("mobile"),
                    "role": data.get("role") or "unknown",
                    "staffMemberId": None,
                    "staffRoleSlug": None,
                    "accountHolderName": data.get("account_holder_name"),
                    "accountNumberLast4": data.get("account_number_last4"),
                    "ifscCode": data.get("ifsc_code"),
                    "bankName": data.get("bank_name"),
                    "verificationStatus": data.get("verification_status"),
                    "requiredForPayout": bool(data.get("required_for_payout")),
                    "hasVerificationDoc": bool(data.get("verification_doc_file_id")),
                    "configured": bool(data.get("configured")),
                }
            )
        return rows

    async def require_for_payout(self, user_id: UUID) -> None:
        row = await self._fetch_row(user_id)
        if not row or not self._is_complete(row):
            await self._set_required(user_id)
            raise AppError(
                "Bank details required before payout",
                status_code=422,
                error="bank_details_required",
            )

    async def require_verified_for_disbursement(self, user_id: UUID) -> None:
        row = await self._fetch_row(user_id)
        if not row or not self._is_complete(row):
            await self._set_required(user_id)
            raise AppError(
                "Bank details required before disbursement",
                status_code=422,
                error="bank_details_required",
            )
        if row.get("verification_status") != "verified":
            raise AppError(
                "Bank details must be verified before disbursement",
                status_code=422,
                error="bank_details_unverified",
            )

    async def _set_required(self, user_id: UUID) -> None:
        await self.db.execute(
            text(
                """
                INSERT INTO identity.user_bank_accounts (user_id, required_for_payout)
                VALUES (:user_id, true)
                ON CONFLICT (user_id) DO UPDATE
                SET required_for_payout = true, updated_at = now()
                """
            ),
            {"user_id": user_id},
        )

    async def _assert_owned_file(self, user_id: UUID, file_id: UUID) -> None:
        result = await self.db.execute(
            text(
                """
                SELECT id FROM storage.files
                WHERE id = :file_id AND owner_user_id = :user_id
                """
            ),
            {"file_id": file_id, "user_id": user_id},
        )
        if not result.scalar_one_or_none():
            raise AppError("Verification document not found", status_code=422)
