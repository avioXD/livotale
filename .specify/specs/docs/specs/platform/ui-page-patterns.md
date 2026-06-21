# Platform: UI page patterns

Standard layout for admin list and detail screens. Enforced via shared shells and [`.cursor/rules/ui-page-patterns.mdc`](../../.cursor/rules/ui-page-patterns.mdc).

---

## List page pattern

**Shell**: `ListPageShell` (`src/components/common/ListPageShell.tsx`)

```
┌─────────────────────────────────────────────────────────┐
│ Page title                          [Primary action]    │
│ Description line                                        │
├─────────────────────────────────────────────────────────┤
│ [Search……………………]              [Apply] [Reset]           │
│ Filter fields (status, source, …)                       │
├─────────────────────────────────────────────────────────┤
│ DataTable (click row → detail)                          │
├─────────────────────────────────────────────────────────┤
│ PaginationControls                                      │
└─────────────────────────────────────────────────────────┘
```

| Element | Position | Notes |
|---------|----------|-------|
| Title | Top left | `PageHeader` |
| Primary action | Top right | Add lead, Add package, Book appointment |
| Search + filters | `ListToolbar` | Apply copies draft → applied; resets page to 1; filters **collapsed by default** (Show/Hide toggle) |
| Table | Center | `onRowClick` navigates to detail |
| Pagination | Bottom | `PaginationControls` |

**Reference pages**: `AdminEnquiriesPage`, `AdminPackagesPage`, `PatientsPage`

### Collapsible filters (I03)

- Filter fields render only when `filtersExpanded` is true (default: **false**)
- `ListToolbar` shows **Show filters** / **Hide filters** when filter children are provided
- Badge shows `activeFilterCount` when collapsed and filters are applied
- Filter + pagination state lives in Zustand list stores (session persistence)

---

## Detail page pattern

**Shell**: `DetailPageShell` (read-only) or `EntityDetailShell` (View + Edit tabs)

```
┌─────────────────────────────────────────────────────────┐
│ [←]  Entity title                    [Header actions]   │
│      Subtitle / meta                                    │
├─────────────────────────────────────────────────────────┤
│ [View] [Edit]   ← top-level tabs (URL ?tab=)            │
├─────────────────────────────────────────────────────────┤
│ Tab content                                             │
└─────────────────────────────────────────────────────────┘
```

| Element | Rule |
|---------|------|
| Back control | **Icon arrow left** (`FiArrowLeft`), not text "Back" in header actions |
| Back position | Immediately left of title block |
| Title | Entity display name |
| Description | Code, phone, status meta |
| Actions | Delete, external preview — right side of header |
| Tabs | Below header row; sync `?tab=` in URL |

**Reference pages**: `EnquiryDetailPage`, `AdminPackageDetailPage`, `PatientDetailPage`

**Phase I**: all tabs must use URL sync via `useUrlTabState` — see [I01-url-routed-tabs.md](./I01-url-routed-tabs.md). Nested profile sub-tabs use `?profileSection=basic|employment|…`. Log-style fields use `LogTextarea` — see [I02-log-textarea-validation.md](./I02-log-textarea-validation.md).

---

## Form field priority

| Priority | Fields | UX |
|----------|--------|-----|
| Primary | Name, phone | Required, always visible |
| Secondary | Email, city, package, message | Optional, collapsible "Additional fields" |

---

## Routes convention

| Pattern | Example |
|---------|---------|
| List | `/admin/operations?tab=enquiries` |
| Create | `/admin/enquiries/new?tab=edit` |
| Detail | `/admin/enquiries/:id?tab=view` |
| Follow-up | `/admin/enquiries/:id?tab=followup` |
| Create order | `/admin/enquiries/:id?tab=create-order` |
| Edit details | `/admin/enquiries/:id?tab=edit-details` |

Use **one** `:id` route; `new` is the id value for create.

---

## Related

- [list-detail-pattern.md](./list-detail-pattern.md) — View/Edit tab behaviour
- [state-management.md](./state-management.md) — Zustand stores per module
