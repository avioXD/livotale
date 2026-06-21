# Phase I — URL-Routed Tabs & Log Field UX

**Created**: 2026-06-20  
**Status**: Spec approved for planning (awaiting implementation sign-off)  
**Depends on**: Phase H recovery baseline (API + E2E smoke passing)

---

## Goals

1. **Every primary tab UI is addressable by URL** — users can bookmark, share, and deep-link to a tab; browser back/forward works.
2. **Log-style text fields use `Textarea` with validation** — remarks, notes, call logs, and audit context fields are multi-line with length limits and inline errors.

---

## Problem statement

The platform already documents URL-synced tabs in [ui-page-patterns.md](./ui-page-patterns.md), but **~40% of tab surfaces still use React state or read-only URL** (initial tab from query, no updates on click). Log fields are inconsistent: some use `Textarea`, others use single-line `Input` for content that routinely spans multiple lines.

---

## Spec index

| File | Scope |
|------|--------|
| [I01-url-routed-tabs.md](./I01-url-routed-tabs.md) | Tab inventory, URL conventions, shared hook, migration waves |
| [I02-log-textarea-validation.md](./I02-log-textarea-validation.md) | Field inventory, validation rules, shared components |
| [../plans/I01-implementation-plan.md](../plans/I01-implementation-plan.md) | Bite-sized tasks, tests, rollout order |

---

## Approach decision

### Tabs — **Recommended: Query-param sync (Option A)**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A — `?tab=` / `?section=` hook** | Extend existing pattern; shared `useUrlTabState` | Matches 12+ pages already; low route churn | Long URLs on nested pages |
| B — Path segments | `/settings/security` instead of `?tab=security` | Clean URLs | Breaks existing links, nav, redirects |
| C — Hybrid | Path for hubs, query for detail tabs | Best UX per layer | Two mental models for devs |

**Pick A** — align with `EnquiryDetailPage`, `SettingsPage`, `AdminOperationsHubPage`, and `specs/platform/list-detail-pattern.md`.

### Log fields — **Recommended: Shared validator + `LogTextarea` (Option B-lite)**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A — Swap Input→Textarea only | Minimal change | Fast | No consistent validation |
| **B — `LogTextarea` + `fieldLimits.ts`** | Wrapper with maxLength, counter, aria | One place to enforce limits | Small new abstraction |
| C — Form library (react-hook-form + zod) | Full schema validation | Strongest | Large refactor scope |

**Pick B** for Phase I; defer full zod forms to a later phase.

---

## Phase map

| Wave | Name | Est. | Outcome |
|------|------|------|---------|
| **I0** | Shared primitives | 1 day | `useUrlTabState`, `LogTextarea`, `fieldLimits.ts` |
| **I1** | P0 tab fixes | 2 days | Staff member detail, settings profile sub-tabs, partner lab detail |
| **I2** | P1 tab fixes | 2 days | Onboarding, profile views, patient login mode |
| **I3** | Log field pass | 2–3 days | All P0/P1 fields → Textarea + validation |
| **I4** | Tests & docs | 1 day | E2E deep links, update platform specs |

---

## Success criteria

- [ ] No `Tabs` with `defaultValue` only (without URL write on change) in admin/clinical flows
- [ ] Copy-paste URL with `?tab=` opens the same tab after refresh
- [ ] All fields in [I02](./I02-log-textarea-validation.md) inventory use `Textarea` (or `LogTextarea`)
- [ ] Submit blocked or inline error when text exceeds documented max length
- [ ] Playwright: at least 3 deep-link tab scenarios (settings, enquiry follow-up, staff member profile)
- [ ] `grep` CI check: no `defaultValue=` on `Tabs` in `src/app/pages/admin` (allowlist patient login until I2)

---

## Out of scope (Phase I)

- Nested route refactor (`/settings/security` paths)
- Full zod/react-hook-form migration
- Appointment wizard tabs (legacy redirects — Option A retirement)
- Server-side max_length on all API schemas (optional follow-up in API repo)

---

## Related

- [ui-page-patterns.md](./ui-page-patterns.md)
- [list-detail-pattern.md](./list-detail-pattern.md)
- [../recovery/04-E2E-TEST-MATRIX.md](../recovery/04-E2E-TEST-MATRIX.md)
