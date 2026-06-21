# Livotale UI

Frontend for **Livotale** — liver care platform: enquiries, orders, fibrosis scan, partner lab pathology, AI reports, doctor consultations, and patient portal.

Built with React 19, Vite, TypeScript, Tailwind CSS, Zustand, and shadcn/Radix UI.

## Requirements

- Node.js **20+**
- [pnpm](https://pnpm.io/) **9+**

## Quick start

```bash
pnpm install
cp .env.example .env
# For Docker gateway: VITE_API_BASE_URL=http://localhost:3008/api/v1
# For direct host API: VITE_API_BASE_URL=http://localhost:4000/api/v1
pnpm dev
```

Vite usually runs at **http://localhost:5174** in this workspace.

## Environment

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | REST API base URL (`http://localhost:3008/api/v1` through nginx, or `http://localhost:4000/api/v1` direct API) |
| `VITE_APP_ENV` | Set to `dev` locally to expose frontend dev tools; omit or use `production` otherwise |
| `VITE_HMR_CLIENT_PORT` | Optional HMR client port when developing through Docker nginx (`3008`) |
| `VITE_DEV_LOGIN_USERNAME` / `VITE_DEV_LOGIN_PASSWORD` | Optional dev-only login prefill |

## Scripts

```bash
pnpm dev      # Vite dev server
pnpm build    # Production build
pnpm test     # Jest unit tests
pnpm lint     # ESLint
```

## Roles & navigation

Route guards: `src/app/config/liverCareRouteRoles.ts` · Sidebar: `src/app/config/navigation.ts`

| Role | Identifier | Password | Home |
|------|------------|----------|------|
| **Super Admin** | `abhishek@livotale.com` | `Admin@123` | `/dashboard` |
| **Assigned Ops** | `dipten@livotale.com` | `Ops@123` | `/dashboard` |
| **Operator** | `vivek` | `Ops@123` | `/dashboard` |
| **Technician** | `technician@livotale.com` | `Tech@123` | `/dashboard` |
| **Doctor** | `dr.vijay@livotale.com` | `Doctor@123` | `/dashboard` |
| **Patient** | phone on an active order | OTP `123456` in demo mode | `/patient/login` |

No patient accounts or orders are pre-seeded in the fresh local database.

## Key routes

| Area | Routes |
|------|--------|
| Public | `/packages`, `/enquire` |
| Ops | `/admin/operations`, `/admin/orders/:id` |
| Partner lab | `/admin/operations?tab=partner-lab` |
| Notifications | `/notifications` (staff), `/patient/notifications` |
| Doctor | `/doctor/consultations/:id` |
| Technician | `/technician/orders/:id` |
| Patient portal | `/patient`, `/patient/orders/:id/report` |

## Project structure

| Layer | Path |
|-------|------|
| Pages | `src/app/pages/<feature>/` |
| Liver care domain | `src/services/liverCare/` |
| External dummies | `src/services/external/` |
| RBAC | `src/app/config/liverCareRouteRoles.ts` |
| **Specs** | `specs/` — [README](specs/README.md), [TASKS](specs/TASKS.md) |

## Specifications

All product requirements live under **`specs/`**:

- **[specs/README.md](specs/README.md)** — index
- **[specs/TASKS.md](specs/TASKS.md)** — global task tracker
- **[specs/features/](specs/features/)** — feature requirements (16 modules)
- **[specs/platform/](specs/platform/)** — architecture, mock mode
- **[specs/contracts/](specs/contracts/)** — API contracts
- **[specs/_archive/](specs/_archive/)** — superseded legacy specs

## License

Private — Livotale.
