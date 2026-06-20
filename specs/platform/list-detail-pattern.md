# Platform pattern: List → Detail (View / Edit)

Reusable UX for admin entities that have many records and a rich single-record view.

**Reference implementation**: [01-packages-public-website.md](../features/01-packages-public-website.md) (packages module)

---

## When to use

- Catalog items (packages, partner labs, notification templates, …)
- Any admin module where users browse a list then drill into one record
- Records that need both read-only review and an edit form

---

## Routes

```
/admin/{entity}              → list (always table)
/admin/{entity}/:id          → detail OR create
/admin/{entity}/new?tab=edit → create (id param = "new")
/admin/{entity}/:id?tab=view → read-only detail tab
/admin/{entity}/:id?tab=edit → edit form tab
```

### Routing rules

1. **One param route** — register `/admin/{entity}/:id` only. The literal segment `new` is the `id` param value for create mode.
2. **Do not** add a separate `/admin/{entity}/new` route without `:id`. React Router will match it but `useParams().id` will be `undefined`, breaking create flows (page redirects to list).
3. List route `/admin/{entity}` must be registered **before** the `:id` route.
4. Tab state is optional query: `?tab=view` | `?tab=edit` (synced in `EntityDetailShell`).

---

## Components

| Component | Path | Role |
|-----------|------|------|
| `DataTable` | `src/components/common/DataTable.tsx` | Clickable list rows |
| `PageHeader` | `src/components/common/PageHeader.tsx` | List title + primary action (e.g. Add) |
| `EntityDetailShell` | `src/components/common/EntityDetailShell.tsx` | Back link, header, View/Edit tabs |

---

## EntityDetailShell API

```tsx
<EntityDetailShell
  backTo="/admin/packages"
  backLabel="Back to packages"
  title="PKG-2 — Scan + Pathology"
  description="Subtitle or summary"
  createMode={false}           // true → only Create/Edit tab (no View)
  defaultTab="view"
  actions={<DeleteButton />}   // optional header actions
  viewContent={<ReadOnlyView />}
  editContent={<EditForm />}
/>
```

| Prop | Purpose |
|------|---------|
| `backTo` | List route for back arrow |
| `createMode` | When `true`, hides View tab; forces Edit/Create |
| `viewContent` | Read-only panel (detail preview) |
| `editContent` | Form panel with save/cancel |
| `actions` | Header buttons (delete, external preview, …) |

Tab changes update URL: `setSearchParams({ tab })` with `replace: true`. Prefer `useUrlTabState` (Phase I).

---

## List page checklist

- [ ] `PageHeader` with **Add** action → `navigate('/admin/{entity}/new?tab=edit')`
- [ ] `DataTable` with `onRowClick` → `navigate('/admin/{entity}/:id?tab=view')`
- [ ] Optional search / filters above table
- [ ] No inline edit on list page — all editing on detail Edit tab

---

## Detail page checklist

- [ ] Load record by `id` from `useParams()`; treat `id === 'new'` as create
- [ ] `createMode={id === 'new'}` on `EntityDetailShell`
- [ ] View tab: shared read-only component (same as public where applicable)
- [ ] Edit tab: form component; save → API create/update → redirect to `?tab=view`
- [ ] Cancel on create → back to list; cancel on edit → View tab
- [ ] Delete in header actions (with confirm + referential integrity check)

---

## Packages reference files

| Role | File |
|------|------|
| List | `src/app/pages/admin/packages/AdminPackagesPage.tsx` |
| Detail | `src/app/pages/admin/packages/AdminPackageDetailPage.tsx` |
| Form | `src/app/pages/admin/packages/PackageFormPanel.tsx` |
| View | `src/components/packages/PackageDetailView.tsx` |

---

## Future modules

Apply the same pattern to:

- Partner labs (`/admin/lab-partners`)
- Notification templates
- Other catalog CRUD screens

Copy the packages route + page structure; swap entity-specific view and form components.
