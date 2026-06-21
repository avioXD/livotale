"""Patient self-service portal."""

from fastapi import APIRouter

from app.api.v1.routers import patient_portal

router = APIRouter(tags=["portal"])
router.include_router(patient_portal.router)
