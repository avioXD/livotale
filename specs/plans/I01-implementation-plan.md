# Phase I — URL Tabs & Log Fields Implementation Plan

> **For agentic workers:** Implement wave-by-wave; run `pnpm test:e2e` after I1. Each task should be a focused PR or commit.

**Goal:** Make all primary tabs deep-linkable via URL query params and standardize log-style inputs as validated textareas.

**Architecture:** Shared `useUrlTabState` hook consolidates existing ad-hoc `setSearchParams` patterns; `LogTextarea` + `fieldLimits.ts` centralize multiline field UX without a full form-library migration.

**Tech Stack:** React 19, React Router 7, shadcn Tabs, existing Zustand stores, Playwright E2E.

**Specs:** [I-MASTER-PLAN.md](../platform/I-MASTER-PLAN.md) · [I01](../platform/I01-url-routed-tabs.md) · [I02](../platform/I02-log-textarea-validation.md)

---

## Wave I0 — Shared primitives

### Task 1: `useUrlTabState` hook

**Files:**
- Create: `src/hooks/useUrlTabState.ts`
- Create: `src/hooks/useUrlTabState.test.ts`
- Modify: `src/hooks/index.ts` (if barrel exists)

- [ ] Implement hook per I01 spec (read, write, omitDefault, preserve foreign params)
- [ ] Unit tests: default fallback, invalid tab, omit default, foreign param preservation

### Task 2: `fieldLimits` + `LogTextarea`

**Files:**
- Create: `src/utils/fieldLimits.ts`
- Create: `src/components/forms/LogTextarea.tsx`
- Create: `src/components/forms/LogTextarea.test.tsx`

- [ ] Export limits LOG_SHORT / LOG_MEDIUM / LOG_LONG / LOG_MESSAGE
- [ ] LogTextarea shows counter at 80% threshold; sets aria-invalid over limit
- [ ] Test over-limit state

---

## Wave I1 — P0 URL tab migrations

### Task 3: Admin staff member detail tabs

**Files:**
- Modify: `src/app/pages/admin/staff/AdminStaffMemberDetailPage.tsx`

- [ ] Replace `defaultValue` Tabs with `useUrlTabState` (`dashboard` | `profile` | `performance`)
- [ ] Manual: open `/admin/staff/doctors/:id?tab=profile`, switch tabs, confirm URL updates

### Task 4: Partner lab detail tabs

**Files:**
- Modify: `src/app/pages/admin/labs/AdminPartnerLabDetailPage.tsx`

- [ ] URL tabs: profile, legal, reports, billing
- [ ] When `tab=edit`, hide view tabs (edit mode precedence)
- [ ] Exit edit clears to `tab=profile`

### Task 5: Settings profile sub-tabs

**Files:**
- Modify: `src/app/pages/settings/components/MyProfilePanel.tsx`
- Modify: `src/app/pages/settings/SettingsPage.tsx` (document `profileSection` param)
- Modify: `src/app/pages/staff/profile/components/StaffEmployeeProfileView.tsx`
- Modify: `src/app/pages/technician/profile/components/TechnicianProfileView.tsx`

- [ ] Add `profileSection` query param: basic | employment | address | coverage | legal
- [ ] Wire MyProfilePanel + embedded profile views

---

## Wave I2 — P1 URL tab migrations

### Task 6: Staff onboard tabs

**Files:**
- Modify: `src/app/pages/admin/staff/AdminStaffOnboardPage.tsx`

- [ ] `?tab=send-link|admin-complete`

### Task 7: Patient login mode

**Files:**
- Modify: `src/app/pages/patient-portal/PatientLoginPage.tsx`

- [ ] `?mode=otp|password` synced to Tabs

### Task 8: Refactor existing pages to hook (DRY)

**Files:**
- Modify: `AdminOperationsHubPage.tsx`, `SettingsPage.tsx`, `PatientDetailPage.tsx`, `EnquiryDetailPage.tsx`, `DoctorConsultationDetailPage.tsx`, `TechnicianSchedulePage.tsx`, `EntityDetailShell.tsx`

- [ ] Replace inline setTab with `useUrlTabState` — behaviour unchanged
- [ ] Run full E2E smoke

---

## Wave I3 — Log field migrations

### Task 9: P0 Input → LogTextarea

**Files:**
- Modify: `AdminCollectPaymentModal.tsx`
- Modify: `LiverCareOfflinePaymentModal.tsx`
- Modify: `LiverCarePrescriptionEditor.tsx` (rx-notes)
- Modify: `CareSessionsPage.tsx` (if Input)

- [ ] Swap controls; wire limits; disable submit over limit

### Task 10: P1 validation pass

**Files:** (see I02 inventory)

- [ ] Enquiry panels: follow-up, create-order, order-outcome
- [ ] Order panels: intake verify, sample collection
- [x] Order panels: fibroscan verify (`OrderFibroScanIntakePanel` — LogTextarea + LOG_MEDIUM)
- [ ] Technician: sample collection, route request, fibrosis remarks
- [ ] Doctor: visit notes, prescription builder
- [ ] Admin: service zones, partner lab notes fields

### Task 11: Read-only log display polish

**Files:**
- Modify: `EnquiryViewPanel.tsx`, optional audit/notification log pages

- [ ] `whitespace-pre-wrap` on multiline log text

---

## Wave I4 — Tests & docs

### Task 12: E2E deep-link tests

**Files:**
- Create: `e2e/url-tabs.spec.ts`
- Modify: `e2e/super-admin-smoke.spec.ts`

- [ ] Settings `?tab=security` loads sessions panel
- [ ] Operations `?tab=enquiries` loads enquiries tab
- [ ] Staff member `?tab=profile` (after seed)

### Task 13: Documentation

**Files:**
- Modify: `specs/platform/ui-page-patterns.md`
- Modify: `specs/TASKS.md`
- Modify: `.cursor/rules/ui-page-patterns.mdc` (if exists)

- [ ] Document `useUrlTabState` and `profileSection` convention
- [ ] Document LogTextarea pattern

---

## Verification checklist

```bash
# UI unit tests
pnpm test

# E2E
pnpm test:e2e

# Grep guard (optional CI script)
rg 'defaultValue=' src/app/pages/admin --glob '*.tsx' | rg Tabs
```

---

## Rollout notes

- No data duplication — URL state only; no new seed data
- Backward compatible: old URLs without tab param still work (defaults)
- Legacy appointment pages excluded per F05 Option A
