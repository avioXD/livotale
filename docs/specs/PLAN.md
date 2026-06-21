# Livotale Liver Care — Delivery Plan

**Last updated**: 2026-06-09

---

## Phase A — Foundation ✅

- TypeScript domain types, DB migrations 032–034
- Dummy external services (`IPaymentService`, `IAIExtractionService`, etc.)
- `mockOrApi` layer + `liverCare.mock.ts` seed data
- RBAC route map (`liverCareRouteRoles.ts`)

## Phase B — Core ops workflow ✅

- Public `/packages`, `/enquire`
- Operations hub: enquiries, orders, payments
- Order workflow engine (`orderWorkflow.ts`) — PKG-1/2/3 rules
- Patient auto-create on order (phone = portal login)

## Phase C — Clinical pipeline ✅

- Technician order visits + fibrosis scan capture
- Partner lab pathology (external lab only — dispatch → email PDF → upload)
- AI extraction review + final letterhead report
- Doctor consultation + prescription (PKG-3)

## Phase D — Portals & admin ✅

- Patient OTP portal (pay, reports, Rx, notifications)
- Role dashboards (admin, ops, technician, doctor)
- Push notification inbox (bell + `/notifications`)
- Admin audit, channel notification log, integrations stub

## Phase G — AI-Hybrid Liver Health Dashboard (in progress)

Visual dashboard report shared by doctor and patient portals:

- `ILiverHealthAIService` + dummy implementation (FIB-4, LSM/CAP, composite scores)
- Circular gauges, liver roadmap SVG, risk matrix, biomarker tables
- Doctor consultation clinical tab + patient published report view
- Spec: [features/19-liver-health-dashboard-report.md](./features/19-liver-health-dashboard-report.md)

## Phase E — API integration (deferred)

Wire UI services to real API endpoints per [contracts/](./contracts/). Priority order:

1. Public packages + enquiries (`W105`, `E101`)
2. Order CRUD + workflow transitions (`O102`)
3. Payment + portal pay (`P101`)
4. Pathology + sample dispatch API
5. AI extraction jobs (`A102`)
6. Deprecate legacy appointment/sample-lab dual-write

## Phase F — QA (deferred)

- E2E PKG-1 / PKG-2 / PKG-3 mock flows
- API README + OpenAPI
- Stakeholder sign-off on order vs appointment model

---

## Packages (seed)

| Code | Price | Scan | Pathology | Doctor |
|------|-------|------|-----------|--------|
| PKG-1 | ₹5,500 | ✓ | — | — |
| PKG-2 | ₹8,000 | ✓ | ✓ | — |
| PKG-3 | ₹9,500 | ✓ | ✓ | ✓ |

---

## Out of scope (removed / deprecated)

- In-house lab partner login (`/lab-samples`, lab dashboard)
- Dietician, health coach, pharmacy staff UI
- Appointment-first ops (secondary to orders; tele consult retained for PKG-3)
- Patient journey onboarding wizard (replaced by patient portal)
