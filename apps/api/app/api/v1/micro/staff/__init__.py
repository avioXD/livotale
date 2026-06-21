"""Staff HR profiles, onboarding, technician profiles."""

from fastapi import APIRouter

from app.api.v1.routers import staff_onboarding, staff_profiles, technician_profiles

router = APIRouter(tags=["staff"])
router.include_router(staff_profiles.router)
router.include_router(technician_profiles.router)
router.include_router(staff_onboarding.router)
