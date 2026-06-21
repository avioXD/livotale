"""Versioned API surface grouped by domain category (micro-modules)."""

from app.api.v1.micro.admin import router as admin_router
from app.api.v1.micro.clinical import router as clinical_router
from app.api.v1.micro.commerce import router as commerce_router
from app.api.v1.micro.compliance import router as compliance_router
from app.api.v1.micro.identity import router as identity_router
from app.api.v1.micro.portal import router as portal_router
from app.api.v1.micro.realtime import router as realtime_router
from app.api.v1.micro.staff import router as staff_router
from app.api.v1.micro.storage import router as storage_router

__all__ = [
    "admin_router",
    "clinical_router",
    "commerce_router",
    "compliance_router",
    "identity_router",
    "portal_router",
    "realtime_router",
    "staff_router",
    "storage_router",
]
