# Login Logs — Design Spec

**Date:** 2026-06-20  
**Status:** Approved  
**Author:** Spec-based recovery session

---

## Problem

Login audit data is written to `identity.login_logs` on password auth, but the Settings → Security tab shows broken or empty data because the UI reads snake_case fields while the FastAPI endpoint returns camelCase. Active sessions on the same tab have the same mismatch. Some login attempts (portal denied, lockout trigger) are not logged with distinct failure reasons. There is no admin org-wide login activity view.

---

## Goals

1. Users see accurate recent login activity on Settings → Security (method, timestamp, IP, status, failure reason).
2. Active sessions on the same tab render device label, IP, and expiry correctly.
3. Super admins can view org-wide login logs at `/org/:city/admin/login-logs`.
4. Portal-denied and account-lockout-trigger attempts are persisted with distinct `failure_reason` values.
5. Contract and e2e tests validate API shape and UI rendering.

## Non-goals (v1)

- Patient portal OTP auth → `login_logs`
- OTP staff login (no FastAPI routes)
- Session revoke UI on Security tab
- Pagination/filtering on admin login logs page

---

## Data model

Table: `identity.login_logs` (migration 016)

| Column | Notes |
|--------|-------|
| `user_id` | FK to users, nullable on unknown identifier |
| `identifier_used` | Email/username attempted |
| `login_method` | Default `password` |
| `success` | boolean |
| `failure_reason` | e.g. `invalid_password`, `portal_denied`, `account_lockout_triggered`, `account_locked` |
| `ip_address`, `user_agent`, `session_id`, `created_at` | Audit metadata |

---

## API contract

### `GET /api/v1/audit/login-logs`

Query: `limit` (1–200, default 50), `all=true` (admin only)

Response envelope `{ data: LoginLogInfo[] }` — camelCase:

- `id`, `userId`, `identifierUsed`, `loginMethod`, `success`, `failureReason`
- `ipAddress`, `userAgent`, `sessionId`, `createdAt`
- `username`, `fullName` (populated when `all=true`)

### Write paths

| Event | `failure_reason` |
|-------|------------------|
| Unknown/inactive user | `invalid_credentials` |
| Wrong password | `invalid_password` |
| Lockout threshold on Nth attempt | `account_lockout_triggered` |
| Attempt while locked | `account_locked` |
| Valid creds, wrong portal | `portal_denied` |
| Success | `success=true`, no failure reason |

Failed login rows are committed via `_commit_auth_audit()` before raising `AppError`, so `get_db()` rollback does not discard audit inserts.

---

## UI surfaces

### Settings → Security (`?tab=security`)

- **Recent login activity**: card list — method label, Success/Failed badge, timestamp, IP, failure reason on failed rows
- **Active sessions**: device label, IP, expiry
- API errors shown in `securityError` banner (not silently empty)

### Admin login activity (`/org/:city/admin/login-logs`)

Table columns: When, User, Identifier, Method, Status, IP, Failure reason  
Data: `GET /audit/login-logs?all=true&limit=50`

---

## UI mapping strategy

Add `toLoginLogEntry()` and `toUserSession()` in `authMappers.ts`; call from `AuthService`. Keeps API camelCase consistent with `BaseSchema.serialize_by_alias=True`.

---

## Tests

**Backend contract** (`test_login_logs.py`):

- CamelCase response shape
- Login creates success row
- Failed login creates row with `failureReason`
- Portal denied creates `portal_denied` row
- Non-admin + `?all=true` → 403

**E2E**:

- Settings security tab shows valid login log after login
- Admin login logs page renders table

---

## Files

| Area | Path |
|------|------|
| Backend auth | `apps/api/app/services/auth_service.py` |
| Backend audit API | `apps/api/app/api/v1/routers/audit.py` |
| Backend schema | `apps/api/app/schemas/auth.py` |
| UI mappers | `apps/ui/src/utils/authMappers.ts` |
| UI service | `apps/ui/src/services/auth/AuthService.ts` |
| Settings | `apps/ui/src/app/pages/settings/SettingsPage.tsx` |
| Admin page | `apps/ui/src/app/pages/admin/audit/AdminLoginLogsPage.tsx` |
