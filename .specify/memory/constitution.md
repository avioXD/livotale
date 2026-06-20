<!--
Sync Impact Report
- Version: 1.2.0 (added Server-Side Persistence principle)
- Modified principles: N/A
- Added sections: Core Principle VII (Server-Side Persistence)
- Templates: plan-template.md (Constitution Check gates aligned)
- Follow-up: profile consent acceptance E2E via /consent/*
-->

# Livotale UI Constitution

## Core Principles

### I. Spec-Driven Development

Non-trivial features MUST have a spec, plan, and tasks under `specs/` before implementation. Bug fixes under five lines may skip spec creation. Spec and code MUST stay aligned at merge time.

### II. API Contract Fidelity

The UI MUST consume `livotale_app/api` endpoints as documented. Do not invent routes, request shapes, or response envelopes. Map API `{ data: ... }` wrappers in service layers, not in page components.

### III. Layered Architecture (NON-NEGOTIABLE)

Pages → Zustand stores → class-based services → API. Pages MUST NOT call axios directly for domain data. Types live in `src/types/`. RBAC logic lives in `src/rbac/`.

### IV. Test Before Merge

Run `pnpm test`, `pnpm build`, and `pnpm snyk:test` before merging. Auth and RBAC changes MUST include unit tests for mappers and access helpers.

### V. Simplicity & Scope Control

Prefer the smallest diff that satisfies the spec. Reuse existing stores, services, and shadcn components. No speculative abstractions.

### VI. Performance & React Optimization (NON-NEGOTIABLE)

Every feature MUST be built for a fast, responsive app. Optimize by default — do not defer performance to a later pass.

**Code splitting & lazy loading**

- Route components MUST be lazy-loaded with `React.lazy` + `Suspense` (with a fallback) so each page ships as its own chunk. Never statically import a whole page tree into the initial bundle.
- Heavy, below-the-fold, or rarely-used UI (charts, editors, dialogs, maps, PDF/report viewers) MUST be lazy-loaded and code-split.
- Heavy non-UI dependencies MUST be imported dynamically (`await import(...)`) at the point of use, not at module top-level.
- Use named imports / tree-shakeable paths (e.g. per-icon imports). Never `import * as` for large libraries.

**Memoization**

- Wrap pure presentational and list-row components in `React.memo`. Provide a stable `getRowKey`/`key`.
- Memoize derived data with `useMemo` and event handlers passed to children with `useCallback`. Keep dependency arrays exact and complete.
- Do NOT over-memoize trivial values; memoize only computed work, referential stability for child props, or expensive renders.

**Zustand usage**

- Shared/async state MUST live in Zustand stores; pages never hold cross-cutting domain state in local `useState`.
- ALWAYS subscribe with selectors (`useStore((s) => s.field)`), never destructure the whole store, to avoid needless re-renders. Use `useShallow` for multi-field/object/array selections.
- Keep actions inside the store; components call actions, they do not mutate state. Cache fetched data with an `isLoaded` guard so global data (e.g. service zones, config) is fetched once and reused.
- Derive, do not duplicate: compute filtered/sorted views via selectors or `useMemo`, not by storing redundant copies.

**React techniques for responsiveness**

- Lists MUST be paginated or virtualized; never render unbounded collections.
- Use stable keys (never array index for dynamic lists). Co-locate effects with exact dependencies; clean up subscriptions/timers/listeners.
- Mark non-urgent updates (search/filter typing) with debounce (`DEBOUNCE`) and, where it improves input latency, `useTransition`/`useDeferredValue`.
- Avoid layout thrash and prop drilling; lift state only as far as needed.

### VII. Server-Side Persistence (NON-NEGOTIABLE)

User-facing settings, consent, profile, and account preferences MUST be persisted through `livotale-apis` into PostgreSQL. UI toasts, local component state, and mock fixtures confirm or simulate API outcomes — they do not replace database writes. Every end-to-end feature MUST have a documented API contract and store action that calls it; pages MUST NOT treat client-only state as the source of truth.

## Architecture Constraints

- Package manager: **pnpm** only.
- Page folderization: `src/app/pages/<name>/` with local `components/`.
- List data: Zustand `createListStore`; debounced search/pagination via `DEBOUNCE`.
- Auth: JWT bearer from `POST /auth/login`; profile from `GET /auth/me`; patient self-registration via `POST /patient/register`.
- Consent: `GET /compliance/consent/mine`; accept via `POST /compliance/consent/accept` (stored in `audit.user_purpose_consents`).
- API base URL: `VITE_API_BASE_URL` (default `http://localhost:4000/api/v1`).

## Quality Gates

1. Constitution Check in every plan MUST pass before implementation.
2. Role-based route guards MUST use mapped `AppRole` from API role codes.
3. No secrets in source control; use `.env.example` for documented variables.
4. Linter clean on touched files.
5. Performance budgets:
   - Route pages MUST be lazy-loaded; new heavy deps MUST be dynamically imported or justified in the plan.
   - List/table views MUST be paginated or virtualized.
   - Zustand consumers MUST use selectors (and `useShallow` for multi-field reads).
   - No avoidable re-renders: verify memoization of list rows and handlers on touched components.

## Governance

This constitution supersedes ad-hoc practices. Amendments require updating this file, bumping the version, and noting impact in the Sync Impact Report comment. Development standards in `.cursor/rules/livotale-development-standards.mdc` supplement but do not override these principles.

**Version**: 1.2.0 | **Ratified**: 2026-06-06 | **Last Amended**: 2026-06-20
