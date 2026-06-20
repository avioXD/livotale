# E2E Test Matrix — Scenarios × Roles × APIs

**Tools**: pytest (API contract) + Playwright (UI E2E)  
**Environment**: Local Docker Postgres, migrations 001–038 applied, bootstrap seed

---

## Test pyramid

| Layer | Location | Count target |
|-------|----------|--------------|
| Contract | `livotale-apis/api/tests/contract/` | 40+ endpoint smoke tests |
| Integration | `livotale-apis/api/tests/integration/` | 15 feature flows |
| E2E UI | `livotale-ui/e2e/` | 12 critical journeys |

---

## Role credentials (from LOCAL_CREDENTIALS.md)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@livotale.com | Admin@123 |
| Operations | operations@livotale.com | Ops@123 |
| Technician | technician@livotale.com | Tech@123 |
| Doctor | doctor@livotale.com | Doctor@123 |
| Patient | 9900000001 | OTP 123456 |

---

## Scenario matrix

### S1 — Staff auth & shell (P0)

| Step | Actor | Action | API calls | Expected |
|------|-------|--------|-----------|----------|
| 1 | Super Admin | Login | POST `/auth/login` | 200, token |
| 2 | Super Admin | Load shell | GET `/auth/me`, GET `/notifications/inbox?role=SUPER_ADMIN` | 200 |
| 3 | Super Admin | Dashboard | GET `/admin/dashboard/summary`, `/admin/sample-collections/analytics` | 200 |
| 4 | Super Admin | Settings sessions | GET `/auth/sessions` | 200, valid JSON shape |

**Edge cases**: expired token → 401 redirect; wrong password → 401 toast; missing migration → 500 toast (sanitized).

---

### S2 — Ops enquiry → order (PKG-1)

| Step | Actor | Action | API calls | Expected |
|------|-------|--------|-----------|----------|
| 1 | Public | Enquire | POST `/public/enquiries` | 201 |
| 2 | Ops | List enquiries | GET `/admin/enquiries` | 200, includes new |
| 3 | Ops | Convert | POST `/admin/orders` | 201 |
| 4 | Ops | Transition workflow | POST `/admin/orders/{id}/transition` | 200 |
| 5 | Ops | Request payment | POST transition + dummy payment link | 200 |

**Edge cases**: duplicate phone enquiry; invalid package code; order_outcome column missing → 500.

---

### S3 — Technician field visit (PKG-1 scan)

| Step | Actor | Action | API calls | Expected |
|------|-------|--------|-----------|----------|
| 1 | Ops | Assign technician | POST `/admin/orders/{id}/assign-technician` | 200 |
| 2 | Technician | List orders | GET `/technician/orders` | 200 |
| 3 | Technician | Start visit | POST `…/visit-started`, `…/reached` | 200 |
| 4 | Technician | Patient intake OTP | POST `…/patient-intake/otp`, verify with `123456` | 200 |
| 5 | Technician | FibroScan intake | POST `…/fibroscan-intake` | 200, `fibroscanIntakeSubmittedAt` set |
| 6 | Ops | Validate FibroScan intake | PATCH `…/fibroscan-intake/verify` | 200, timeline `fibroscan_intake_approved` |
| 7 | Technician | Scan capture | POST `…/fibrosis-scan/fetch` or `…/fibrosis-scan` | 200 |
| 8 | Technician | Complete | POST `…/visit-completion-otp`, `…/complete` with OTP | 200 |

**Edge cases**: rescan flow; unable to visit; wrong OTP.

---

### S4 — Pathology + AI + final report (PKG-2)

| Step | Actor | API | Expected |
|------|-------|-----|----------|
| 1 | Ops | POST assign-lab, lab-partner-order | 200 |
| 2 | Ops | PATCH pathology-external-appointment | 200 |
| 3 | Ops | POST schedule-pathology | 200 |
| 4 | Ops | POST lab-partner-visit (visited) | 200 |
| 5 | Ops | POST lab-partner-collected → received → awaiting-report | 200 |
| 6 | Ops | POST lab-report upload | 200 |
| 7 | Ops | POST ai-extract, PATCH fields, POST verify | 200 |
| 8 | Ops | final-report generate → publish | 200 |

**UI E2E**: `e2e/s4-pathology-partner-lab.spec.ts` (ops hub + order lab step navigation)

---

### S5 — Doctor consultation + Rx (PKG-3)

| Step | Actor | API | Expected |
|------|-------|-----|----------|
| 0a | Patient | POST consult-date (optional pref) | 200 |
| 0b | Ops | GET available-for-slot, POST confirm-consultation-schedule | 200 |
| 1 | Ops | assign-doctor + schedule-consultation (legacy reassignment) OR confirm-consultation-schedule | 200 |
| 2 | Doctor | GET consultations/orders | 200 |
| 2b | Doctor | POST schedule | **403** doctor_cannot_schedule |
| 3 | Doctor | start → complete consultation | 200 |
| 4 | Doctor | PUT prescription, POST publish | 200 |
| 5 | Patient | GET portal prescription | 200 |
| 6 | Doctor | POST visits/follow-up | 200 |
| 7 | Doctor | complete follow-up visit, PUT+POST publish | 200 |
| 8 | Doctor | POST revise → PUT draft → POST publish (optional) | 200 |
| 9 | Doctor | PUT on published without revise | 400 blocked |
| 10 | Doctor | Rx write on unassigned order | 403 |

---

### S6 — Patient portal

| Step | Actor | API | Expected |
|------|-------|-----|----------|
| 1 | Patient | OTP send/verify | 200 |
| 2 | Patient | GET orders list | 200 |
| 3 | Patient | POST pay (demo) | 200 |
| 4 | Patient | GET final-report, prescription | 200 after publish |
| 5 | Patient | GET org/notifications | 200 |

---

### S7 — Staff HR

| Step | Actor | API | Expected |
|------|-------|-----|----------|
| 1 | Admin | GET staff/doctors/users | 200 |
| 2 | Admin | GET archive-check | 200 or 404 for seed UUID |
| 3 | Doctor | GET/PATCH staff/doctors/profile | 200 |
| 4 | Admin | POST onboard invite | 201 |

**Edge cases**: archived user login blocked; multi-role select-role flow.

---

### S8 — Notifications

| Step | Actor | API | Expected |
|------|-------|-----|----------|
| 1 | System | push via outbox processor | inbox row created |
| 2 | Admin | GET inbox | 200 |
| 3 | Admin | PATCH read, read-all | 200 |
| 4 | Admin | WebSocket connect | accepted |

---

## Contract tests to add (pytest)

```python
# tests/contract/test_recovery_p0.py

def test_notifications_inbox_authenticated(client, admin_token): ...
def test_dashboard_summary_ops(client, admin_token): ...
def test_auth_sessions_shape(client, admin_token): ...
def test_staff_doctors_users(client, admin_token): ...
def test_lab_partners_roster_not_422(client, admin_token): ...
def test_audit_activity_alias(client, admin_token): ...  # after fix
```

Run: `cd livotale-apis/api && PYTHONPATH=. uv run pytest tests/contract/test_recovery_p0.py -v`

---

## Playwright smoke (minimum)

```typescript
// e2e/super-admin-shell.spec.ts
test('super admin dashboard loads without 500', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/org/kolkata/dashboard');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  // assert no toast with "Something went wrong"
});
```

---

## CI gate (future)

1. `reset_database.py` on ephemeral Postgres
2. `seed_project_bootstrap.py`
3. `pytest tests/contract/`
4. `pnpm exec playwright test e2e/super-admin-shell.spec.ts`
