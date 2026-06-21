# Spec: Prescription Follow-up Visit (Liver Care PKG-3)

**Module**: Doctor consultation visit logs  
**Roles**: Doctor (write, assigned order only)  
**API base**: FastAPI `/api/v1`

## Purpose

After publishing a prescription, the doctor schedules a follow-up consultation visit. A new visit log is created; the doctor completes the visit and writes a new prescription for that visit.

## Visit log types

- `initial` — first visit (auto-created via `ensure-initial`)
- `follow_up` — subsequent visits

## Visit log statuses

`scheduled` → `completed` → `prescription_draft` → `prescription_published`

## API endpoints

| Method | Path | Body | Expected |
|--------|------|------|----------|
| POST | `/doctor/consultations/{order_id}/visits/follow-up` | `{ scheduledAt, followUpAt? }` | 200, new visit log |
| GET | `/doctor/consultations/{order_id}/visits` | — | list all visits |
| PATCH | `/doctor/consultations/{order_id}/visits/{visit_log_id}` | notes, followUpAt | update draft visit |
| POST | `/doctor/consultations/{order_id}/visits/{visit_log_id}/complete` | symptoms, notes | visit → completed |

## Guard rules

1. **Before scheduling follow-up**: latest visit (highest `visit_number`) must have status `prescription_published`
2. **Cannot schedule** if any visit is in `prescription_draft` or `scheduled` follow-up without published Rx
3. **Cannot schedule** before any prescription is published (400: "Publish the current prescription before scheduling follow-up")

## Follow-up date fields (two layers)

| Field | Location | Purpose |
|-------|----------|---------|
| `visit.followUpAt` | Visit log | Next review date on visit record |
| `prescription.followUpDate` | Rx body | Patient-facing follow-up date in published Rx |
| `prescription.followUpAdvice` | Rx body | Patient-facing advice text |

No automatic sync between visit and Rx fields — doctor sets each explicitly.

## Second Rx cycle

1. Publish initial Rx
2. POST follow-up visit → new `follow_up` visit log (status `scheduled`)
3. Complete follow-up visit
4. PUT prescription draft on new visit_log_id
5. POST publish
6. Patient portal returns latest published Rx

## Timeline events

- `follow_up_scheduled` — when follow-up visit created
- `prescription_published` — when Rx published per visit

## UI

- `DoctorConsultationPrescriptionTab` — "Schedule follow-up visit" panel visible when selected visit is `prescription_published`
- Copy: "A new visit log will be created. You can write a prescription after completing the visit."
- Auto-select new visit after scheduling

## Patient visibility

Patient portal shows latest published Rx `followUpDate` / `followUpAdvice` only. Scheduled follow-up visit datetime is doctor-facing only (future enhancement).
