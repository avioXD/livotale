# Consult Scheduling Design

**Date:** 2026-06-21  
**Status:** Approved for implementation  
**Pattern:** Mirror scan booking (patient preference → ops notification → atomic slot + doctor confirm)

## Goal

PKG-3 teleconsults use **time-first scheduling**:

1. Patient or ops picks a teleconsult time slot.
2. If patient picked, ops is notified to assign a doctor.
3. Ops confirms by selecting an **available doctor** at that slot (one atomic step).
4. Doctors **cannot** pick or change the consult time.

## Prerequisite gate

Patient may submit consult preference only when the order has reached `final_report_generated` or later consult-eligible statuses (letterhead report ready). Same gate as the ops consultation step.

## Data model

| Field | Table | Purpose |
|-------|-------|---------|
| `consultation_patient_preferred_at` | `commerce.service_orders` | Patient preferred datetime (no status change) |
| `consultation_time_slot` | `commerce.service_orders` | Human-readable slot label |
| `consultation_scheduled_at` | existing | Confirmed consult datetime |
| `doctor_id` | existing | Assigned doctor at confirm |

## API surface

| Actor | Action | Endpoint |
|-------|--------|----------|
| Patient | View tele slots | `GET /public/slots/consult?date=` |
| Patient | Submit preference | `POST /patient-portal/orders/{id}/consult-date` |
| Ops | View slots + preference | `GET /admin/orders/{id}/consult-slots?date=` |
| Ops | List doctors free at slot | `GET /admin/doctors/available-for-slot?scheduledAt=&language=` |
| Ops | Confirm slot + doctor | `POST /admin/orders/{id}/confirm-consultation-schedule` |

Legacy `assign-doctor` and `schedule-consultation` remain for reassignment after confirm.

## Notifications

| Trigger | When | Recipients | Channels |
|---------|------|------------|----------|
| `consultation_date_requested` | Patient POST consult-date | Ops, Admin | in-app |
| `consultation_schedule_confirmed` | Ops atomic confirm | Patient, Doctor | in-app, WhatsApp stub |
| `doctor_assigned` | New doctor on confirm | Doctor, Patient | in-app |
| `consultation_scheduled` | After confirm | Doctor, Patient | in-app |

## Doctor lockout

`POST /doctor/consultations/{id}/schedule` returns **403** (`doctor_cannot_schedule`). Doctor UI shows read-only scheduled time; start/join only.

## Slot availability

Aggregate tele slots across active doctors. Slot is available if ≥1 doctor has open capacity. Occupancy checks include `commerce.service_orders.consultation_scheduled_at` per doctor (not just legacy `operations.appointments`).
