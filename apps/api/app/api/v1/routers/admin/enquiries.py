from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.domain.rbac import is_ops_role
from app.schemas.common import DataEnvelope
from app.schemas.enquiries import (
    AddEnquiryFollowUpInput,
    CreateEnquiryInput,
    Enquiry,
    NewEnquiryThreadInput,
    UpdateEnquiryInput,
)
from app.services.enquiry_service import EnquiryService

router = APIRouter(prefix="/admin/enquiries", tags=["admin-enquiries"])


def _service(db: AsyncSession = Depends(get_db)) -> EnquiryService:
    return EnquiryService(db)


def _require_ops(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    if not is_ops_role(user.roles):
        raise AppError("Requires operations or admin role", status_code=403, error="forbidden")
    return user


@router.get("", response_model=DataEnvelope[list[Enquiry]])
async def list_enquiries(
    status: str | None = Query(default=None),
    source: str | None = Query(default=None),
    search: str | None = Query(default=None),
    _: CurrentUser = Depends(_require_ops),
    service: EnquiryService = Depends(_service),
) -> DataEnvelope[list[Enquiry]]:
    data = await service.list_enquiries(status=status, source=source, search=search)
    return DataEnvelope(data=data)


@router.get("/threads/{thread_id}", response_model=DataEnvelope[list[Enquiry]])
async def get_enquiry_thread(
    thread_id: str,
    _: CurrentUser = Depends(_require_ops),
    service: EnquiryService = Depends(_service),
) -> DataEnvelope[list[Enquiry]]:
    return DataEnvelope(data=await service.get_thread(thread_id))


@router.get("/{enquiry_id}", response_model=DataEnvelope[Enquiry])
async def get_enquiry(
    enquiry_id: UUID,
    _: CurrentUser = Depends(_require_ops),
    service: EnquiryService = Depends(_service),
) -> DataEnvelope[Enquiry]:
    return DataEnvelope(data=await service.get_by_id(enquiry_id))


@router.post("", response_model=DataEnvelope[Enquiry])
async def create_enquiry(
    body: CreateEnquiryInput,
    user: CurrentUser = Depends(_require_ops),
    service: EnquiryService = Depends(_service),
) -> DataEnvelope[Enquiry]:
    return DataEnvelope(data=await service.create(body, actor_id=user.user_id))


@router.post("/{enquiry_id}/new-thread", response_model=DataEnvelope[Enquiry])
async def create_new_thread(
    enquiry_id: UUID,
    body: NewEnquiryThreadInput,
    user: CurrentUser = Depends(_require_ops),
    service: EnquiryService = Depends(_service),
) -> DataEnvelope[Enquiry]:
    data = await service.create_new_thread(enquiry_id, message=body.message, actor_id=user.user_id)
    return DataEnvelope(data=data)


@router.post("/{enquiry_id}/follow-ups", response_model=DataEnvelope[Enquiry])
async def add_follow_up(
    enquiry_id: UUID,
    body: AddEnquiryFollowUpInput,
    user: CurrentUser = Depends(_require_ops),
    service: EnquiryService = Depends(_service),
) -> DataEnvelope[Enquiry]:
    data = await service.add_follow_up(
        enquiry_id,
        body,
        actor_id=user.user_id,
        actor_name=user.full_name,
    )
    return DataEnvelope(data=data)


@router.patch("/{enquiry_id}", response_model=DataEnvelope[Enquiry])
async def update_enquiry(
    enquiry_id: UUID,
    body: UpdateEnquiryInput,
    user: CurrentUser = Depends(_require_ops),
    service: EnquiryService = Depends(_service),
) -> DataEnvelope[Enquiry]:
    return DataEnvelope(data=await service.update(enquiry_id, body, actor_id=user.user_id))


@router.delete("/{enquiry_id}", status_code=204)
async def delete_enquiry(
    enquiry_id: UUID,
    user: CurrentUser = Depends(_require_ops),
    service: EnquiryService = Depends(_service),
) -> None:
    await service.soft_delete(enquiry_id, actor_id=user.user_id)
