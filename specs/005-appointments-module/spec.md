# Feature Specification: Appointments Module

**Feature Branch**: `005-appointments-module` | **Created**: 2026-06-06 | **Status**: Superseded by [007-rbac-appointment-scheduling](../007-rbac-appointment-scheduling/spec.md)

> **Deprecation**: Unified scheduling is live in **[007-rbac-appointment-scheduling](../007-rbac-appointment-scheduling/spec.md)**. Legacy `/patient/appointments` home-visit paths still dual-write through `appointmentService.js` migration adapter. **Removal target**: two releases after 007 Phase 6 (do not extend 005-only code).

## Objective

Fully functional home-visit appointments: book via minimal modal, list my bookings, step-by-step status tracker, cancel/reschedule.

## User Stories (Priority)

### P1 — Book Home Visit
Patient books from Appointments page with date, time slot, address (default), optional notes. Creates visit + checklist + status timeline.

### P1 — My Bookings
List all patient visits with status badge, scheduled time, address, technician when assigned.

### P1 — Booking Progress Stepper
Each booking shows step-by-step progress: submitted → assigned → in progress → consent → vitals → FibroScan → sample → completed.

### P2 — Cancel / Reschedule
Patient can cancel or reschedule while visit is `booked` or `assigned`.

### P2 — Staff View
Doctors/staff see assigned patient appointments (read-only list).

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/patient/appointments/slots?date=` | Available time slots for a date |
| GET | `/patient/appointments` | Patient's bookings with progress summary |
| GET | `/patient/appointments/:id` | Booking detail + checklist + steps |
| POST | `/patient/appointments` | Book new visit |
| PATCH | `/patient/appointments/:id/reschedule` | Reschedule date/slot |
| POST | `/patient/appointments/:id/cancel` | Cancel with reason |
| GET | `/appointments` | Staff list (role-aware) |

## Success Criteria

1. Patient can book from modal without visiting journey wizard
2. My bookings shows live data with status stepper
3. Cancel/reschedule updates DB and timeline
4. Build passes

See [plan.md](./plan.md).
