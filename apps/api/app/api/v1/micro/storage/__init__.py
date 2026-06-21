"""File storage & uploads."""

from fastapi import APIRouter

from app.api.v1.routers import storage

router = APIRouter(tags=["storage"])
router.include_router(storage.router)
