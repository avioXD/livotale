# Implementation Plan: Patient Management

## Constitution Check

| Gate | Status |
|------|--------|
| Spec before code | PASS |
| Pages → store → service | PASS |
| API contract fidelity | PASS |

## Architecture

```text
PatientsPage → patientsStore → PatientsService → GET /patients
PatientDetailPage → patientDetailStore → PatientsService → GET /patients/:id, /timeline, /trends
DashboardPage → dashboardStore → DashboardService → GET /dashboard/overview
```

## DB (017)

- Extend `clinical.patients` demographics columns
- `patient_conditions`, `patient_liver_history`, `patient_medications`, `patient_allergies`, `patient_surgeries`, `patient_vaccinations`, `patient_timeline_events`

## Backend

- `patientManagementService.js` — list, detail, timeline composer, history CRUD
- `routes/patients.js` — unified staff routes
- `routes/dashboard.js` — overview stats

## Frontend

- Recharts for trend/sparkline charts
- `PatientDetailPage` with tabs: Summary, Timeline, Trends, Histories
- Wire `PatientsService` to new API
- Role-aware dashboard
