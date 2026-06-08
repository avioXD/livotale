# Feature Specification: RBAC Authentication & Authorization Module

**Feature Branch**: `003-rbac-auth-module` | **Created**: 2026-06-06 | **Status**: Approved

**Product**: LIVGASTRO (Livotale)

## Objective

Complete role-based authentication and authorization for 10 distinct roles, extending the existing username/password JWT flow with sessions, profile management, audit, and security controls.

## Roles (10)

| # | Role | API code | UI `AppRole` |
|---|------|----------|--------------|
| 1 | Patient | `patient` | `PATIENT` |
| 2 | Technician | `technician` | `TECHNICIAN` |
| 3 | Doctor | `doctor` | `DOCTOR` |
| 4 | Dietician | `dietician` | `DIETICIAN` |
| 5 | Health Coach | `health_coach` | `HEALTH_COACH` |
| 6 | Pharmacy | `pharmacy` | `PHARMACY` |
| 7 | Lab Partner | `lab_partner` | `LAB_PARTNER` |
| 8 | Operations Team | `support` | `OPERATIONS` |
| 9 | City Manager | `city_manager` | `CITY_MANAGER` |
| 10 | Super Admin | `admin` | `SUPER_ADMIN` |

## User Stories (Priority Order)

### P1 — Ten-Role RBAC
Each role has distinct UI mapping, nav visibility, and route guards. No interim collapsing of roles.

### P1 — Enhanced Authentication
- Email OR username OR mobile + password login
- JWT access token + refresh token with server-side sessions
- Logout revokes session
- Login logs with IP and user-agent

### P1 — Profile Management
Patient/staff can view and update: basic info, emergency contact, addresses, family members, insurance, identity verification status.

### P2 — Mobile OTP Login
Request OTP via mobile; verify OTP to issue tokens (dev: OTP logged to server console).

### P2 — Security Controls
Password policy enforcement, account lockout after failed attempts, consent record acceptance.

### P3 — 2FA, Social Login, Device Management
TOTP 2FA enable/verify endpoints; OAuth stub tables; device registry and session list/revoke.

## API Endpoints

### Auth
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/login` | Email/username/mobile + password |
| POST | `/auth/otp/request` | Request mobile OTP |
| POST | `/auth/otp/verify` | Verify OTP and issue tokens |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Revoke current session |
| GET | `/auth/me` | Current user + permissions |
| GET | `/auth/sessions` | List active sessions |
| DELETE | `/auth/sessions/:id` | Revoke a session |
| POST | `/auth/password/change` | Change password (policy enforced) |
| POST | `/auth/2fa/enable` | Enable TOTP 2FA |
| POST | `/auth/2fa/verify` | Verify TOTP code |

### Profile
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/profile` | Full profile aggregate |
| PATCH | `/profile/basic` | Update name, email, mobile, gender, DOB |
| PATCH | `/profile/emergency-contact` | Emergency contact (patients) |
| GET/POST/PATCH/DELETE | `/profile/addresses` | Address CRUD |
| GET/POST/PATCH/DELETE | `/profile/family-members` | Family member CRUD |
| GET/PATCH | `/profile/insurance` | Insurance details |
| GET | `/profile/identity-verification` | KYC status |

### Consent & Audit
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/consent/purposes` | List consent purposes |
| GET | `/consent/mine` | User consent records |
| POST | `/consent/accept` | Accept purpose consent |
| GET | `/audit/login-logs` | Own login history (admin: all) |
| GET | `/audit/activity` | Own activity log |

## Success Criteria

1. All 10 roles map 1:1 from API to UI with distinct nav/route access
2. Login accepts email, username, or mobile identifier
3. Refresh token flow works; logout revokes session
4. Profile settings page loads and saves basic + emergency contact
5. Password policy and lockout enforced on login/register
6. `pnpm test`, `pnpm build` pass

## Phased Delivery

| Phase | Scope |
|-------|-------|
| 1 | Migration, 10-role UI, enhanced auth, profile API + settings UI |
| 2 | OTP login, consent, login/activity audit UI |
| 3 | 2FA, social OAuth stubs, device management UI |

## Plan

See [plan.md](./plan.md) and [contracts/auth-rbac-api.md](./contracts/auth-rbac-api.md).
