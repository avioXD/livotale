from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.schemas.common import DataEnvelope
from app.schemas.storage import ConfirmUploadResponse, PresignUploadRequest, PresignUploadResponse
from app.services.storage_service import StorageService

router = APIRouter(prefix="/storage", tags=["storage"])


def _storage_service(db: AsyncSession = Depends(get_db)) -> StorageService:
    return StorageService(db)


@router.post("/presign", response_model=DataEnvelope[PresignUploadResponse])
async def presign_upload(
    body: PresignUploadRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: StorageService = Depends(_storage_service),
) -> DataEnvelope[PresignUploadResponse]:
    data = await service.presign_upload(
        current_user.user_id,
        body.file_name,
        body.mime_type,
        body.entity_type,
        body.entity_id,
        subfolder=body.subfolder,
    )
    return DataEnvelope(data=data)


@router.post("/{file_id}/confirm", response_model=DataEnvelope[ConfirmUploadResponse])
async def confirm_upload(
    file_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: StorageService = Depends(_storage_service),
) -> DataEnvelope[ConfirmUploadResponse]:
    data = await service.confirm_upload(file_id, current_user.user_id)
    return DataEnvelope(data=data)
