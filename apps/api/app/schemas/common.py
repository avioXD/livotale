from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class DataEnvelope(BaseModel, Generic[T]):
    data: T


class PaginatedResult(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    pageSize: int
    totalPages: int


class MessageResponse(BaseModel):
    message: str


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True, serialize_by_alias=True)
