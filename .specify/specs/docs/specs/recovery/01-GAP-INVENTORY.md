# Gap Inventory — UI ↔ API ↔ DB

**Last audited**: 2026-06-20 (parallel scan of UI services, FastAPI routers, migrations, terminal logs)

Legend: **P0** blocks daily dev · **P1** breaks a feature area · **P2** degraded/legacy · **P3** cosmetic

---

## P0 — Blocks core staff login experience

| # | UI call | HTTP | Error | Root cause | Fix |
|---|---------|------|-------|------------|-----|
| G-01 | `GET /notifications/inbox?role=` | 500 | `relation audit.inbox_notifications does not exist` | Migration 038 not applied | Apply `038_inbox_notifications.sql` |
| G-02 | `GET /admin/dashboard/summary` | 500 | `column enquiries.order_outcome does not exist` | Migration 034_enquiry not applied | Apply `034_enquiry_crm_order_extensions.sql` |
| G-03 | `GET /admin/enquiries`, `/admin/operations/overview` | 500 | Same as G-02 | Same | Same |
| G-04 | `GET /admin/staff/*/users` | 500 | `column users.archived_at does not exist` | Migration 036 not applied | Apply `036_user_archive.sql` |
| G-05 | `GET /auth/sessions` | 500 | ResponseValidationError `created_at` missing | Service returns camelCase; schema expects snake_case without alias population on response | Fix `SessionInfo` schema or serializer |

---

## P1 — Feature area broken

| # | UI call | HTTP | Error | Root cause | Fix |
|---|---------|------|-------|------------|-----|
| G-10 | `GET /admin/audit` | 404 | Route not registered | UI expects `/admin/audit`; API has `/audit/activity` | Add admin alias or change `AuditLogService.ts` |
| G-11 | `GET /admin/appointments/*` (all) | 404 | No FastAPI router | Appointments only in legacy Node (`api/src/`) | Port module or remove UI routes — see F05 |
| G-12 | `GET /admin/staff/lab-partners/roster` | 422 | UUID parse on `"roster"` | `{lab_id}` route registered before static `roster` | Reorder routes in `admin/staff.py` vs `ops_analytics.py` |
| G-13 | `GET /dashboard/overview` | 404 intermittent | Hot reload / mount | Verify identity router always mounted | Smoke test after restart |
| G-14 | Admin notifications page | N/A | No API | Uses `DummyNotificationService.listLogs()` | Wire to `integrations.notifications_log` or inbox API |

---

## P1 — Fixed in codebase (verify after pull)

| # | UI call | Was | Fix location |
|---|---------|-----|--------------|
| G-20 | `POST /compliance/consent/accept` | PostgresSyntaxError `:ip::inet` | `consent_service.py` CAST syntax |
| G-21 | `GET /staff/{role}/profile` | PostgresSyntaxError `:role::enum` | `staff_profile_service.py` CAST syntax |
| G-22 | `PATCH /profile/basic` | DataError date string | `profile_service.py` `_parse_dob()` |
| G-23 | Bare `/profile` without `/api/v1` | 404 | UI `VITE_API_BASE_URL` default fixed |

---

## P2 — Legacy modules (UI wired, API partial/missing)

| Module | UI routes | FastAPI | Legacy Node | Recommendation |
|--------|-----------|---------|-------------|----------------|
| Appointments | 15+ pages | **None** | Yes | Decision doc F05 |
| Patient journey | `/patient-journey` | Partial `/patient/*` | Yes | Deprecate UI or port onboarding |
| Sample collection (legacy) | Dashboard analytics | Partial | Yes | Keep analytics API; retire visit UI |
| Care coaching | `/coaching` | `/care/org/appointments` | Unknown | Placeholder page — low priority |
| Treatment plans | `/treatment-plans` | None | None | Placeholder — remove or spec later |
| Delivery | `/delivery` | None | None | Placeholder |
| Password reset | `/org/reset-password` | None | None | Implement or hide route |

---

## P2 — Schema / ORM drift (no immediate 500 if migrations applied)

| Table | Migration cols | ORM model | Impact |
|-------|----------------|-----------|--------|
| `identity.users` | `user_badge_id`, `archived_at` | Missing on `User` | Raw SQL only — OK if migrated |
| `operations.lab_partners` | GST, contract dates | Missing on `LabPartner` | Admin lab detail may omit fields |
| `audit.audit_log` vs `audit_logs` | Two tables | Only `audit_logs` in app | Confusing; document single source |

---

## P3 — Documentation / test gaps

| Gap | Impact |
|-----|--------|
| `database/README.md` stops at migration 013 | Devs miss 032–038 |
| Contract tests allow enquiry 500 | Masks DB issues |
| No test for `/auth/sessions`, `/notifications/inbox` | Regressions undetected |
| `micro/README.md` says `storage/upload-url` | Should be `storage/presign` |

---

## UI pages with no reachable route (dead code)

| Page | Intended feature |
|------|------------------|
| `FibroScanPage` | Legacy fibro scan list |
| `TechnicianSchedulePage` | Schedule (redirects to orders) |
| `AdminAppointmentsDashboardPage` | Appointments hub |
| `RouteMonitoringPage`, `MissedAppointmentsPage` | Ops appointment tools |

Action: either restore routes or delete pages in cleanup sprint.

---

## Error message quality (all severities)

Current: 500 responses expose raw SQL/validation text via `BaseApiService` → `Error(message)` → store `error` string. Only Settings consent uses `toastError`. Most failures are invisible in UI except empty panels.

See [03-ERROR-TOAST-SPEC.md](./03-ERROR-TOAST-SPEC.md).
