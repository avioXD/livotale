# Global API Error Toast Specification

**Goal**: Every failed API call surfaces a user-visible, actionable toast — not silent store errors or raw SQL in inline text.

---

## Current state

| Layer | Behavior |
|-------|----------|
| `BaseApiService` interceptor | Rejects with `new Error(body.message \|\| body.error \|\| 'Request failed')` |
| 401 | Clears tokens, redirects to `/org/login` (no toast) |
| Zustand stores | Set `error: err.message` on catch — shown inline on some pages only |
| `toastError()` | Used in **Settings consent save only** |
| 500 responses | Message often contains full SQLAlchemy exception text |

---

## Target architecture

```
API error
  → apiClient interceptor (normalize message)
  → optional suppress list (401 redirect, cancelled requests)
  → toastError(friendlyMessage)
  → store still sets error for inline display where needed
```

### Interceptor changes (`BaseApiService.ts`)

1. Add `VITE_API_ERROR_TOASTS=true` (default **true** in dev).
2. Map HTTP status to friendly prefix:

| Status | Toast title pattern |
|--------|---------------------|
| 400 | "Invalid request: …" |
| 403 | "You don't have permission to do that." |
| 404 | "This feature isn't available yet. …" |
| 422 | "Please check your input: …" |
| 500 | "Something went wrong on our side. …" |
| network | "Can't reach the server. Check your connection." |

3. **Sanitize 500 messages**: strip SQL fragments; show generic text + optional `error` code from envelope.
4. Add `X-Skip-Error-Toast: true` header support for flows that handle errors locally (e.g. form validation).

### Friendly message map (server-side follow-up)

Add structured errors in FastAPI `AppError` and validation handlers:

```json
{
  "error": "migration_required",
  "message": "Database schema is out of date. Contact your administrator.",
  "statusCode": 500
}
```

Phase H1: client-side sanitization only. Phase H2: improve server messages.

---

## UX rules

1. **One toast per failed request** — no stacking 6 identical inbox poll errors.
2. **Debounce polling failures** — NotificationBell polls every N seconds; toast at most once per 30s per endpoint.
3. **401**: redirect only, no toast (user is being sent to login).
4. **Mutations** (POST/PATCH/DELETE): always toast on failure.
5. **Background loads** (dashboard panels): toast + inline panel error state.
6. **Duration**: 5s for errors, 4s for success (existing).

---

## Implementation tasks

| ID | Task | File |
|----|------|------|
| T-01 | Add `mapApiErrorToToast(error): string` | `src/services/base/apiError.ts` |
| T-02 | Call `toastError` from response interceptor | `BaseApiService.ts` |
| T-03 | Add poll debounce helper | `src/hooks/useApiErrorToast.ts` |
| T-04 | Update `NotificationBell` to use debounced toast | `NotificationBell.tsx` |
| T-05 | Ensure `ToastProvider` wraps app root | `App.tsx` / layout |
| T-06 | Unit tests for message sanitizer | `apiError.test.ts` |

---

## Edge cases

| Scenario | Expected UX |
|----------|-------------|
| Multiple parallel dashboard fetches fail | One combined toast: "Some dashboard data failed to load." |
| User offline | Single network toast |
| Session expired mid-action | Redirect to login; optional one-time "Session expired" toast before redirect |
| Patient portal (phone auth) | Same toast rules; no staff redirect on 401 |
| Validation 422 on form | Toast + field-level errors if returned |

---

## Acceptance criteria

- [ ] Failed `GET /notifications/inbox` shows toast (not silent).
- [ ] Failed dashboard summary shows toast.
- [ ] Raw `UndefinedColumnError` never shown to user.
- [ ] Settings consent still shows specific toast on save failure.
- [ ] No toast spam when bell polls every 10s with persistent 500.
