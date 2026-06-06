# Tasks: RBAC Appointment Scheduling

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [contracts/appointment-scheduling-api.md](./contracts/appointment-scheduling-api.md)

**Status**: Not started — execute phase-by-phase after spec approval.

## Phase 0 — Foundation (Blocking)

- [x] T001 Approve spec.md and set status → Approved
- [x] T002 Migration `019_appointment_types_and_core.sql` — types + appointments + status_history enums (`020_appointment_scheduling_core.sql`)
- [x] T003 Migration `020_appointment_slots_availability.sql` — slots, doctor_availability, doctor_holidays (`021_appointment_availability.sql`)
- [ ] T004 Migration `021_appointment_ops_logs.sql` — reschedules, cancellations, missed, geo, reminders, payments, tele sessions, prescription_pdfs
- [x] T005 Migration `022_appointment_links.sql` — FK columns on home_visits; backfill in 020
- [x] T006 Seed appointment types + RBAC permissions in migration 020
- [x] T007 `appointmentSchedulingService.js` — create, sync, status transition engine
- [x] T008 Dual-write in `appointmentService.js` (legacy adapter pattern)
- [x] T009 Legacy routes delegate through unified sync on book/cancel/reschedule
- [x] T010 Unit tests: status mappers (`test/appointmentScheduling.test.js`)
- [x] T011 Extend `src/types/appointments.ts` with unified types
- [x] T012 Extend `AppointmentsService` + `GET /patient/appointment-types`

**Checkpoint**: Legacy patient home visit book/list still works; data in `operations.appointments`.

---

## Phase 1 — Patient Booking (US1, US2) 🎯 MVP

- [x] T101 [P] [US1] `appointmentSlotService.js` — list slots by type/date/mode
- [x] T102 [US1] Patient routes: types, slots, book (extended `routes/appointments.js`)
- [x] T103 [US2] Patient routes: reschedule, cancel, detail timeline
- [x] T104 [US1] `BookAppointmentWizardPage.tsx` — multi-step booking (`src/app/pages/appointments/`)
- [x] T105 [P] [US1] Components: `TypeStep`, `DateSlotStep`, `VisitModeStep`, `DetailsStep`, `AddressStep`, `PaymentStep`, `ConfirmStep`
- [x] T106 [US2] `AppointmentDetailPage.tsx` + `AppointmentTimeline.tsx`
- [x] T107 [US2] Reschedule + cancel modals with reason validation
- [x] T108 [US1] Wire navigation: patient `/appointments/book`, `/appointments/:id`
- [x] T109 [US1] Policy checks: past slot, payment required, address required
- [ ] T110 [US1] Manual test script + update seed appointments for multi-type

**Checkpoint**: Patient books clinic FibroScan + home visit; reschedule/cancel with timeline.

---

## Phase 2 — Doctor Calendar (US3)

- [x] T201 [P] [US3] `appointmentSlotService.js` — generate slots from availability + holidays job
- [x] T202 [US3] Doctor routes: calendar, availability, holidays, block slot
- [x] T203 [US3] `DoctorAppointmentsPage.tsx` — dashboard + list filters
- [x] T204 [P] [US3] `DoctorCalendarView.tsx` — day/week/month/list tabs
- [x] T205 [US3] `AvailabilityEditor.tsx` + `HolidayForm.tsx`
- [x] T206 [US3] `ConsultationPanel.tsx` — start/complete/no-show/request reschedule
- [x] T207 [US3] `PatientSummaryDrawer.tsx` — reports + FibroScan/lab snippets
- [x] T208 [US3] Double-booking integration test
- [x] T209 [US3] Nav + route guards for doctor role

**Checkpoint**: Doctor sets availability; bookings appear on calendar; no double-book.

---

## Phase 3 — Technician Field Ops (US4)

- [x] T301 [US4] Technician routes: schedule, route, geo, vitals, sample, complete, failed, issue
- [x] T302 [US4] Link `visit_vitals` / checklist to `appointment_id`
- [x] T303 [US4] `TechnicianSchedulePage.tsx` + `RouteMapPanel.tsx`
- [x] T304 [US4] `TechnicianVisitDetailPage.tsx` — consent, vitals form (BMI auto), FibroScan, sample barcode
- [x] T305 [US4] `TechnicianTrackingPage.tsx` (patient) — poll geo endpoint
- [x] T306 [US4] Escalation creates admin task via `care.care_tasks`
- [x] T307 [US4] Extend existing technician APIs where overlap exists

**Checkpoint**: Full home visit on unified appointment with geo + vitals + sample.

---

## Phase 4 — Prescription & PDF (US3)

- [x] T401 [US3] `appointmentPrescriptionService.js` — link appointment ↔ prescription
- [x] T402 [US3] Extend prescription schema fields (supplements, test recommendations, lifestyle blocks) if missing
- [x] T403 [US3] `PrescriptionBuilderPanel.tsx` — full field set from spec §17
- [x] T404 [US3] AI draft banner + edit audit using `prescription_versions`
- [x] T405 [US3] `SignatureUploadPanel.tsx` + approve gate
- [x] T406 [US3] PDF generator job + QR verification + `prescription_pdfs` storage
- [x] T407 [US3] Patient prescription list/PDF viewer routes
- [x] T408 [US3] Tests: draft hidden from patient; PDF only after approve

**Checkpoint**: Doctor approves Rx → PDF auto-generated → patient downloads.

---

## Phase 5 — Admin, Notifications, Tele (US5, US7)

- [x] T501 [US5] Admin routes: list, create, assign, override, dashboard, analytics v1
- [x] T502 [US5] CRUD appointment types + holidays + policies
- [x] T503 [US5] `AdminAppointmentsDashboard.tsx` + filters + assignment modals
- [x] T504 [US5] `RouteMonitoringPage.tsx` — live geo map for admins
- [x] T505 [US5] `MissedAppointmentsPage.tsx` — handle no-show queue
- [x] T506 [US7] `appointmentNotificationService.js` + template registry
- [x] T507 [US7] `appointmentReminders.js` job — 24h/2h/15m
- [x] T508 [US7] `appointmentTeleService.js` — meeting URL + join window
- [x] T509 [US7] `TeleconsultationJoinPage.tsx` (patient + doctor)
- [x] T510 [US7] Notification log admin view

**Checkpoint**: Admin runs daily ops; reminders logged in dev; tele join gated.

---

## Phase 6 — Care Roles & Analytics (US6, US8)

- [x] T601 [US6] Care routes + `CareSessionsPage.tsx` for dietician/health coach
- [x] T602 [US8] Analytics service aggregates + `AdminAnalyticsPage.tsx` charts
- [x] T603 [P] Patient timeline integration for all appointment events
- [x] T604 Deprecation notice on 005 spec; remove adapter after 2 releases
- [x] T605 [P] RBAC unit tests for all new routes
- [x] T606 Run `pnpm test`, `pnpm build`, `pnpm snyk:test`; fix regressions
- [x] T607 Update agent context / README links to 007 spec

**Checkpoint**: All success criteria in spec.md verified.

---

## Dependencies

```text
Phase 0 → Phase 1 → Phase 2 → Phase 3
                              ↘
Phase 2 → Phase 4 (prescription needs consultation)
Phase 0 → Phase 5 (admin can parallel after Phase 1)
Phase 5 → Phase 6
```

## Parallel Opportunities

- T105 wizard steps (different component files) after T104 scaffold
- T204 calendar views after T203 page shell
- T401 backend + T403 frontend after Phase 2 routes exist
- T605 RBAC tests alongside each phase's routes

## MVP Recommendation

**Ship Phase 0 + Phase 1** first for patient multi-type booking while doctor calendar (Phase 2) follows immediately after.

Do **not** start implementation until `spec.md` status is **Approved**.
