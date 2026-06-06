# Tasks: Auth API Integration

## Phase 1 — Foundation

- [x] T001 Fill constitution at `.specify/memory/constitution.md`
- [x] T002 Create spec, plan, and API contract docs
- [x] T003 Add `src/utils/authMappers.ts` for API ↔ UI mapping
- [x] T004 Update `src/types/auth.ts` and `src/types/rbac.ts`

## Phase 2 — Services & Store

- [x] T005 Update `BaseApiService` to unwrap `{ data }` and extract errors
- [x] T006 Rewrite `AuthService` for `/auth/login`, `/auth/me`, `/patient/register`
- [x] T007 Update `authStore` — profile hydration, register-then-login flow

## Phase 3 — UI & RBAC

- [x] T008 LoginPage: username field (not email)
- [x] T009 RegisterPage: patient-only fields matching API
- [x] T010 Extend `AppRole` with COACH; update route guards
- [x] T011 Fix `.env.example` base URL to port 4000

## Phase 4 — Verification

- [x] T012 Add unit tests for auth mappers
- [ ] T013 Live API curl test (requires `livotale_app/api/.env` with `DATABASE_URL`)
- [x] T014 Run `pnpm test` and `pnpm build`
