# Tasks: RBAC Auth Module

## Phase 1 — Spec & Database
- [x] T001 Spec, plan, API contract
- [x] T002 Migration `016_auth_security_module.sql`

## Phase 2 — Backend Auth & Security
- [x] T003 Password policy + account lockout helpers
- [x] T004 Session service (refresh tokens, revoke)
- [x] T005 Enhanced authService (email/mobile login, logs, permissions)
- [x] T006 OTP service (dev stub)
- [x] T007 Auth routes (refresh, logout, OTP, sessions, 2FA stub)

## Phase 3 — Backend Profile & Audit
- [x] T008 Profile service + routes
- [x] T009 Consent service + routes
- [x] T010 Audit service + routes

## Phase 4 — Frontend RBAC
- [x] T011 Expand AppRole to 10 + update mappers/tests
- [x] T012 RBAC labels, hierarchy, navigation, route guards
- [x] T013 AuthService refresh token + OTP + logout
- [x] T014 ProfileService + profileStore + SettingsPage

## Phase 5 — Verification
- [x] T015 Run migration, API smoke test
- [x] T016 `pnpm build` + auth/RBAC unit tests pass

## Phase 6 — Future (not in scope)
- [ ] T017 Social OAuth providers (Google/Apple)
- [ ] T018 Production SMS OTP provider
- [ ] T019 TOTP 2FA UI + authenticator app integration
- [ ] T020 Permission-level route guards (beyond role checks)
- [ ] T021 Family/insurance/address full CRUD UI tabs
