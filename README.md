# Livotel UI

Tech-enabled liver care admin panel — React, Vite, TypeScript, Zustand, pnpm, Snyk, Spec Kit.

## Commands (pnpm only)

```bash
pnpm install
cp .env.example .env
pnpm dev
pnpm test
pnpm build
pnpm snyk:test      # requires SNYK_TOKEN
pnpm snyk:monitor
```

## Architecture

| Layer | Path | Purpose |
|-------|------|---------|
| Pages | `src/app/pages/<name>/` | Page + local `components/` |
| Global components | `src/components/common/` | DataTable, ListToolbar, Pagination |
| Types | `src/types/` | All domain TypeScript types |
| Store | `src/store/` | Zustand (auth + `createListStore`) |
| Services | `src/services/` | Class-based API layer |
| Utils | `src/utils/` | Debounce, constants, helpers |

## List / Table Pattern

- **Search**: debounced (`DEBOUNCE.searchMs` = 400ms) via store
- **Filters**: draft → **Apply Filters** → refetch
- **Pagination**: debounced (`DEBOUNCE.paginationMs` = 250ms)
- API calls for lists go through Zustand stores, not components

## Cursor Rules

- `.cursor/rules/spec-driven-development.mdc` — Spec Kit workflow
- `.cursor/rules/livotel-development-standards.mdc` — folderization & patterns

## Spec Kit

Use `/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement` before feature work.

Active feature specs:

| Spec | Path | Scope |
|------|------|--------|
| **007 RBAC appointment scheduling** | [`specs/007-rbac-appointment-scheduling/`](specs/007-rbac-appointment-scheduling/spec.md) | Unified appointments, RBAC, calendar, tele, prescription PDF, admin ops |
| 005 Appointments (deprecated) | [`specs/005-appointments-module/`](specs/005-appointments-module/spec.md) | Home-visit MVP — superseded by 007 |
