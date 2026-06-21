# I03 — Table Filters, Pagination & API Alignment

**Status**: Active  
**Created**: 2026-06-20  
**Scope**: All list-style tables in livotale-ui + matching API filter contracts

---

## Goals

1. Collapsible filter panels (hidden by default) on every list table using `ListToolbar`
2. Filter + pagination state in Zustand stores (session persistence)
3. Correct next/prev page behaviour after filter apply and page-size change
4. API filter contracts aligned with UI filter values
5. Raw HTML list tables migrated to `DataTable` + `ListToolbar` + `PaginationControls`

---

## Shared primitives

### `ListToolbar` (extended)

| Prop | Type | Default | Behaviour |
|------|------|---------|-----------|
| `filtersExpanded` | `boolean` | `false` | When false, filter grid hidden |
| `onFiltersExpandedChange` | `(v: boolean) => void` | — | Toggle show/hide |
| `activeFilterCount` | `number` | `0` | Badge on collapsed toggle |
| `children` | ReactNode | — | Filter fields; toggle only shown when children present |

Search bar and Apply/Reset always visible.

### `createClientListStore`

Client-side pagination factory at `src/store/createClientListStore.ts`.

| State | Purpose |
|-------|---------|
| `items` | Full fetched/filtered list |
| `draftFilters` / `appliedFilters` | Draft vs applied filter values |
| `searchInput` / `appliedSearch` | Search draft vs applied |
| `page` / `pageSize` | Client pagination |
| `filtersExpanded` | UI toggle state |
| `isLoading` / `error` | Async status |

| Action | Behaviour |
|--------|-----------|
| `fetchItems()` | Calls `fetchFn({ search, filters })` |
| `applyFilters()` | Copies draft → applied, resets page to 1, refetches |
| `resetFilters()` | Clears all filters/search, resets page to 1 |
| `setPage(n)` | Sets page (no refetch — client slice) |
| `setPageSize(n)` | Sets pageSize, resets page to 1 |
| `getPaged()` | `paginateList` + syncs clamped page back to store |
| `setFiltersExpanded(v)` | Toggle filter panel |

### `createListStore` (server pagination)

Same `filtersExpanded` + `setFiltersExpanded` added for patients list.

---

## Table inventory

### Group A — Paginated DataTable

| ID | Page | Store |
|----|------|-------|
| A1 | PatientsPage | `usePatientsStore` (createListStore) |
| A2 | AdminEnquiriesPage | `useEnquiriesAdminStore` |
| A3 | AdminOperationsOrdersTab | `useOpsOrdersStore` |
| A4 | AdminOperationsAppointmentsTab | `useOpsAppointmentsStore` |
| A5 | AdminOperationsPartnerLabTab | `useLabReportsStore` |
| A6 | TechnicianOrdersPage | `useTechnicianOrdersStore` |
| A7 | TechnicianSchedulePage | `useTechnicianScheduleStore` |
| A8 | DoctorConsultationsPage | `useDoctorConsultationsStore` |
| A9 | DoctorAppointmentsListPanel | `useDoctorAppointmentsStore` |
| A10 | StaffRoleWorkspace | `useStaffDirectoryStore` |

### Group B — DataTable upgrade

| ID | Page | Store |
|----|------|-------|
| B1 | AdminPackagesPage | `usePackagesAdminStore` (extended) |
| B2 | AdminPartnerLabsPage | `usePartnerLabsListStore` |
| B3 | AdminServiceZonesPage | `useServiceZonesStore` (extended) |

### Group C — Raw HTML → DataTable

| ID | Page | Store |
|----|------|-------|
| C1 | AdminAuditLogPage | `useAuditLogStore` |
| C2 | AdminBankDetailsDirectoryPage | `useBankDirectoryStore` |
| C3 | AdminLiverCareNotificationsPage | `useNotificationLogStore` |
| C4 | AdminAppointmentsDashboardPage | `useAdminAppointmentsStore` (extended) |
| C5 | NotificationLogPage | `useAdminAppointmentsStore` |
| C6 | AdminTwilioConfigPage SmsLogTable | `useSmsTestLogsStore` |

---

## API contract fixes

### GET /patients

| Param | Fix |
|-------|-----|
| `status` | Map `active`/`inactive`/`pending` to journey_status groups |
| `search` | Include phone/mobile in search clause |

### GET /admin/orders

| Param | Fix |
|-------|-----|
| `createdByRole` | New param: `operations` \| `admin` — filter by creator role |
| `search` | Include patient name and phone |

### GET /admin/consultations/queue

| Param | Fix |
|-------|-----|
| `stage` | All 6 stages: awaiting_doctor, doctor_assigned, scheduled, prescription_pending, prescription_ready, completed |

---

## Acceptance scenarios

### US-1 Filter panel toggle (P1)

1. **Given** any list page with filters, **When** page loads, **Then** filter fields are hidden and "Show filters" button is visible
2. **Given** collapsed filters, **When** user clicks "Show filters", **Then** filter grid expands
3. **Given** applied filters while collapsed, **When** user views toggle, **Then** active filter count badge is shown

### US-2 Pagination after filter (P1)

1. **Given** user on page 2+, **When** Apply Filters clicked, **Then** page resets to 1 and table shows filtered subset
2. **Given** filtered results fit one page, **When** user was on page 5, **Then** pagination shows page 1/N (clamped)

### US-3 API filter alignment (P1)

1. **Given** patient status "Active", **When** Apply, **Then** API returns patients with active journey statuses
2. **Given** orders "Created by Operations", **When** Apply, **Then** no 422; filtered results returned
3. **Given** consultation stage "Prescription pending", **When** Apply, **Then** only matching rows returned

### US-4 Store persistence (P2)

1. **Given** user applies filters, **When** navigating away and back (same session), **Then** filters remain in store state

---

## E2E coverage

| Spec | Tables |
|------|--------|
| `e2e/admin-operations-hub.spec.ts` | Ops hub tabs |
| `e2e/patients-list.spec.ts` | Patients |
| `e2e/admin-directories.spec.ts` | Audit, bank, packages, labs, zones |
| `e2e/role-tables.spec.ts` | Technician, doctor tables |

---

## Out of scope

- Server-side pagination for orders/enquiries/lab queue
- localStorage / URL-persisted filters
- Column sorting and export
