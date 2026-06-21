# Platform: State management (Zustand)

**Library**: [Zustand](https://github.com/pmndrs/zustand)  
**Location**: `src/store/`  
**Pattern**: Domain stores call services; pages subscribe via selectors; `clear()` on route unmount for detail stores.

---

## When to use a store vs local state

| Use **Zustand store** | Keep **local `useState`** |
|------------------------|---------------------------|
| List data shared across routes (admin list ↔ detail) | One-off form fields on a single screen with no reuse |
| Detail + edit draft for entity detail pages | UI-only state (tab open, modal visible) unless shared |
| Server-fetched catalog cached for public pages | `EntityDetailShell` tab query (`?tab=view`) — URL is source of truth |
| Loading / error / saving flags for async CRUD | `PackageChecklistEditor` item keys (owned by parent draft in store) |
| Cross-page cache (list → detail → enquire) | Ephemeral validation messages tied to one submit |

**Rule**: If data comes from `packageService` (or any service) and is shown on more than one route, or survives list → detail navigation, put it in a store.

---

## Store layout

```
src/store/
  createListStore.ts      # Server-paginated list factory (patients)
  createClientListStore.ts # Client-paginated list factory (ops tables, directories)
  packages/
    packagesAdminStore.ts
    packageDetailStore.ts
    publicPackagesStore.ts
    index.ts
  patients/
  reports/
  auth/
  ...
```

Barrel export: `src/store/index.ts`

---

## Packages stores (reference)

Feature spec: [01-packages-public-website.md](../features/01-packages-public-website.md)

### `usePackagesAdminStore`

**Scope**: Admin list page (`/admin/packages`)

| State | Purpose |
|-------|---------|
| `packages` | All packages from `listAdmin()` |
| `searchInput` | Client-side table filter |
| `isLoading`, `error` | Fetch status |

| Action | Purpose |
|--------|---------|
| `fetchPackages()` | Load / refresh list |
| `setSearchInput()` | Update search |
| `upsertPackage(pkg)` | After create/update — sync row without full refetch |
| `removePackage(id)` | After delete — remove row locally |

**Consumers**: `AdminPackagesPage`

---

### `usePackageDetailStore`

**Scope**: Admin detail page (`/admin/packages/:id`, `id=new`)

| State | Purpose |
|-------|---------|
| `pkg` | Saved entity (null on create until first save) |
| `draft` | Edit form state (`CreatePackageDraft`) |
| `isCreate` | Create vs edit mode |
| `isLoading`, `isSaving`, `error` | Async status |

| Action | Purpose |
|--------|---------|
| `initCreate()` | `emptyPackageDraft()` from current admin list |
| `loadById(id)` | Load package into `pkg` + `draft` |
| `patchDraft(patch)` | Form field updates |
| `save()` | `create` or `update` via service; syncs admin list + invalidates public cache |
| `remove()` | Delete via service; syncs admin list + invalidates public cache |
| `clear()` | **Call on route unmount** — reset detail state |

**Consumers**: `AdminPackageDetailPage`  
**Does not own**: Tab selection (`?tab=view|edit` in URL via `EntityDetailShell`)

---

### `usePublicPackagesStore`

**Scope**: Public marketing routes

| State | Purpose |
|-------|---------|
| `packages` | `listPublic()` cache |
| `selected` | Current package for detail page |
| `isLoadingList`, `isLoadingDetail`, `error` | Fetch status |

| Action | Purpose |
|--------|---------|
| `fetchPublicList()` | Load listing cards |
| `fetchByCode(code)` | Detail — uses list cache when possible, else `getByCode()` |
| `clearSelected()` | On detail unmount |
| `invalidate()` | Clear cache after admin save/delete |

**Consumers**: `PackagesPage`, `PackageDetailPage`, `EnquirePage`

---

## Cross-store sync

```
Admin save/delete (packageDetailStore)
    ├── packagesAdminStore.upsertPackage / removePackage
    └── publicPackagesStore.invalidate()
```

Other modules (enquiries, orders, dashboard) still call `packageService` directly for one-off lookups — acceptable until those screens need a shared cache.

---

## Page integration checklist

1. **List page**: `useEffect(() => fetch(), [fetch])` on mount  
2. **Detail page**: load by id in `useEffect`; `return () => clear()` on unmount  
3. **Selectors**: `useStore((s) => s.field)` — avoid subscribing to entire store  
4. **Navigation after save**: component calls `navigate()`; store returns saved entity  
5. **Mock mode**: stores call services; services mutate `MOCK_PACKAGES` — store cache stays in sync via upsert/invalidate

---

## List store factories (I03)

| Factory | Use when |
|---------|----------|
| `createListStore` | API returns `{ items, total, page, pageSize, totalPages }` (server pagination) |
| `createClientListStore` | API returns full array; UI slices with `paginateList` |

Both expose: `draftFilters` / `appliedFilters`, `searchInput` / `appliedSearch`, `page`, `pageSize`, `filtersExpanded`, `applyFilters`, `resetFilters`, `setFiltersExpanded`.

**Pagination in components**: use `useStorePaged(store, selectSlice, selectSetPage)` from `@/hooks/useStorePaged` — do **not** call store `getPaged()` during render without subscribing to `page`/`items` (Zustand will not re-render on page change).

Client store adds `getPaged()` for legacy use only; prefer `useStorePaged`.

Ops hub tables: `useOpsOrdersStore`, `useOpsAppointmentsStore`. Directory tables: `useAuditLogStore`, `useBankDirectoryStore`, `usePartnerLabsListStore`, etc.

---

## Patient registry stores

Feature spec: [02-enquiry-patient.md](../features/02-enquiry-patient.md)

| Store | Scope |
|-------|-------|
| `usePatientsStore` | List — pagination, search, filters (`createListStore`) |
| `usePatientDetailStore` | Detail — profile, history, appointments, visits, reports, `clinical` (orders/payments/tests/scans) |

Detail store calls `patientsService.getClinicalContext()` alongside profile endpoints. Tab selection stays in URL (`?tab=`), not in store.

---

## Enquiries CRM stores

Feature spec: [18-enquiries-crm.md](../features/18-enquiries-crm.md)

| Store | Scope |
|-------|-------|
| `useEnquiriesAdminStore` | List — search, status/source filters, client pagination, `upsertEnquiry` |
| `useEnquiryDetailStore` | Detail/create — load, follow-up draft, `createLead`, `saveFollowUp`, `convertToOrder` |

---

## Related docs

- [list-detail-pattern.md](./list-detail-pattern.md) — View/Edit tabs (URL state, not store)
- [mock-mode.md](./mock-mode.md) — in-memory mock mutations
- [01-packages-public-website.md](../features/01-packages-public-website.md) — package feature + store map
- [02-enquiry-patient.md](../features/02-enquiry-patient.md) — patient registry
- [18-enquiries-crm.md](../features/18-enquiries-crm.md) — enquiries CRM
- [ui-page-patterns.md](./ui-page-patterns.md) — list/detail layout shells
