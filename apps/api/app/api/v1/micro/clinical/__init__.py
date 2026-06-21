"""Clinical workflows: doctor consultations, prescriptions, technician orders."""

from fastapi import APIRouter

from app.api.v1.routers.care import appointments as care_appointments
from app.api.v1.routers.doctor import availability as doctor_availability
from app.api.v1.routers.doctor import consultations as doctor_consultations
from app.api.v1.routers.doctor import prescriptions as doctor_prescriptions
from app.api.v1.routers.liver_health_report import router as liver_health_report_router
from app.api.v1.routers.patients import router as patients_router
from app.api.v1.routers.technician import orders as technician_orders
from app.api.v1.routers.technician import partner_labs as technician_partner_labs

router = APIRouter(tags=["clinical"])
router.include_router(patients_router)
router.include_router(technician_orders.router)
router.include_router(technician_partner_labs.router)
router.include_router(doctor_consultations.router)
router.include_router(doctor_prescriptions.router)
router.include_router(doctor_availability.router)
router.include_router(care_appointments.router)
router.include_router(liver_health_report_router)
