# Platform Recovery — Master Plan

**Created**: 2026-06-20  
**Status**: Approved for execution (spec phase)  
**Scope**: Stabilize livotale-ui ↔ livotale-apis integration, close UI/API/DB gaps, add E2E coverage, surface errors via toasts.

---

## Executive summary

The Liver Care platform has **~221 FastAPI routes** and **~80+ UI service methods**, but production-like local dev fails in clusters:

| Failure class | Count (known) | Fix type |
|---------------|---------------|----------|
| DB migration not applied | 5+ columns/tables | Run migrations 034–038 |
| Response schema mismatch (500) | 3+ endpoints | Align Pydantic aliases / serializers |
| UI path ≠ API route (404) | 4+ endpoints | Add route or fix UI service path |
| Missing FastAPI module entirely | ~40 appointment routes | Port from legacy Node or deprecate UI |
| Route ordering bug (422) | 1 | Re-register static path before `{id}` |
| Client-only mock still wired | 3 flows | Replace with real API or mark deprecated |

**Root cause**: Phase E (API integration) was marked deferred in `PLAN.md` while UI was built against assumed contracts. Migrations 032–038 were added incrementally without a single “apply all” gate in dev onboarding.

---

## Guiding principles

1. **Spec-first**: Every fix lands with an updated contract in `specs/contracts/` or `specs/recovery/features/`.
2. **No duplicate data**: Seed scripts and idempotent migrations must check existence before insert (user requirement).
3. **Fail visibly**: API errors must reach users as actionable toasts, not silent store failures.
4. **Test before merge**: Each P0 endpoint gets a contract test; each feature gets at least one E2E scenario.
5. **Deprecate honestly**: Legacy appointment/journey modules either get FastAPI ports or UI routes removed — no infinite 404 polling.

---

## Phase map

| Phase | Name | Duration est. | Outcome |
|-------|------|---------------|---------|
| **H0** | DB baseline | 0.5 day | All migrations 001–038 applied; `reset_database.py` documented |
| **H1** | P0 hotfixes | 2–3 days | Dashboard, notifications, sessions, consent, staff list work |
| **H2** | API/UI alignment | 1 week | Path fixes, response models, route ordering, audit endpoint |
| **H3** | Missing APIs decision | 1 week | Appointments: port vs retire; document in spec |
| **H4** | Global error UX | 2 days | Toast interceptor + friendly messages |
| **H5** | Contract + E2E tests | 1–2 weeks | Per-feature pytest + Playwright matrix |
| **H6** | Mock retirement | ongoing | Replace DummyPayment/Notification with real integrations |

---

## Spec index

| File | Purpose |
|------|---------|
| [01-GAP-INVENTORY.md](./01-GAP-INVENTORY.md) | Every broken endpoint with error, root cause, owner |
| [02-DATABASE-MIGRATIONS.md](./02-DATABASE-MIGRATIONS.md) | Schema state, apply order, idempotent seed rules |
| [03-ERROR-TOAST-SPEC.md](./03-ERROR-TOAST-SPEC.md) | Global error surfacing architecture |
| [04-E2E-TEST-MATRIX.md](./04-E2E-TEST-MATRIX.md) | Scenario × role × expected API calls |
| [features/F01-auth-profile-settings.md](./features/F01-auth-profile-settings.md) | Auth, sessions, profile, consent |
| [features/F02-admin-dashboard-ops.md](./features/F02-admin-dashboard-ops.md) | Dashboard, enquiries, orders hub |
| [features/F03-notifications-inbox.md](./features/F03-notifications-inbox.md) | Inbox + WS + admin notification log |
| [features/F04-staff-hr-onboarding.md](./features/F04-staff-hr-onboarding.md) | Staff profiles, archive, onboarding |
| [features/F05-legacy-appointments.md](./features/F05-legacy-appointments.md) | Appointment module decision |
| [features/F06-liver-care-pipeline.md](./features/F06-liver-care-pipeline.md) | Order workflow E2E (PKG-1/2/3) |
| [features/F07-patient-portal.md](./features/F07-patient-portal.md) | OTP portal flows |

---

## Priority order (do first)

1. Apply migrations **034_enquiry**, **036_user_archive**, **038_inbox_notifications** (see `02-DATABASE-MIGRATIONS.md`).
2. Fix `GET /auth/sessions` ResponseValidationError.
3. Confirm `GET /notifications/inbox` after migration 038.
4. Fix `GET /admin/staff/lab-partners/roster` route ordering (422).
5. Wire `GET /admin/audit` → `GET /audit/activity` or add alias route.
6. Global toast on API errors (Phase H4).
7. Decide appointments module (Phase H3) — largest remaining gap.

---

## Success criteria

- Super Admin login → dashboard loads without console 500s.
- Notification bell loads inbox (empty or populated).
- Settings → Security → sessions list loads.
- Ops hub: enquiries tab, orders tab, sample analytics load.
- Staff hub: doctors/technicians/operations lists load.
- `pnpm test:contract` (new) passes against migrated local DB.
- Playwright smoke: login → dashboard → open one order detail.

---

## Out of scope (this recovery track)

- Production deployment / CI hardening
- Real payment gateway (Razorpay/etc.)
- Real WhatsApp/SMS providers
- Full appointment scheduling port (unless Phase H3 decision = port)

---

## Related docs

- Existing delivery plan: [../PLAN.md](../PLAN.md)
- Task tracker: [../TASKS.md](../TASKS.md) — Phase H section
- API matrix: [../features/20-api-integration-matrix.md](../features/20-api-integration-matrix.md)
