# Implementation Plan: Patient Onboarding Gate

**Branch**: `002-patient-journey` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

## Summary

Force incomplete patients into a mobile-first full-screen onboarding flow (`/patient-journey`) after login/register. Block access to the admin shell until home visit is booked. Staff roles unaffected.

## Constitution Check

| Gate | Status |
|------|--------|
| Spec updated before implementation | PASS |
| Pages → store → service layering | PASS |
| API contract fidelity | PASS |
| Mobile-first onboarding UX | PASS |

## Onboarding Complete Criteria

Patient onboarding is **complete** when:
- `journey_status` is `visit_booked` or later, OR
- `journey_timestamps.appointmentBooking` is set

Until then, patient sees **only** `/patient-journey` inside `OnboardingShell` (no sidebar/topbar admin chrome).

## Architecture

```text
Login/Register → PostAuthRedirect
  ├─ Patient + incomplete → /patient-journey (OnboardingShell)
  └─ Patient + complete / Staff → /dashboard (AdminShell)

PatientOnboardingRoute (requireComplete)
  └─ Redirects incomplete patients away from AdminShell routes

PatientOnboardingRoute (!requireComplete)
  └─ Redirects complete patients away from /patient-journey
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/patient/onboarding/status` | Lightweight `{ onboardingComplete, journeyStatus, currentStep }` |
| GET | `/patient/journey` | Full journey + `onboardingComplete` + `currentStep` |

## UI Components

| File | Role |
|------|------|
| `OnboardingShell.tsx` | Mobile full-viewport layout, logo + logout |
| `PatientOnboardingRoute.tsx` | Route guard for patient onboarding state |
| `PostAuthRedirect.tsx` | Post-login/register destination resolver |
| `journeyHelpers.ts` | `isPatientOnboardingComplete`, `resolvePatientHomePath` |

## Test Plan

1. Register new patient → lands on `/patient-journey` only (no nav sidebar)
2. Login `patient.rohan` (incomplete) → `/patient-journey`
3. Complete journey through visit booking → redirects to dashboard with full nav
4. Login `doctor.iyer` → dashboard immediately (no onboarding gate)
