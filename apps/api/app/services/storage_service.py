from __future__ import annotations

import json
import re
from uuid import UUID, uuid4

from fastapi import UploadFile
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.integrations.s3 import S3Service

# DB file_type enum values (storage.files.file_type)
ENTITY_FILE_TYPE_MAP: dict[str, str] = {
    "old_report": "old_report",
    "lab_report": "lab_report",
    "fibroscan_report": "fibroscan_report",
    "collection_proof": "other",
    "prescription": "prescription",
    "final_report": "fibroscan_report",
    "consent": "consent",
    "invoice": "invoice",
    "profile": "profile",
    "staff_compliance": "other",
    "technician_compliance": "other",
    "payout_verification": "other",
    "chat_attachment": "chat_attachment",
    "signature": "signature",
    "other": "other",
}

# Semantic S3 prefixes — category first so bucket objects are easy to browse/export.
S3_ENTITY_PREFIX: dict[str, str] = {
    "profile": "identity/profiles/users",
    "staff_compliance": "operations/staff-compliance/profiles",
    "technician_compliance": "operations/technician-compliance/technicians",
    "payout_verification": "operations/payout-verification/users",
    "lab_report": "clinical/lab-reports/orders",
    "collection_proof": "operations/sample-collection/orders",
    "fibroscan_report": "clinical/fibroscan/orders",
    "prescription": "clinical/prescriptions/orders",
    "final_report": "clinical/final-reports/orders",
    "consent": "compliance/consent/users",
    "invoice": "commerce/invoices/orders",
    "signature": "identity/signatures/doctors",
    "chat_attachment": "communications/chat",
    "old_report": "clinical/historical-reports/patients",
    "other": "misc/uploads",
}


def _sanitize_filename(file_name: str) -> str:
    cleaned = re.sub(r"[^\w.\- ]+", "_", file_name.strip())
    return cleaned or "upload.bin"


def _sanitize_subfolder(subfolder: str | None) -> str | None:
    if not subfolder:
        return None
    cleaned = re.sub(r"[^\w.\-]+", "_", subfolder.strip().lower())
    return cleaned or None


def _resolve_file_type(entity_type: str) -> str:
    normalized = entity_type.strip().lower()
    return ENTITY_FILE_TYPE_MAP.get(normalized, "other")


def build_s3_object_key(
    entity_type: str,
    entity_id: UUID | str,
    file_id: UUID | str,
    file_name: str,
    *,
    subfolder: str | None = None,
    root_prefix: str | None = None,
) -> str:
    """Build a deterministic, category-first S3 object key."""
    normalized = entity_type.strip().lower()
    category_prefix = S3_ENTITY_PREFIX.get(normalized, S3_ENTITY_PREFIX["other"])
    root = (root_prefix or get_settings().s3_key_prefix or "livotale").strip("/")
    safe_name = _sanitize_filename(file_name)
    safe_subfolder = _sanitize_subfolder(subfolder)

    parts = [root, category_prefix, str(entity_id)]
    if safe_subfolder:
        parts.append(safe_subfolder)
    parts.extend([str(file_id), safe_name])
    return "/".join(parts)


class StorageService:
    def __init__(self, db: AsyncSession, s3: S3Service | None = None):
        self.db = db
        self.s3 = s3 or S3Service()

    async def presign_upload(
        self,
        user_id: UUID,
        file_name: str,
        mime_type: str,
        entity_type: str,
        entity_id: UUID,
        *,
        subfolder: str | None = None,
    ) -> dict:
        if not file_name or not mime_type or not entity_type or not entity_id:
            raise AppError("fileName, mimeType, entityType, and entityId are required")

        file_id = uuid4()
        safe_name = _sanitize_filename(file_name)
        key = build_s3_object_key(entity_type, entity_id, file_id, safe_name, subfolder=subfolder)
        storage_url = self.s3.get_public_url(key)
        upload_url = await self.s3.generate_presigned_upload(key, mime_type)
        file_type = _resolve_file_type(entity_type)

        await self.db.execute(
            text(
                """
                INSERT INTO storage.files
                  (id, owner_user_id, file_type, file_name, mime_type, storage_url, uploaded_by, metadata)
                VALUES
                  (:id, :owner_user_id, :file_type, :file_name, :mime_type, :storage_url, :uploaded_by, CAST(:metadata AS jsonb))
                """
            ),
            {
                "id": file_id,
                "owner_user_id": user_id,
                "file_type": file_type,
                "file_name": safe_name,
                "mime_type": mime_type,
                "storage_url": storage_url,
                "uploaded_by": user_id,
                "metadata": json.dumps(
                    {
                        "status": "pending",
                        "entityType": entity_type,
                        "entityId": str(entity_id),
                        "subfolder": _sanitize_subfolder(subfolder),
                        "s3Key": key,
                    }
                ),
            },
        )

        return {
            "fileId": file_id,
            "uploadUrl": upload_url,
            "storageUrl": storage_url,
            "key": key,
            "mimeType": mime_type,
            "fileName": safe_name,
        }

    async def confirm_upload(self, file_id: UUID, user_id: UUID) -> dict:
        result = await self.db.execute(
            text(
                """
                SELECT id, owner_user_id, storage_url, metadata
                FROM storage.files
                WHERE id = :file_id
                """
            ),
            {"file_id": file_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError("File not found", status_code=404, error="not_found")
        if row["owner_user_id"] != user_id:
            raise AppError(
                "Upload session expired or belongs to another user. Select the file and submit again.",
                status_code=403,
                error="forbidden",
            )

        metadata = dict(row["metadata"] or {})
        key = metadata.get("s3Key")
        file_size_bytes = None
        if key:
            head = self.s3.head_object_sync(key)
            if not head:
                raise AppError("Uploaded object not found in storage", status_code=400)
            file_size_bytes = head.get("ContentLength")

        metadata["status"] = "confirmed"
        await self.db.execute(
            text(
                """
                UPDATE storage.files
                SET metadata = CAST(:metadata AS jsonb),
                    file_size_bytes = COALESCE(:file_size_bytes, file_size_bytes)
                WHERE id = :file_id
                """
            ),
            {
                "file_id": file_id,
                "metadata": json.dumps(metadata),
                "file_size_bytes": file_size_bytes,
            },
        )

        return {
            "fileId": file_id,
            "storageUrl": row["storage_url"],
            "confirmed": True,
        }

    async def upload_multipart(
        self,
        file: UploadFile,
        user_id: UUID,
        entity_type: str,
        entity_id: UUID,
        *,
        subfolder: str | None = None,
    ) -> dict:
        if not file.filename:
            raise AppError("file is required")

        content = await file.read()
        if not content:
            raise AppError("Uploaded file is empty")

        mime_type = file.content_type or "application/octet-stream"
        file_id = uuid4()
        safe_name = _sanitize_filename(file.filename)
        key = build_s3_object_key(entity_type, entity_id, file_id, safe_name, subfolder=subfolder)
        storage_url = self.s3.get_public_url(key)
        file_type = _resolve_file_type(entity_type)

        await self.s3.upload_file(content, key, mime_type)
        await self.db.execute(
            text(
                """
                INSERT INTO storage.files
                  (id, owner_user_id, file_type, file_name, mime_type, storage_url,
                   file_size_bytes, uploaded_by, metadata)
                VALUES
                  (:id, :owner_user_id, :file_type, :file_name, :mime_type, :storage_url,
                   :file_size_bytes, :uploaded_by, CAST(:metadata AS jsonb))
                """
            ),
            {
                "id": file_id,
                "owner_user_id": user_id,
                "file_type": file_type,
                "file_name": safe_name,
                "mime_type": mime_type,
                "storage_url": storage_url,
                "file_size_bytes": len(content),
                "uploaded_by": user_id,
                "metadata": json.dumps(
                    {
                        "status": "confirmed",
                        "entityType": entity_type,
                        "entityId": str(entity_id),
                        "subfolder": _sanitize_subfolder(subfolder),
                        "s3Key": key,
                    }
                ),
            },
        )

        return {
            "fileId": file_id,
            "storageUrl": storage_url,
            "fileName": safe_name,
            "mimeType": mime_type,
            "fileSizeBytes": len(content),
            "key": key,
        }

    async def register_external_upload(
        self,
        *,
        user_id: UUID,
        file_id: UUID,
        file_name: str,
        mime_type: str,
        storage_url: str,
        entity_type: str,
        entity_id: UUID,
        subfolder: str | None = None,
        s3_key: str | None = None,
    ) -> dict:
        """Link a presigned upload (already confirmed) to a domain record."""
        safe_name = _sanitize_filename(file_name)
        key = s3_key or build_s3_object_key(entity_type, entity_id, file_id, safe_name, subfolder=subfolder)
        file_type = _resolve_file_type(entity_type)

        await self.db.execute(
            text(
                """
                INSERT INTO storage.files
                  (id, owner_user_id, file_type, file_name, mime_type, storage_url, uploaded_by, metadata)
                VALUES
                  (:id, :owner_user_id, :file_type, :file_name, :mime_type, :storage_url, :uploaded_by, CAST(:metadata AS jsonb))
                ON CONFLICT (id) DO UPDATE
                SET file_name = EXCLUDED.file_name,
                    mime_type = EXCLUDED.mime_type,
                    storage_url = EXCLUDED.storage_url,
                    metadata = EXCLUDED.metadata
                """
            ),
            {
                "id": file_id,
                "owner_user_id": user_id,
                "file_type": file_type,
                "file_name": safe_name,
                "mime_type": mime_type,
                "storage_url": storage_url,
                "uploaded_by": user_id,
                "metadata": json.dumps(
                    {
                        "status": "confirmed",
                        "entityType": entity_type,
                        "entityId": str(entity_id),
                        "subfolder": _sanitize_subfolder(subfolder),
                        "s3Key": key,
                    }
                ),
            },
        )
        return {"fileId": file_id, "storageUrl": storage_url, "key": key}
