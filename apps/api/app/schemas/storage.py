from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PresignUploadRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    file_name: str = Field(alias="fileName")
    mime_type: str = Field(alias="mimeType")
    entity_type: str = Field(alias="entityType")
    entity_id: UUID = Field(alias="entityId")
    subfolder: str | None = Field(default=None, alias="subfolder")


class PatientPresignUploadRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    file_name: str = Field(alias="fileName")
    mime_type: str = Field(alias="mimeType")
    entity_type: str = Field(alias="entityType")
    entity_id: UUID | None = Field(default=None, alias="entityId")
    subfolder: str | None = Field(default=None, alias="subfolder")


class PresignUploadResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    file_id: UUID = Field(alias="fileId")
    upload_url: str = Field(alias="uploadUrl")
    storage_url: str = Field(alias="storageUrl")
    key: str
    mime_type: str = Field(alias="mimeType")
    file_name: str = Field(alias="fileName")


class ConfirmUploadResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    file_id: UUID = Field(alias="fileId")
    storage_url: str = Field(alias="storageUrl")
    confirmed: bool = True
