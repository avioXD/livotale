# Tasks: Sample Collection & Lab Workflow

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Phase 0 — Foundation (Blocking)

- [x] T001 Approve spec package
- [x] T002 Migration `026_sample_collection_lab_workflow.sql`
- [x] T003 `sampleCollectionService.js` — create, LGSC ID, status transitions, audit
- [x] T004 `technicianAssignmentService.js` — auto-assign on book
- [x] T005 Hook `appointmentService.bookAppointment` + admin walk-in
- [x] T006 Types `src/types/sampleCollection.ts`
- [x] T007 API contract [contracts/sample-lab-api.md](./contracts/sample-lab-api.md)

## Phase 1 — Technician Assignment API (US3 partial)

- [x] T101 Routes: `GET/PATCH /technician/sample-collections/*`
- [x] T102 Admin: `GET /admin/sample-collections`, manual assign, config
- [x] T103 Seed technician pincodes + types for mock data
- [x] T104 Unit test: assignment respects 45-min slot

## Phase 2 — Technician UI (US3)

- [x] T201 `TechnicianSampleCollectionPanel` — status actions
- [x] T202 Collection form + sample photo upload
- [x] T203 Handover form
- [x] T204 Integrate into `TechnicianVisitDetailPage`

## Phase 3 — Lab Workflow (US4)

- [x] T301 `labSampleWorkflowService.js`
- [x] T302 Routes: receive, reject, results, report upload
- [x] T303 `LabSamplesDashboardPage` + detail
- [x] T304 Sample photo viewer (lab only)

## Phase 4 — Admin & Patient (US1, US2, US5)

- [x] T401 `AdminSampleCollectionsPage` — list, assign, photo verify
- [x] T402 Report approval UI (admin)
- [x] T403 Patient collection status on appointment detail
- [x] T404 Published report gate on patient reports
- [x] T405 Notification hooks for key transitions
- [x] T406 RBAC tests + `pnpm build`

## MVP Checkpoint (Phases 0–2)

Patient/admin books blood sample → LGSC ID → auto technician → technician collects + uploads photo → handover recorded.

## Full Checkpoint (Phases 0–4)

Lab receives → uploads report → admin approves → patient downloads.
