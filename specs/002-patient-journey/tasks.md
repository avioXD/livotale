# Tasks: Patient Journey Flow

## Phase 1 — Spec & Database
- [x] T001 Create spec at `specs/002-patient-journey/spec.md`
- [x] T002 Migration `015_patient_journey.sql` — journey status + questionnaire seeds

## Phase 2 — Backend API
- [x] T003 `aiJourneyEngine.js` — rule-based risk score, package, draft prescription
- [x] T004 `journeyService.js` — onboarding, questionnaires, AI prescreen, visits
- [x] T005 Patient routes — journey, questionnaires, onboarding, AI, visits
- [x] T006 Doctor `GET /doctor/prescriptions/:id` for review detail
- [x] T007 Lab service auto-triggers draft prescription on report upload
- [x] T008 Extended `registerPatient` with address + risk factors

## Phase 3 — Frontend
- [x] T009 Types, `JourneyService`, `journeyStore`
- [x] T010 `PatientJourneyPage` — 7-step wizard
- [x] T011 `AppointmentsPage` — home visit list
- [x] T012 `PrescriptionsPage` — doctor review & approval
- [x] T013 `Liver Fibrosis ScanPage` — technician consent/vitals/Liver Fibrosis Scan/samples
- [x] T014 shadcn: textarea, select, badge, tabs, progress
- [x] T015 Nav + routes for `/patient-journey`

## Phase 4 — Verification
- [x] T016 UI build passes
- [x] T017 AI engine unit tests pass
- [x] T018 Restart API server to load new routes

## Phase 5 — Patient Onboarding Gate
- [x] T019 Spec + plan updated for onboarding gate (mobile-first, route blocking)
- [x] T020 Backend `GET /patient/onboarding/status` + `getOnboardingStatus()` in journeyService
- [x] T021 `OnboardingShell`, `PatientOnboardingRoute`, `PostAuthRedirect`, `journeyHelpers`
- [x] T022 AppRoutes restructured — `/patient-journey` outside AdminShell; other routes gated
- [x] T023 Login/Register → `/` with PostAuthRedirect; journeyStore `loadOnboardingStatus`
- [x] T024 Unit tests for `journeyHelpers`; build + tests pass
- [ ] T025 Manual E2E: register new patient → onboarding only; book visit → full app unlocks
