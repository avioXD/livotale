"""Livotale API v1 — composed from domain micro-modules."""

from fastapi import APIRouter

from app.api.v1.routers import internal_notifications
from app.api.v1.micro.compliance import legacy_router as compliance_legacy_router
from app.api.v1.micro import (
    admin_router,
    clinical_router,
    commerce_router,
    compliance_router,
    identity_router,
    portal_router,
    realtime_router,
    staff_router,
    storage_router,
)

API_V1_PREFIX = "/api/v1"

api_router = APIRouter()

api_router.include_router(identity_router)
api_router.include_router(compliance_router)
api_router.include_router(compliance_legacy_router)
api_router.include_router(storage_router)
api_router.include_router(commerce_router)
api_router.include_router(clinical_router)
api_router.include_router(admin_router)
api_router.include_router(staff_router)
api_router.include_router(portal_router)
api_router.include_router(realtime_router)
api_router.include_router(internal_notifications.router)

__all__ = ["API_V1_PREFIX", "api_router"]
