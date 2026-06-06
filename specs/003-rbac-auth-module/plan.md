# Implementation Plan: RBAC Auth Module

**Branch**: `003-rbac-auth-module` | **Spec**: [spec.md](./spec.md)

## Constitution Check

| Gate | Status |
|------|--------|
| Spec before implementation | PASS |
| Pages → store → service layering | PASS |
| API contract fidelity | PASS |
| Auth/RBAC unit tests | PASS |

## Architecture

```text
LoginPage (email|username|mobile + OTP tab)
  → authStore → AuthService → POST /auth/login | /auth/otp/*
  → refresh via POST /auth/refresh on 401

SettingsPage (tabs)
  → profileStore → ProfileService → /profile/*

Route guards
  → AppRole (10 values) → navigation.ts + ProtectedRoute
```

## Backend Files

| File | Purpose |
|------|---------|
| `016_auth_security_module.sql` | Roles, login_logs, devices, OTP, 2FA, family, insurance |
| `security/passwordPolicy.js` | Validation rules |
| `services/sessionService.js` | Refresh tokens, web_sessions |
| `services/otpService.js` | OTP request/verify (dev console) |
| `services/profileService.js` | Profile CRUD |
| `services/auditService.js` | Login + activity logs |
| `services/consentService.js` | Consent acceptance |
| `services/authService.js` | Enhanced login, lockout, me+permissions |
| `routes/auth.js` | Expanded auth routes |
| `routes/profile.js` | Profile routes |
| `routes/consent.js` | Consent routes |
| `routes/audit.js` | Audit routes |

## Frontend Files

| File | Purpose |
|------|---------|
| `types/auth.ts` | 10 AppRoles, profile types |
| `utils/authMappers.ts` | 1:1 role mapping |
| `rbac/index.ts` | Labels, hierarchy, permissions helper |
| `services/auth/AuthService.ts` | Refresh, OTP, logout |
| `services/profile/ProfileService.ts` | Profile API |
| `store/profile/profileStore.ts` | Profile state |
| `app/pages/settings/SettingsPage.tsx` | Profile tabs UI |
| `app/pages/auth/LoginPage.tsx` | Email + OTP tabs |
| `app/config/navigation.ts` | Role-specific nav |
