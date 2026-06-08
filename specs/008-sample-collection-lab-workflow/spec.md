# Feature Specification: Sample Collection & Lab Report Workflow

**Feature Branch**: `008-sample-collection-lab-workflow` | **Created**: 2026-06-07 | **Status**: Approved

**Product**: LIVGASTRO Smart Liver Clinic (Livotale)

**Extends**: [007-rbac-appointment-scheduling](../007-rbac-appointment-scheduling/spec.md), [006-clinical-reports](../006-clinical-reports/spec.md)

**Related specs** (split detail):

| Document | Focus |
|----------|--------|
| [spec-technician-assignment.md](./spec-technician-assignment.md) | Technician profile, types, auto-assignment, 45-min slots |
| [spec-sample-workflow.md](./spec-sample-workflow.md) | Sample ID, collection, photo, handover, chain of custody |
| [spec-lab-report-workflow.md](./spec-lab-report-workflow.md) | Lab user, testing, report upload, approval, patient access |
| [spec-rbac-notifications-audit.md](./spec-rbac-notifications-audit.md) | Permissions, notifications, audit trail |

## Objective

Deliver end-to-end **sample collection → technician assignment → field collection → lab receive → testing → report upload → approval → patient download** with strict RBAC and audit.

## Roles

| Role | API code | AppRole |
|------|----------|---------|
| Patient | `patient` | PATIENT |
| Admin / Operations | `admin`, `support` | SUPER_ADMIN / OPERATIONS |
| Sample Collector / Technician | `technician` | TECHNICIAN |
| Sample Tester / Lab User | `lab_partner` | LAB_PARTNER |
| Doctor | `doctor` | DOCTOR |
| Super Admin | `admin` | SUPER_ADMIN |

> Lab User maps to existing `lab_partner` role; extend with sample-receive workflow rather than new auth role code in v1.

## Scope Boundaries

| In scope | Out of scope (later) |
|----------|---------------------|
| LGSC sample collection ID generation | Full payroll for technicians |
| Technician type + pincode auto-assignment | Turn-by-turn navigation SDK |
| 45-minute home slot blocking + travel buffer config | WhatsApp production API |
| Sample container photo (admin/lab only visibility) | Machine HL7/FHIR integration |
| Lab receive / reject / test / upload | Multi-lab franchise billing |
| Configurable report approval chain | Patient report trend ML |
| Admin manual assignment override | Technician mobile native app |

## User Scenarios (summary)

### US1 — Patient books sample collection (P1)

Book home / hospital / center collection; receive appointment + sample collection ID; track status; download approved report only.

### US2 — Admin books & manages (P1)

Book on behalf; view all collections; assign/reassign technician; view sample photos; approve reports; trigger recollection.

### US3 — Technician field workflow (P1)

View assigned appointments only; accept → travel → collect → photo upload → handover; 45-min slot respected.

### US4 — Lab user testing workflow (P1)

Receive/reject sample; enter results; upload PDF; submit for approval.

### US5 — Doctor report review (P2)

Review reports requiring medical interpretation; link to prescription.

## Acceptance Criteria (module complete)

- [ ] Unique Sample Collection ID (`LGSC-YYYYMMDD-000001`) on every sample appointment
- [ ] Auto-assignment by pincode, technician type, availability, 45-min slot
- [ ] Technician journey statuses through handover
- [ ] Sample photo hidden from patient/doctor by default
- [ ] Lab receive/reject with reasons
- [ ] Report upload + approval before patient visibility
- [ ] Full status audit log
- [ ] Admin manual assignment when auto fails (`pending_technician_assignment`)

## Constitution Check

| Gate | Status |
|------|--------|
| Spec before code | PASS |
| Pages → store → service → API | Planned |
| API contract in contracts/ | PASS |
| RBAC tests | Required Phase 4 |
| pnpm test/build | Required each phase |
