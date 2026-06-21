# Patient Portal UI Redesign — Design Spec

**Date:** 2026-06-21  
**Scope:** Responsive shell, navigation IA, orders stepper, page polish

---

## Goals

- Desktop: fixed left sidebar (~240px) with primary + secondary nav
- Mobile: bottom tab bar (Home, Orders, Notifications, Profile) + hamburger Sheet for Downloads, Support, Logout
- Consolidated `/patient/orders` list with read-only progress stepper
- Dashboard overview (next action, recent orders) without duplicate nav tiles
- Breadcrumbs on nested order routes; login split layout; remove "dummy" pay labels

---

## Breakpoints

| Token | Behavior |
|-------|----------|
| `< lg` (1024px) | Bottom nav visible; sidebar hidden; hamburger opens Sheet |
| `≥ lg` | Sidebar visible; bottom nav hidden; hamburger hidden |

Shell uses `min-h-[100dvh]`, mobile main `pb-[calc(4rem+env(safe-area-inset-bottom))]`.

---

## Navigation IA

### Primary (sidebar + bottom tabs)

| Label | Route | Bottom tab |
|-------|-------|------------|
| Dashboard | `/patient` | Home |
| Orders | `/patient/orders` | Orders |
| Notifications | `/patient/notifications` | Notifications |
| Profile | `/patient/profile` | Profile |

Orders tab active for `/patient/orders/*`.

### Secondary (sidebar footer + mobile Sheet)

| Label | Action |
|-------|--------|
| Downloads | `/patient/downloads` |
| Support | `mailto:care@livotale.test` |
| Logout | clear session → `/patient/login` |

### Hidden chrome

- `/patient/onboarding`: no sidebar, no bottom nav (minimal header only)

---

## Routes (unchanged + new)

| Route | Purpose |
|-------|---------|
| `/patient/orders` | **New** — all orders with stepper |
| `/patient/orders/:id` | Order hub + stepper |
| `/patient/orders/:id/pay` | Checkout; sticky Pay on mobile |
| `/patient/orders/:id/report` | Report |
| `/patient/orders/:id/prescription` | Rx |

---

## Patient order progress stepper

Simplified patient-facing steps derived from `LiverCareOrder` + package flags:

1. Payment
2. Scan
3. Pathology (PKG-2/3 only)
4. Report
5. Consult (PKG-3 only)
6. Prescription (PKG-3 only)
7. Done

States: `completed` | `current` | `pending`. Vertical on mobile; horizontal scroll on `sm+`.

---

## Acceptance criteria

1. All existing patient routes render inside new shell
2. Mobile 375px: no horizontal overflow; bottom nav clears content
3. Drawer opens Downloads, Support, Logout
4. Dashboard has no KPI shortcut tiles; shows next-action + recent orders
5. Orders list shows stepper per order
6. Order detail has stepper + breadcrumbs
7. Pay buttons say "Pay now" / "Complete payment" (no "dummy")
8. E2E: mobile viewport nav smoke test

---

## Out of scope

- Staff AdminShell mobile fix
- PatientJourneyPage merge
- Backend API changes
