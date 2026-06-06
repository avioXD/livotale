# Livotel UI

Tech-enabled liver care admin panel built with React, Vite, TypeScript, Zustand, Axios, shadcn/ui, and JWT-based RBAC.

## Stack

- **React 19** + **Vite 7** + **TypeScript**
- **Zustand** — global state management
- **Axios** — HTTP client with JWT interceptors
- **shadcn/ui** — UI components (Radix + Tailwind)
- **React Icons** — navigation & auth icons
- **React Router** — routing with protected/open routes
- **Jest** — unit tests
- **uuid** — unique ID generation

## Brand

- Primary: `#D7316C`
- Secondary: `#1EABB3`
- Logo: `/public/assets/livotale-logo.png`

## Project Structure

```
src/
├── app/                  # Core UI (layouts, pages, routes, config)
├── components/ui/        # shadcn UI components
├── lib/                  # shadcn utilities
├── rbac/                 # JWT + role-based access control
├── services/             # Class-based API services
│   ├── base/             # BaseApiService (GET/POST/PUT/PATCH/DELETE)
│   └── auth/             # AuthService
├── store/                # Zustand stores
├── types/                # Shared TypeScript types
└── utils/                # Global utilities
```

## Roles

| Role | Description |
|------|-------------|
| `PATIENT` | End user receiving liver care at home |
| `TECHNICIAN` | Collects FibroScan + blood samples |
| `DOCTOR` | Verifies AI plans & approves prescriptions |
| `ADMIN` | Backend control panel access |

## Open Routes

- `/login`
- `/register`
- `/reset-password`

All other routes require a valid JWT token.

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
npm test
npm run build
```

## Spec Kit

Initialized with [GitHub Spec Kit](https://github.com/github/spec-kit) for spec-driven development with GitHub Copilot integration.
