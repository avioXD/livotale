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
# Set VITE_MOCK_MODE=true for offline UI
pnpm dev
```

App runs at **http://localhost:5173**.

## Environment

| Variable | Description |
|----------|-------------|
| `VITE_MOCK_MODE` | `true` = in-memory mocks, no API required |
| `VITE_API_BASE_URL` | REST API base URL (ignored in mock mode) |

## Scripts

```bash
pnpm dev      # Vite dev server
pnpm build    # Production build
pnpm test     # Jest unit tests
pnpm lint     # ESLint
```

## Roles & navigation

Route guards: `src/app/config/liverCareRouteRoles.ts` · Sidebar: `src/app/config/navigation.ts`

| Role | Username | Password | Home |
|------|----------|----------|------|
| **Administration** | `administration` | `Admin@123` | `/dashboard` |
| **Operations** | `operations` | `Ops@123` | `/dashboard` |
| **Technician** | `technician` | `Tech@123` | `/dashboard` |
| **Doctor** | `doctor` | `Doctor@123` | `/dashboard` |
| **Patient** | phone on order | OTP `123456` | `/patient/login` |

**Demo phones**: `9988776655` (Anita, PKG-3) · `9900000001` (Rohan, payment pending)

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
