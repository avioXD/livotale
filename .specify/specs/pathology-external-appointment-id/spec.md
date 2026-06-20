# Pathology External Appointment ID

**Status**: Implemented  
**Priority**: P1

## Goal

Ops creates the order on the **lab partner's website** on behalf of the patient. The ID from their portal is saved in Livotale as `pathologyExternalAppointmentId`. Ops then updates visit and collection status here by watching the lab partner portal, and uploads the PDF report once it is ready on their side.

## Fields

| Field | Source | Editable |
|-------|--------|----------|
| `pathologyLabOrderRef` | Auto on `POST .../lab-partner-order` | Read-only after create |
| `pathologyExternalAppointmentId` | Ops after external booking | PATCH before sample collection |

## API

| Method | Path | Body |
|--------|------|------|
| PATCH | `/api/v1/admin/orders/{orderId}/pathology-external-appointment` | `{ externalAppointmentId: string }` |

Validation: requires `partnerLabId` + internal ref; max 64 chars; timeline `external_appointment_recorded`.

## UI

Editable input in `OrderPathologyScheduleSection` below internal ref. Required prerequisite before schedule confirmation.

## Tests

- Integration: PATCH after lab-partner-order, before schedule-pathology
- Contract: 400 when internal ref missing
