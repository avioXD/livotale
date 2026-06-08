# Feature Specification: Admin Operations Hub

**Feature Branch**: `009-admin-operations-hub` | **Created**: 2026-06-07 | **Status**: Approved

**Product**: LIVGASTRO Smart Liver Clinic (Livotale)

**Extends**: [007-rbac-appointment-scheduling](../007-rbac-appointment-scheduling/spec.md), [008-sample-collection-lab-workflow](../008-sample-collection-lab-workflow/spec.md)

## Objective

Reorganize admin operations into a single, logically structured **Operations Hub** for clinic staff — replacing fragmented pages with tabbed workspaces, filterable paginated tables, unified payment collection, and seeded demo data.

## Design decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Route Monitor as top-level nav? | **No** — embed as panel inside Appointments tab | Useful only for home sample visits; not daily for all ops roles |
| Missed Appointments as separate page? | **No** — status filter on Appointments table (`missed`, `no_show`) | Same data model; avoids duplicate queues |
| Sample Collections separate nav? | **Merged into Operations Hub tab** | One place for day-to-day ops |
| Orders & Payments | **New tab** — appointment + pharmacy/service orders | Cash, online demo gateway, QR collection at front desk |

## User Scenarios

### US1 — Operations overview (P1)

Admin opens Operations Hub → sees today's KPIs (appointments, samples pending assign, unpaid orders).

**Acceptance**: KPI cards load from API; links drill into filtered tabs.

### US2 — Appointments table (P1)

Admin views all appointments (doctor consult, walk-in, tele, home sample) in a paginated table with filters: status, type, date range, payment status, doctor. Missed/no-show via status filter. Field route tracking available as expandable panel when home visits are active.

**Acceptance**: Filter + pagination; row opens detail; walk-in book CTA.

### US3 — Sample collections table (P1)

Admin views sample collection requests in paginated table with status/pincode filters; assign technician; open linked appointment.

**Acceptance**: Same list capabilities as prior standalone page; create walk-in sample via book flow.

### US4 — Orders & payments (P1)

Admin sees unpaid/pending orders (appointments + commerce). Collect payment via cash, online (demo gateway), or QR. Patient self-pay uses demo payment gateway at booking.

**Acceptance**: Payment status updates; demo gateway simulates success; seed data shows mixed states.

## Functional Requirements

- **FR-001**: Single Operations Hub at `/admin/operations` with tabs: Overview, Appointments, Sample Collections, Orders & Payments
- **FR-002**: Appointments tab MUST use DataTable + ListToolbar + PaginationControls
- **FR-003**: Sample Collections tab MUST use DataTable + filters + pagination
- **FR-004**: Missed appointments accessible via status filter, not separate nav item
- **FR-005**: Route monitor embedded in Appointments tab (collapsible), not sidebar entry
- **FR-006**: Orders tab lists appointment payments and pharmacy orders with collect-payment action
- **FR-007**: Patient booking payment step shows demo gateway (UPI/card simulation)
- **FR-008**: Legacy routes redirect to hub tabs for backward compatibility
- **FR-009**: Seed script populates appointments, samples, and pending payments for demo

## Success Criteria

- **SC-001**: Admin completes walk-in book → sample assign → collect cash payment in under 3 minutes (demo)
- **SC-002**: All four hub tabs render with seeded data when API + seed script run
- **SC-003**: Sidebar shows one "Operations" entry instead of four fragmented ops links

## Assumptions

- Demo payment gateway does not call real Razorpay/Cashfree
- Client-side pagination acceptable for v1 (limit 200 per fetch)
- Existing appointment and sample collection APIs reused
