"""Compliance & privacy: DPDP consent, purposes."""

from fastapi import APIRouter

from app.api.v1.routers import consent

router = APIRouter(prefix="/compliance", tags=["compliance"])
router.include_router(consent.router)

# Deprecated — use /compliance/consent/* ; kept for clients not yet on category prefix
legacy_router = APIRouter(tags=["compliance-legacy"])
legacy_router.include_router(consent.router)
