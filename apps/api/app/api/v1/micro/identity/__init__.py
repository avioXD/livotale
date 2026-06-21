"""Identity & account: auth, sessions, user profile."""

from fastapi import APIRouter

from app.api.v1.routers import auth, audit, profile, dashboard as dashboard_overview, patient_auth, bank_details

router = APIRouter(tags=["identity"])
router.include_router(auth.router)
router.include_router(patient_auth.router)
router.include_router(audit.router)
router.include_router(profile.router)
router.include_router(bank_details.router)
router.include_router(dashboard_overview.router)
