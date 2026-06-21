# Livotale UI — Specifications

**Location**: `.specify/docs/specs/` (legacy product catalog; new feature work → `.specify/specs/`)

**Product**: Liver Fibrosis Scan clinic platform  
**Status**: UI mock layer ~87% complete · API integration deferred  
**Tracker**: [TASKS.md](./TASKS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Product flow

```
Enquiry → Package → Order → Payment → Technician scan → Partner lab pathology → AI extraction
  → Final report → Doctor consultation (PKG-3) → Prescription → Patient portal
```

All external integrations use **dummy service interfaces** (`mockOrApi`) until real APIs are wired.

---

## Directory layout

| Path | Purpose |
|------|---------|
| [features/](./features/) | Feature requirements (one doc per domain) |
| [platform/](./platform/) | Cross-cutting: architecture, mock mode |
| [contracts/](./contracts/) | REST API contracts (backend reference) |
| [TASKS.md](./TASKS.md) | **Global** development checklist |
| [PLAN.md](./PLAN.md) | Phased delivery plan |
| [_archive/](./_archive/) | Superseded specs (reference only) |

---

## Feature index

| # | Feature | Spec | UI status |
|---|---------|------|-----------|
| 01 | Public website & packages | [01-packages-public-website.md](./features/01-packages-public-website.md) | Done |
| 02 | Enquiry & patient | [02-enquiry-patient.md](./features/02-enquiry-patient.md) · [18-enquiries-crm.md](./features/18-enquiries-crm.md) | Done |
| 03 | Orders & workflow | [03-orders-workflow.md](./features/03-orders-workflow.md) | UI done |
| 04 | Payment (dummy) | [04-payment.md](./features/04-payment.md) | UI done |
| 05 | Fibrosis scan & technician | [05-fibrosis-scan-technician.md](./features/05-fibrosis-scan-technician.md) · [21-technician-field-portal.md](./features/21-technician-field-portal.md) | In progress |
| 06 | Partner lab pathology | [06-partner-lab-pathology.md](./features/06-partner-lab-pathology.md) | Done |
| 07 | AI extraction | [07-ai-extraction.md](./features/07-ai-extraction.md) | UI done |
| 08 | Final reports | [08-final-reports.md](./features/08-final-reports.md) | UI done |
| 09 | Doctor & prescription | [09-doctor-prescription.md](./features/09-doctor-prescription.md) | Done |
| 10 | Patient portal | [10-patient-portal.md](./features/10-patient-portal.md) | Done |
| 11 | Admin dashboard & audit | [11-admin-dashboard.md](./features/11-admin-dashboard.md) | Done |
| 12 | Notifications | [12-notifications-audit.md](./features/12-notifications-audit.md) · [triggers](./features/13-notification-triggers.md) | Done |
| 13 | RBAC & navigation | [14-rbac-navigation.md](./features/14-rbac-navigation.md) | Done |
| 14 | Dummy services | [15-dummy-services.md](./features/15-dummy-services.md) | Done |
| 15 | Data model | [16-data-model.md](./features/16-data-model.md) | Migrations done |

---

## Platform

| Doc | Scope |
|-----|-------|
| [architecture.md](./platform/architecture.md) | Code alignment map, reuse vs deprecate |
| [auth-tab-sessions.md](./platform/auth-tab-sessions.md) | Per-tab staff JWT sessions (`sessionStorage`) |
| [mock-mode.md](./platform/mock-mode.md) | `VITE_MOCK_MODE`, `mockOrApi`, mock accounts |
| [list-detail-pattern.md](./platform/list-detail-pattern.md) | Admin list → detail (View / Edit tabs); packages reference |
| [state-management.md](./platform/state-management.md) | Zustand stores — packages admin/public/detail |
| [ui-page-patterns.md](./platform/ui-page-patterns.md) | List/detail layout, back arrow, filters, pagination |
| [external-integrations.md](./platform/external-integrations.md) | Twilio, SendGrid, AI, templates, PDF letterheads |

---

## API contracts

| Contract | Status |
|----------|--------|
| [auth-api.md](./contracts/auth-api.md) | Staff JWT login |
| [auth-rbac-api.md](./contracts/auth-rbac-api.md) | Sessions, refresh, profile |
| [admin-operations-api.md](./contracts/admin-operations-api.md) | Ops hub (legacy appointments) |
| [appointment-scheduling-api.md](./contracts/appointment-scheduling-api.md) | Legacy scheduling (dual-write) |
| [sample-lab-api-legacy.md](./contracts/sample-lab-api-legacy.md) | **Deprecated** — in-house lab portal |

---

## Legacy specs (archived)

Superseded modules live under [_archive/legacy-modules/](./_archive/legacy-modules/). Do not implement new work from archived specs.

| Archived | Replaced by |
|----------|-------------|
| 002 Patient journey | 10-patient-portal, 02-enquiry-patient |
| 005 Appointments MVP | 03-orders-workflow |
| 006 Clinical reports (anatomy) | 08-final-reports |
| 008 Sample/lab workflow | 06-partner-lab-pathology |
| 010 RBAC | 14-rbac-navigation |

Retained reference specs (not archived): `001-auth`, `003-rbac`, `004-patient-management`, `007-appointment-scheduling`, `009-operations-hub` — backend still uses these until API phase completes.

---

## Roles (mock)

| Role | Login | Home |
|------|-------|------|
| Administration | `administration` / `Admin@123` | `/dashboard` |
| Operations | `operations` / `Ops@123` | `/dashboard` |
| Technician | `technician` / `Tech@123` | `/dashboard` |
| Doctor | `doctor` / `Doctor@123` | `/dashboard` |
| Patient | phone on order / OTP `123456` | `/patient` |
