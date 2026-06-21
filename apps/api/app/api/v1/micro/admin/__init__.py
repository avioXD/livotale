"""Admin console: staff, orders, packages, pathology, dashboard."""

from fastapi import APIRouter

from app.api.v1.routers.admin import (
    audit as admin_audit,
    consultations as admin_consultations,
    dashboard as admin_dashboard,
    enquiries as admin_enquiries,
    integrations as admin_integrations,
    notifications as admin_notifications,
    ops_analytics as admin_ops_analytics,
    orders as admin_orders,
    packages as admin_packages,
    pathology as admin_pathology,
    staff as admin_staff,
    technicians as admin_technicians,
    appointments_dashboard as admin_appointments_dashboard,
)

router = APIRouter(tags=["admin"])
router.include_router(admin_ops_analytics.router)
router.include_router(admin_staff.router)
router.include_router(admin_packages.router)
router.include_router(admin_enquiries.router)
router.include_router(admin_orders.router)
router.include_router(admin_technicians.router)
router.include_router(admin_dashboard.router)
router.include_router(admin_pathology.router)
router.include_router(admin_consultations.router)
router.include_router(admin_notifications.router)
router.include_router(admin_integrations.router)
router.include_router(admin_audit.router)
router.include_router(admin_appointments_dashboard.router)
