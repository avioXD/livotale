# Feature Specification: Patient Management Module

**Feature Branch**: `004-patient-management` | **Created**: 2026-06-06 | **Status**: Approved

## Objective

Single longitudinal patient record for LIVGASTRO: demographics, clinical histories, timeline, summary card, doctor/admin views, and dashboard trends.

## User Stories (Priority)

### P1 — Patient List & Detail
Staff see paginated patient list; click through to full profile with summary card, trends, and timeline.

### P1 — Structured Clinical Histories
Demographics extensions, medical conditions, liver history, medications, allergies, family, surgeries, vaccinations — view and edit per role.

### P1 — Dashboard Analytics
Role-aware dashboard with live KPIs and trend charts (patients, visits, liver metrics).

### P2 — Longitudinal Trends
Graph + table for weight, BMI, ALT, FibroScan kPa, HbA1c over time with improved/stable/worsened status.

### P2 — Auto Timeline
Chronological events from registration, visits, labs, FibroScan, AI, prescriptions, coaching.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/patients` | Paginated list (role-aware) |
| GET | `/patients/:id` | Full profile + summary card |
| GET | `/patients/:id/timeline` | Chronological events |
| GET | `/patients/:id/trends` | Longitudinal metrics |
| GET | `/patients/:id/history` | All history sections |
| PATCH | `/patients/:id/demographics` | Extended demographics |
| PATCH | `/patients/:id/history/:section` | Update history section |
| GET | `/dashboard/overview` | KPIs + chart series |

## Success Criteria

1. PatientsPage loads live data from API
2. Patient detail shows summary card, timeline, trend charts
3. Dashboard shows real stats and at least 2 charts
4. Allergy data available before prescription workflow
5. Build and tests pass

See [plan.md](./plan.md).
