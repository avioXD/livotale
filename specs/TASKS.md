# Global Development Tasks — Livotale Liver Care Platform

**Last updated**: 2026-06-07  
**Specs**: [README](./README.md) · **Plan**: [PLAN.md](./PLAN.md)  
**Legend**: `[ ]` pending · `[~]` in progress · `[x]` done · `[—]` deferred (API / E2E / stakeholder)

---

## Phase 0 — Planning & alignment

- [x] P001 Create spec suite + architecture map (`platform/architecture.md`)
- [x] P002 Create global TASKS.md tracker
- [x] P005 Create feature requirement docs (`features/01`–`16`)
- [x] P006 Reorganize specs — archive legacy 002/005/006/008/010, consolidate contracts
- [—] P003 Review alignment with stakeholders (confirm order vs appointment model)
- [x] P004 RBAC + patient OTP portal (`features/14-rbac-navigation.md`)

---

## Phase 1 — Foundation

### Database & types
- [x] F101–F110 Migrations 032–034 + UI TypeScript types

### Dummy external services
- [x] F201–F208 All `Dummy*Service` interfaces + registry

### Seed data
- [x] F301 Mock seed in `liverCare.mock.ts` (UI)
- [—] F302 API seed script `seed-liver-care-platform.js`

---

## Phase 2 — Packages & public website → [01](./features/01-packages-public-website.md)

- [x] W101–W104 Public pages + admin package CRUD
- [—] W105 API: `GET /public/packages`, `POST /public/enquiries`
- [x] W106 `PackageService`, `EnquiryService`

---

## Phase 3 — Enquiry & patient → [02](./features/02-enquiry-patient.md)

- [—] E101 API: enquiry CRUD
- [x] E102–E104, E107–E108 Ops enquiry UI + convert to order
- [—] E105–E106 WhatsApp ingest, extended profile fields

---

## Phase 4 — Orders & workflow → [03](./features/03-orders-workflow.md)

- [x] O101–O106 Order workflow UI + timeline
- [x] O108 Ops order detail — package step pipeline (`?step=`), completed steps locked read-only, activity log footer — see [03](./features/03-orders-workflow.md)
- [—] O102 API: order CRUD + transitions
- [—] O109 Role lenses (technician/doctor step-only views on shared order record)
- [—] O107 Rename `AdminBookAppointmentPage` → `CreateOrderPage`

---

## Phase 5 — Payment → [04](./features/04-payment.md)

- [x] P102–P106 Dummy payment UI (ops + patient portal)
- [—] P101 Payment API

---

## Phase 6 — Technician & scan → [05](./features/05-fibrosis-scan-technician.md)

- [x] T101–T108 Order-centric technician workflow

---

## Phase 7 — Partner lab pathology → [06](./features/06-partner-lab-pathology.md)

- [x] L101–L104, L106 Partner lab profiles + dispatch workflow
- [x] L105 Legacy sample collection tab removed → `partner-lab` tab

---

## Phase 8 — AI extraction → [07](./features/07-ai-extraction.md)

- [x] A101, A103–A105 Review UI
- [—] A102 Extraction API

---

## Phase 9 — Final reports → [08](./features/08-final-reports.md)

- [~] R101 Letterhead template admin (stub)
- [x] R102–R106 Report generation + patient publish

---

## Phase 10 — Doctor & Rx → [09](./features/09-doctor-prescription.md)

- [x] D101–D107 Consultation + prescription flow

---

## Phase 11 — Patient portal → [10](./features/10-patient-portal.md)

- [x] U101–U107 OTP login, dashboard, downloads, notifications

---

## Phase 12 — Admin & audit → [11](./features/11-admin-dashboard.md), [12](./features/12-notifications-audit.md)

- [x] M101–M106 Dashboards, audit, integrations stub

---

## Phase 13 — Refinement

- [x] R101–R110 Sidebar, role dashboards, push inbox, partner lab restructure

---

## Phase 14 — Cleanup

- [x] C101 Spec restructure (`specs/features/`, global TASKS, archive legacy)
- [x] C102 Remove deprecated lab-partner UI (`LabSamplesPage`, `LabDashboardPage`)
- [x] C103 Remove unused `AdminOperationsSamplesTab`, `AdminSampleCollectionsPage`
- [x] C104 Dead routes cleaned (`/technician/sample-collections` → redirect)
- [x] C105 Services layer: `BaseApiService` + `mockOrApi` on all domain services; `src/services/README.md`
- [x] C106 Removed in-house lab portal methods from `SampleCollectionService`; `InboxNotificationService` + `CareAppointmentsService` aligned

---

## Phase 15 — Pathology workflow enhancement

- [x] H101 PDF file upload from lab email (not filename text only)
- [x] H102 Email metadata on lab report (`emailFrom`, `emailSubject`, `sourceType`)
- [x] H103 Auto AI extraction after PDF upload (`uploadReportFromEmail`)
- [x] H104 Extracted fields saved to mock DB (`MOCK_AI_JOBS`) + ops verify
- [x] H105 Letterhead report gated until pathology AI verified (PKG-2/3)
- [x] H106 Technician/ops "blood sample submitted to lab" + lab email hint on order detail

---

## Phase 16 — Package catalog enhancement

- [x] P101 Extended `LiverCarePackage` model — checklist sections, highlights, prep, FAQs
- [x] P102 Admin full CRUD — create packages, dynamic checklist editor
- [x] P103 Public package detail page `/packages/:code` (Apollo-style structured view)
- [x] P104 Listing cards — highlights, view details link, top inclusions
- [x] P105 `PackageService` — `getById`, `remove`, auto-sync `includes.bullets`
- [x] P106 Spec — `specs/features/01-packages-public-website.md`
- [x] P107 Admin list → detail pattern — `EntityDetailShell`, View/Edit tabs, `DataTable` list
- [x] P108 Add package flow — `/admin/packages/new` via `:id` route; `PackageFormPanel`
- [x] P109 Platform spec — `specs/platform/list-detail-pattern.md`
- [x] P110 Zustand stores — `packagesAdminStore`, `packageDetailStore`, `publicPackagesStore`
- [x] P111 State management spec — `specs/platform/state-management.md`

---

## Phase 17 — Patient registry redesign

- [x] R101 Top-level patient detail tabs — Profile, Appointments, Orders, Tests, Scans, Reports, Payments
- [x] R102 Profile tab — merged summary, contact, demographics, medical history
- [x] R103 Clinical context — orders, pathology, scans, payments via `getClinicalContext`
- [x] R104 `usePatientDetailStore` — streamlined load; URL-synced tabs
- [x] R105 Spec — `specs/features/02-enquiry-patient.md` patient registry section

---

## Phase 18 — Enquiries CRM & UI patterns

- [x] E201 Standalone `/admin/enquiries` list (ListPageShell pattern)
- [x] E202 Add lead — WhatsApp/manual CRM (`/admin/enquiries/new`)
- [x] E203 Detail flat tabs — View · Follow-up · Create order · Edit details; repeat orders skip patient creation
- [x] E207 Lead threads — group by phone, new thread on return, thread panel + list badge
- [x] E204 `useEnquiriesAdminStore` + `useEnquiryDetailStore`
- [x] E205 UI pattern shells + Cursor rule + `specs/platform/ui-page-patterns.md`
- [x] E206 Spec `specs/features/18-enquiries-crm.md`

---

## Phase 19 — QA & API docs

- [—] Q101–Q103 E2E PKG-1/2/3 flows
- [x] Q104 RBAC matrix test
- [x] Q105 Root README
- [—] Q106 API README + OpenAPI

---

## Progress summary

| Phase | Done | Notes |
|-------|------|-------|
| 0–13 Product UI | ~100/115 | Mock layer feature-complete |
| 14 Cleanup | in progress | This pass |
| 15 Pathology | 6/6 | Complete |
| 16 Packages | 11/11 | Complete |
| 17 Patients | 5/5 | Complete |
| 18 Enquiries CRM | 6/6 | Complete |
| 19 QA/API | 2/6 | Deferred |

**Overall**: 130 / 149 tasks (87%) · **12 API/E2E tasks deferred**
