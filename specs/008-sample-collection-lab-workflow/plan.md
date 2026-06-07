# Implementation Plan: Sample Collection & Lab Workflow

**Branch**: `008-sample-collection-lab-workflow` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

## Summary

Extend the unified appointment model with **sample collections** (LGSC IDs), **technician auto-assignment** (pincode + type + 45-min slots), **chain-of-custody** (photo, handover), and **lab report workflow** (receive → test → approve → publish).

Delivery in **5 phases**; each phase independently testable.

## Technical Context

| Item | Choice |
|------|--------|
| Backend | `livotale_app/api` Fastify routes + services |
| Migration | `026_sample_collection_lab_workflow.sql` |
| Frontend | `livotel-ui` — extend technician visit UI, new lab + admin sample pages |
| Lab role | Reuse `lab_partner` → `AppRole.LAB_PARTNER` |
| File storage | Reuse `storage.files` pattern from reports |
| IDs | PostgreSQL function `next_sample_collection_code()` |

## Constitution Check

| Gate | Status |
|------|--------|
| Spec before code | PASS |
| Pages → store → service → API | PASS — planned |
| API contract fidelity | PASS — [contracts/sample-lab-api.md](./contracts/sample-lab-api.md) |
| RBAC route guards | PASS |
| Smallest diff | PASS — extend 007 technician/lab routes |

## Project Structure

```text
specs/008-sample-collection-lab-workflow/
├── spec.md
├── spec-technician-assignment.md
├── spec-sample-workflow.md
├── spec-lab-report-workflow.md
├── spec-rbac-notifications-audit.md
├── plan.md
├── tasks.md
├── data-model.md
└── contracts/sample-lab-api.md

livotale_app/api/src/services/
├── sampleCollectionService.js      # LGSC ID, status, photo, handover
├── technicianAssignmentService.js  # auto-assign engine
└── labSampleWorkflowService.js     # receive, reject, report approval

livotel-ui/src/app/pages/
├── technician/sample/              # enhanced collection workflow
├── lab/samples/                    # lab user dashboard
└── admin/samples/                  # admin sample ops dashboard
```

## Phase Overview

| Phase | Deliverable |
|-------|-------------|
| 0 | Migration + core services + hook on book |
| 1 | Technician assignment + status API |
| 2 | Technician UI (collection form, photo, handover) |
| 3 | Lab receive/test/upload/approve |
| 4 | Admin dashboard + patient published reports |

## Integration Points

- **Booking**: `appointmentService.bookAppointment` → create `sample_collections` row + auto-assign
- **007 appointments**: Link via `appointment_id`; technician routes delegate to sample collection when present
- **006 reports**: Published lab reports appear in patient reports list after approval

## Risks

| Risk | Mitigation |
|------|------------|
| Remote DB connection limits | Keep pool max low; batch admin queries |
| Photo storage | File metadata only in v1; URL from storage.files |
| Overlap with 007 technician routes | Sample collection service wraps existing collectSample |
