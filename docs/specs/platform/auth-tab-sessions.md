# Platform: Per-tab staff auth sessions

**Scope**: Staff/org portal (`/org/login`, JWT auth)  
**Out of scope**: Patient portal (`livotale_patient_portal_session` in `localStorage`)

## Goal

Each browser tab holds an **independent staff session** so QA and ops can sign in as different roles or credentials in parallel tabs without overwriting each other.

## Storage model

| Key | Storage | Scope |
|-----|---------|-------|
| `livotale_access_token` | `sessionStorage` | Per tab |
| `livotale_refresh_token` | `sessionStorage` | Per tab |
| `livotale-auth` (Zustand persist) | `sessionStorage` | Per tab |
| `livotale_patient_portal_session` | `localStorage` | Shared (unchanged) |

Implementation: [`src/rbac/authStorage.ts`](../../src/rbac/authStorage.ts)

## Behavior

| Action | Result |
|--------|--------|
| Login in Tab B | Only Tab B tokens and Zustand state update |
| Tab A already logged in | Unchanged until Tab A closes or logs out |
| Logout in Tab A | Clears Tab A session only |
| 401 in Tab A | Redirects Tab A to login; Tab B keeps working |
| New tab / bookmark | Empty session — user must sign in |
| Close tab | Session cleared automatically |

Backend supports multiple concurrent `web_sessions` per user; no API changes required.

## Migration (one-time per tab)

On first load after deploy, if `sessionStorage` has no staff auth but legacy keys exist in `localStorage`, copy:

- `livotale_access_token`
- `livotale_refresh_token`
- `livotale-auth`

into `sessionStorage`, then **remove** from `localStorage` to prevent cross-tab bleed.

Runs at module boot before Zustand rehydrate.

## UX tradeoffs

- **New tabs require login** — expected cost of tab isolation.
- **Sessions do not survive tab close** — no cross-tab “remember me” for staff.
- **Dev shortcuts** on `/org/login` work per tab independently.

## Related

- [auth-api.md](../contracts/auth-api.md) — JWT login, refresh, select-role
- [14-rbac-navigation.md](../features/14-rbac-navigation.md) — role routing
- [LOCAL_CREDENTIALS.md](../../../LOCAL_CREDENTIALS.md) — bootstrap accounts
