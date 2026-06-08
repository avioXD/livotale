# Feature Specification: Auth API Integration

**Feature Branch**: `001-auth-api-integration`

**Created**: 2026-06-06

**Status**: Approved

**Input**: Wire livotale-ui login/register to livotale_app Fastify API with role-based access.

## User Scenarios & Testing

### User Story 1 - Staff Login by Role (Priority: P1)

Clinical and operations staff sign in with username/password and land on the dashboard with correct route access for their role.

**Why this priority**: All protected UI depends on working authentication.

**Independent Test**: Login as `doctor.iyer`, `tech.vinod`, and `admin.ops` with mock credentials; verify JWT stored and `/auth/me` returns matching roles.

**Acceptance Scenarios**:

1. **Given** valid doctor credentials, **When** user submits login, **Then** access token is stored and user role is DOCTOR.
2. **Given** valid technician credentials, **When** user submits login, **Then** user role is TECHNICIAN and `/Liver Fibrosis Scan` route is accessible.
3. **Given** invalid password, **When** user submits login, **Then** an error message is shown and no token is stored.

---

### User Story 2 - Patient Self-Registration (Priority: P2)

A new patient creates an account via the register form and is signed in automatically.

**Why this priority**: API supports patient onboarding only via `POST /patient/register`.

**Independent Test**: Register a unique patient username; verify row in `identity.users` + `clinical.patients`; auto-login succeeds.

**Acceptance Scenarios**:

1. **Given** valid registration fields, **When** user submits register, **Then** patient record is created and user is authenticated.
2. **Given** duplicate username, **When** user submits register, **Then** API error is surfaced in the UI.

---

### User Story 3 - Role-Based Route Guards (Priority: P1)

Authenticated users only access routes allowed for their mapped role.

**Independent Test**: Login as patient; navigating to `/patients` redirects to dashboard.

**Acceptance Scenarios**:

1. **Given** PATIENT role, **When** visiting `/patients`, **Then** redirect to `/dashboard`.
2. **Given** DOCTOR role, **When** visiting `/patients`, **Then** page renders.

---

### Edge Cases

- API returns `{ data }` envelope — services must unwrap.
- Register endpoint does not return a token — UI must login after successful registration.
- Reset password and logout endpoints do not exist on API — logout is client-side; reset shows unsupported message.
- Care/pharmacy/lab roles exist in DB but UI maps coach roles to COACH; pharmacy/lab map to ADMIN for portal access until dedicated portals exist.

## Requirements

### Functional Requirements

- **FR-001**: Login MUST call `POST /auth/login` with `{ username, password }`.
- **FR-002**: After login, UI MUST call `GET /auth/me` to hydrate user profile.
- **FR-003**: Register MUST call `POST /patient/register` with `{ username, password, fullName, email?, mobile? }`.
- **FR-004**: API role codes MUST map to UI `AppRole` for route guards.
- **FR-005**: `VITE_API_BASE_URL` MUST default to `http://localhost:4000` (no `/api` prefix).
- **FR-006**: Bearer token MUST be attached via axios interceptor.

### Key Entities

- **identity.users**: Auth identity (username, password_hash, full_name, email, mobile).
- **identity.roles / user_roles**: RBAC assignment (patient, doctor, technician, admin, health_coach, etc.).
- **clinical.patients**: Patient profile linked to user on registration.

## Success Criteria

- **SC-001**: All 4 primary staff roles (doctor, technician, admin, patient) can login via UI against live API.
- **SC-002**: Patient registration creates DB records and signs user in.
- **SC-003**: Role-guarded routes enforce access per spec scenarios.
- **SC-004**: `pnpm test` and `pnpm build` pass.

## Assumptions

- `livotale_app/api` runs on port 4000 with migrated/seeded PostgreSQL.
- Staff accounts are provisioned via seed/admin; self-service register is patient-only.
- Refresh tokens are out of scope (API issues access JWT only).
