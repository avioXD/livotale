# Livotale UI

Frontend for **Livotale** — a tech-enabled liver care platform covering patient journeys, clinical workflows, home sample collection, lab reporting, pharmacy fulfillment, and clinic operations.

Built with React 19, Vite, TypeScript, Tailwind CSS, Zustand, and shadcn/Radix UI.

## Requirements

- Node.js **20+**
- [pnpm](https://pnpm.io/) **9+** (enforced via `only-allow`)

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

App runs at **http://localhost:5173** (or the next free Vite port).

Point `VITE_API_BASE_URL` in `.env` at the Livotale API (default `http://localhost:4000`). When the API is offline, several modules fall back to in-browser demo data.

## Environment

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | REST API base URL |
| `VITE_DEV_LOGIN_USERNAME` | Dev-only login prefill (ignored in production builds) |
| `VITE_DEV_LOGIN_PASSWORD` | Dev-only login prefill (ignored in production builds) |

## Scripts

```bash
pnpm dev          # Vite dev server
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm test         # Jest unit tests
pnpm lint         # ESLint
pnpm snyk:test    # Snyk dependency scan (requires SNYK_TOKEN)
pnpm snyk:monitor
```

## Roles & navigation

The sidebar is role-aware. Each role sees only the sections relevant to clinical access standards:

| Role | Primary areas |
|------|----------------|
| **Patient** | Patient Journey, My Appointments (card view), My Care (reports, plans, Rx, coaching, delivery) |
| **Doctor** | Dashboard, Clinical (appointments table, patients, availability, leave) |
| **Technician** | Dashboard, Field Operations (sample collection schedule) |
| **Lab partner** | Lab Operations (dashboard, testing queue, reports) |
| **Dietician / Health coach** | Dashboard, Care coordination (appointments table, patients, plans/sessions) |
| **Pharmacy** | Dashboard, Patients, Fulfillment (prescriptions, home delivery) |
| **Operations / City manager / Super admin** | Dashboard, Patients, Operations hub (appointments, samples, orders), People & Staff |

**Appointments routing**

- Patients → `/appointments` (card view, book / reschedule / cancel)
- Allied health → `/appointments` (table view)
- Doctors → `/doctor/appointments`
- Admin ops → `/admin/operations?tab=appointments`

**Settings** → `/settings` (profile, security, and staff employment profile tabs by role)

## Project structure

| Layer | Path | Purpose |
|-------|------|---------|
| Pages | `src/app/pages/<feature>/` | Route-level screens and local components |
| Layouts | `src/app/layouts/` | Admin shell, sidebar, top bar |
| Routes | `src/app/routes/` | React Router, auth gates, onboarding |
| Config | `src/app/config/` | Navigation, role defaults |
| Components | `src/components/` | Shared UI (DataTable, dialogs, shadcn) |
| Store | `src/store/` | Zustand stores |
| Services | `src/services/` | API client layer |
| Types | `src/types/` | Domain TypeScript types |
| Specs | `specs/` | Spec Kit feature specifications |

## List / table pattern

- **Search** — debounced via store (`DEBOUNCE.searchMs`)
- **Filters** — draft state → **Apply filters** → refetch
- **Pagination** — client or server via `paginateList` + `PaginationControls`
- Prefer loading list data through Zustand stores, not ad-hoc fetches in leaf components

## Feature specs (Spec Kit)

| Spec | Scope |
|------|--------|
| [001 Auth API integration](specs/001-auth-api-integration/spec.md) | Login, tokens, API wiring |
| [002 Patient journey](specs/002-patient-journey/spec.md) | Onboarding funnel |
| [003 RBAC auth](specs/003-rbac-auth-module/spec.md) | Roles and route guards |
| [004 Patient management](specs/004-patient-management/spec.md) | Registry and detail |
| [005 Appointments](specs/005-appointments-module/spec.md) | Legacy home-visit MVP (superseded by 007) |
| [006 Clinical reports](specs/006-clinical-reports/spec.md) | Reports and anatomy views |
| [007 RBAC appointment scheduling](specs/007-rbac-appointment-scheduling/spec.md) | Unified scheduling, tele, prescriptions, admin |
| [008 Sample collection & lab](specs/008-sample-collection-lab-workflow/spec.md) | Technician → lab pipeline |
| [009 Admin operations hub](specs/009-admin-operations-hub/spec.md) | Ops dashboard, appointments, samples, orders |

Use `/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement` for new features.

## Backend

The API lives in a separate repo/folder (`livotale_app/api`). Run migrations and seed scripts there for full end-to-end flows (appointments, sample collections, staff onboarding, operations demo).

## Cursor rules

- `.cursor/rules/spec-driven-development.mdc` — Spec Kit workflow
- `.cursor/rules/livotel-development-standards.mdc` — Folder layout and UI patterns

## License

Private — Livotale / Livotel.
