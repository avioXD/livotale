<!--
Sync Impact Report
- Version: 1.0.0 (initial ratification)
- Modified principles: N/A (first fill from template)
- Added sections: Core Principles, Architecture, Quality Gates, Governance
- Templates: plan-template.md (Constitution Check gates aligned)
- Follow-up: specs/001-auth-api-integration
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

## Architecture Constraints

- Package manager: **pnpm** only.
- Page folderization: `src/app/pages/<name>/` with local `components/`.
- List data: Zustand `createListStore`; debounced search/pagination via `DEBOUNCE`.
- Auth: JWT bearer from `POST /auth/login`; profile from `GET /auth/me`; patient self-registration via `POST /patient/register`.
- API base URL: `VITE_API_BASE_URL` (default `http://localhost:4000`).

## Quality Gates

1. Constitution Check in every plan MUST pass before implementation.
2. Role-based route guards MUST use mapped `AppRole` from API role codes.
3. No secrets in source control; use `.env.example` for documented variables.
4. Linter clean on touched files.

## Governance

This constitution supersedes ad-hoc practices. Amendments require updating this file, bumping the version, and noting impact in the Sync Impact Report comment. Development standards in `.cursor/rules/livotale-development-standards.mdc` supplement but do not override these principles.

**Version**: 1.0.0 | **Ratified**: 2026-06-06 | **Last Amended**: 2026-06-06
