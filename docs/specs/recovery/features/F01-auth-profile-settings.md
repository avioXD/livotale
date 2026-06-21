# F01 — Auth, Profile & Settings Recovery

**Priority**: P0  
**Gaps**: G-05, G-20, G-21, G-22, password reset missing

---

## Features in scope

| UI surface | Routes | Primary services |
|------------|--------|------------------|
| Staff login | `/org/login` | `AuthService` |
| Role selection | modal post-login | `POST /auth/select-role` |
| Settings | `/org/:city/settings` | `profileService`, `authService` |
| Patient register | `/org/register` | `POST /patient/register` |
| Password reset | `/org/reset-password` | **Not implemented** |

---

## Required APIs (exist vs missing)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| POST | `/auth/login` | ✅ | |
| GET | `/auth/me` | ✅ | |
| POST | `/auth/select-role` | ✅ | Multi-role users |
| GET | `/auth/sessions` | ⚠️ **500** | ResponseValidationError — fix schema |
| DELETE | `/auth/sessions/:id` | ✅ | Untested |
| POST | `/auth/password/change` | ✅ | Settings security tab |
| GET | `/profile` | ✅ | |
| PATCH | `/profile/basic` | ✅ | DOB parsing fixed |
| POST | `/profile/photo` | ✅ | Via storage presign |
| GET | `/compliance/consent/mine` | ✅ | |
| POST | `/compliance/consent/accept` | ✅ | CAST fix applied |
| GET | `/audit/login-logs` | ✅ | User-scoped; camelCase response |
| GET | `/audit/login-logs?all=true` | ✅ | Admin org-wide view |
| POST | `/auth/password/reset` | ❌ | UI throws "not available" |

---

## Fix spec: `/auth/sessions`

**Problem**: `auth_service.list_sessions()` returns camelCase keys; `SessionInfo` response model validation fails.

**Options** (pick A):

| Option | Change | Pros |
|--------|--------|------|
| A | Add `Field(alias="createdAt")` + `populate_by_name=True` on `SessionInfo` | Matches UI envelope pattern |
| B | Return snake_case from service | Breaks if UI expects camelCase |
| C | Remove `response_model` | Loses OpenAPI contract |

**Acceptance**: GET returns 200 with `{ data: [{ id, createdAt, expiresAt, … }] }`.

---

## Fix spec: login logs (Settings Security tab)

**Problem**: `GET /audit/login-logs` returns camelCase; UI reads snake_case without a mapper. Same issue for `/auth/sessions` on the Security tab.

**Fix**: Add `toLoginLogEntry()` and `toUserSession()` in `authMappers.ts`; wire in `AuthService`. Show `failure_reason` on failed rows. Do not swallow login-log fetch errors.

**Acceptance**:

- After login, Security tab shows method, valid timestamp, IP, Success badge
- Failed attempts show human-readable failure reason
- Active sessions show device label, IP, expiry (not "Invalid Date")
- Admin page at `/org/:city/admin/login-logs` lists org-wide activity

**Backend logging**: Portal-denied → `failure_reason=portal_denied`; lockout threshold → `account_lockout_triggered`.

---

## Edge cases & scenarios

| # | Scenario | Expected |
|---|----------|----------|
| E1 | Login with wrong password | 401, toast "Invalid credentials" |
| E2 | Multi-role user | Role picker → select-role → dashboard |
| E3 | Token expired on settings | Redirect login |
| E4 | Revoke other session | DELETE 200, list refreshes |
| E5 | Consent not accepted | Banner on settings; accept → 200 |
| E6 | Profile photo upload fail | Toast + inline error |
| E7 | Password reset clicked | Hide page or implement API |
| E8 | View login activity after login | Security tab shows method, date, IP |
| E9 | Wrong portal with valid creds | Row with `portal_denied` in admin view |
| E10 | Admin login logs page | Table with User, Status, Failure reason |

---

## Tests

- Contract: `test_auth_sessions_returns_200_and_shape`
- Contract: `test_login_logs_returns_camel_case_shape`, `test_login_creates_login_log_row`
- E2E: login → settings → security tab → login activity shows valid data
- E2E: admin login logs page renders table
- Contract: consent accept with IP header

---

## DB dependencies

- `identity.web_sessions`
- `identity.users`
- `audit.user_purpose_consents`, `audit.data_processing_purposes`

No migration gaps for auth core (014+).
