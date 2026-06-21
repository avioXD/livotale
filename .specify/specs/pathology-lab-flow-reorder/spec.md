# Pathology Lab Flow Reorder & PDF Upload Simplification

**Status**: Implemented  
**Priority**: P1

## Goal

Align the ops pathology UI with the real-world sequence: assign lab → pick date/time → confirm visit schedule → create internal ref & save lab portal order ID → track collector visit / collection / report upload from the lab portal.

Simplify the **Upload PDF from lab email** block to PDF-only upload and display the internal lab order ref (`pathologyLabOrderRef`, e.g. `LAB-20260002-810E`).

## Flow (ops order detail → Lab step)

| Step | Actor | UI section | Gate |
|------|-------|------------|------|
| 1 | Ops | Assign lab partner | `partnerLabId` |
| 2 | Ops | Pathology schedule — date + slot | payment + lab assigned |
| 3 | Ops | Confirm pathology schedule | step 2 complete |
| 4 | Ops | Generate internal ref + save lab portal order ID | schedule confirmed |
| 5 | Ops | Collector visited / no-show | portal ID saved |
| 6 | Ops | Sample collected | visit = visited |
| 7 | Ops | Lab received → awaiting report | dispatch progression |
| 8 | Ops | Upload lab PDF | awaiting_report; show internal ref |
| 9 | Ops | AI review → letterhead | unchanged |

## API changes

### `POST .../schedule-pathology`

- **Before**: required `partnerLabId`, `pathologyLabOrderRef`, `pathologyExternalAppointmentId`
- **After**: requires `partnerLabId` only (+ existing payment/slot validation via UI)

### `POST .../lab-partner-visit`

- **Add**: requires `pathologyLabOrderRef` and `pathologyExternalAppointmentId` (ops must map portal order before tracking visit)

### Unchanged

- `POST .../lab-partner-order` — still requires assigned lab
- `PATCH .../pathology-external-appointment` — still requires internal ref
- `POST .../lab-report` — PDF multipart; email metadata optional

## UI changes

### `OrderPathologyScheduleSection`

1. Date + time slot picker first
2. Confirm schedule button (prerequisites: payment + lab assigned + slot)
3. **After** schedule confirmed: internal ref generation + lab portal order ID input

### `OrderPathologySection`

1. Lab assignment stays in lab operations card
2. Visit / collection blocks hidden until portal order ID saved
3. **Upload PDF**: remove email from/subject fields; show read-only internal ref; file input + upload button only

### `labWorkflowSteps.ts`

Split step 1 into: assign lab → schedule confirmed → portal ID mapped → visit → collection → …

## Tests

- API contract: schedule without ref/external ID succeeds; visit without portal ID fails
- Integration helper reorder: assign → schedule → lab-partner-order → external-id → visit → …
- UI unit: `getPathologySchedulePrerequisites`, `getLabWorkflowSteps`
