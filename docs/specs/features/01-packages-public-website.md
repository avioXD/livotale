# Spec: Packages & Public Website

**Module**: Package catalog, marketing pages, admin package builder  
**Roles**: Public (read); Admin (full CRUD)  
**Platform pattern**: [List → Detail (View / Edit)](../platform/list-detail-pattern.md)  
**Status**: UI complete (mock mode)

---

## Overview

Packages are the product catalog for Liver Fibrosis Scan services. The public experience follows a **health-check marketplace pattern** (Apollo 24|7, Healthians, etc.):

1. **Listing** — comparison cards with price, highlights, and top inclusions  
2. **Detail** — structured page with grouped checklists, preparation, FAQs, and enquire CTA  
3. **Enquire** — lead form with package pre-selected

Admins manage packages via a **list → detail** flow: a searchable table, row click for View/Edit tabs, and **Add package** for unlimited new packages with **dynamic checklist sections** (no code changes required).

---

## Default seed packages

| Code | Name | Price | Scan | Pathology | Consult |
|------|------|-------|------|-----------|---------|
| `PKG-1` | Liver Fibrosis Scan | ₹5,500 | ✓ | ✗ | ✗ |
| `PKG-2` | Liver Fibrosis Scan + Pathological Test | ₹8,000 (₹7,500 offer) | ✓ | ✓ | ✗ |
| `PKG-3` | Liver Fibrosis Scan + Pathological Test + Doctor Consultation | ₹9,500 | ✓ | ✓ | ✓ |

Seed data: `src/services/liverCare/package.mock.seed.ts` → `MOCK_PACKAGES` in `liverCare.mock.ts`.

---

## Data model (`LiverCarePackage`)

Types: `src/types/package.ts`

### Core fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID / `pkg-{ts}` in mock |
| `code` | string | Unique, auto `PKG-N` on create (`nextPackageCode`) |
| `name` | string | Display title |
| `subtitle` | string? | One-line card subtitle |
| `tagline` | string? | Hero marketing line on detail |
| `description` | string | Short paragraph |
| `price` | number | INR |
| `discountPrice` | number? | Strikethrough MRP when set |
| `sortOrder` | number | Listing order |
| `active` | boolean | Soft off — hidden from ops selection |
| `visibilityWeb` | boolean | Shown on `/packages` |
| `recommendedTag` | boolean | Badge on listing card |
| `termsConditions` | string? | Footer on detail page |

### Workflow flags (drive order pipeline)

| Field | Effect |
|-------|--------|
| `fibrosisScanIncluded` | Technician scan steps on order |
| `pathologyIncluded` | Partner lab + AI extraction + merged report |
| `consultationIncluded` | Doctor video consult + prescription |

These flags are **independent** of checklist copy. Admin can click **“Reset checklist from flags”** to regenerate default sections from booleans.

### Structured content (Apollo-style detail)

| Field | Type | Purpose |
|-------|------|---------|
| `checklistSections[]` | `{ id, title, items[] }` | Grouped ✓/✗ lists |
| `checklistSections[].items[]` | `{ id, label, included, detail? }` | Dynamic rows — admin add/remove/reorder |
| `highlights[]` | `{ label, value }` | Quick facts (TAT, fasting, sample) |
| `preparation[]` | string[] | Patient prep bullets |
| `whoShouldBook[]` | string[] | Audience guidance |
| `faqs[]` | `{ question, answer }` | FAQ cards on detail page |
| `includes.bullets[]` | string[] | **Derived** on save from included checklist items (cards / legacy) |

---

## Public screens

| Screen | Route | Component |
|--------|-------|-----------|
| Package listing | `/packages` | `PackagesPage` |
| Package detail | `/packages/:code` | `PackageDetailPage` |
| Enquiry form | `/enquire?package=PKG-2` | `EnquirePage` |
| Thank you | `/enquire/thanks` | `EnquireThanksPage` |

### Listing card contents

- Name, subtitle (or description), price / discount
- Up to 3 highlight badges
- Top 5 included bullets
- **View details** → `/packages/:code`
- **Enquire now** → `/enquire?package=:code`

### Detail page layout

```
┌─────────────────────────────────────────────────────────┐
│ Code badge · Recommended · Name · Subtitle · Tagline    │
│ Description · Price (strike if discount) · [Enquire]    │
├─────────────────────────────────────────────────────────┤
│ Highlights grid (TAT, sample, visit type, …)            │
├──────────────────────────┬──────────────────────────────┤
│ What's included          │ Preparation                  │
│  Section: Scan           │ Who should book              │
│    ✓ Item                │                              │
│    ✗ Item (excluded)     │                              │
│  Section: Pathology      │                              │
├──────────────────────────┴──────────────────────────────┤
│ FAQs (question / answer cards)                          │
│ Terms & conditions                                      │
└─────────────────────────────────────────────────────────┘
```

Shared renderer: `PackageDetailView` (used on public detail and admin View tab).

---

## Admin screens (list → detail pattern)

Uses `EntityDetailShell` — see [list-detail-pattern.md](../platform/list-detail-pattern.md).

### Routes

| Screen | Route | Notes |
|--------|-------|-------|
| Package list | `/admin/packages` | Searchable table only |
| Add package | `/admin/packages/new?tab=edit` | `id` param = `"new"` — **Create** tab only |
| Package detail | `/admin/packages/:id?tab=view` | View + Edit tabs |
| Edit tab | `/admin/packages/:id?tab=edit` | URL-synced tab |

> **Routing rule**: Use a **single** param route `/admin/packages/:id` for both `new` and existing IDs. Do **not** register a separate `/admin/packages/new` route without `:id` — `useParams().id` would be `undefined` and the page redirects back to the list.

### List page (`AdminPackagesPage`)

| Element | Behaviour |
|---------|-----------|
| `DataTable` | Always visible; columns: code, name, price, workflow flags, status badges |
| Search | Filter by code, name, subtitle |
| **Add package** | Navigates to `/admin/packages/new?tab=edit` |
| Row click | Navigates to `/admin/packages/:id?tab=view` |

### Detail page (`AdminPackageDetailPage`)

| Element | Behaviour |
|---------|-----------|
| Back arrow | Returns to `/admin/packages` |
| **View** tab | `PackageDetailView` (no enquire CTA); status badges |
| **Edit** tab | `PackageFormPanel` — full field editor |
| Header actions | Public preview (new tab), Delete |
| Create flow | Save → `POST` → redirect to `/admin/packages/:newId?tab=view` |
| Update flow | Save → `PATCH` → redirect to View tab |
| Delete | `packageService.remove(id)` — fails if orders reference package |

### Edit form sections (`PackageFormPanel`)

1. Basics — name, subtitle, tagline, description, price, discount, sort order  
2. Workflow flags — scan / pathology / consult + reset checklist  
3. Checklist sections — `PackageChecklistEditor` (dynamic sections & items)  
4. Highlights — label/value pairs  
5. Preparation & who should book — one line per row in textarea  
6. FAQs — question/answer pairs  
7. Publishing — active, web visibility, recommended, T&C  

### Admin checklist editor (`PackageChecklistEditor`)

- Add / remove / reorder **sections** (↑↓)
- Per section: title + dynamic **items**
- Per item: label, included checkbox, optional detail text
- Changes sync `includes.bullets` via `bulletsFromSections()`

---

## User flows (acceptance)

### Admin — add package

1. Login as `administration` / `Admin@123`
2. Sidebar → **Packages** → `/admin/packages`
3. Click **Add package**
4. URL is `/admin/packages/new?tab=edit`; only **Create** tab shown
5. Fill name, flags, checklist; click **Create package**
6. Redirected to `/admin/packages/:id?tab=view` with new `PKG-N` code

### Admin — view / edit existing

1. From list, click a row → View tab
2. Switch to **Edit** tab → change price or checklist → **Save changes**
3. Returns to View tab with updated content

### Admin — delete

1. On detail page, **Delete** in header
2. Confirm dialog
3. If orders reference package → error; else removed and return to list

### Public

1. Visit `/packages` → cards for active + `visibilityWeb` packages
2. **View details** → `/packages/PKG-2`
3. **Book / Enquire** → `/enquire?package=PKG-2`

---

## Service layer

`src/services/liverCare/PackageService.ts` — `BaseApiService` + `mockOrApi`

| Method | Mock behaviour |
|--------|----------------|
| `listPublic()` | Active + `visibilityWeb`, sorted by `sortOrder` |
| `getByCode(code)` | Public single package |
| `listAdmin()` | All packages |
| `getById(id)` | Single by id |
| `create(input)` | Push to `MOCK_PACKAGES`; unique code check |
| `update(id, input)` | Merge; sync `includes.bullets` from sections |
| `remove(id)` | Splice mock array; blocked if `MOCK_LIVER_ORDERS` references id/code |

Utils: `src/services/liverCare/package.utils.ts` — `nextPackageCode`, `emptyPackageDraft`, `defaultChecklistSections`, `defaultHighlights`, `bulletsFromSections`.

---

## API contract (backend target)

| Method | Path | Access |
|--------|------|--------|
| `GET` | `/public/packages` | Active + visible only |
| `GET` | `/public/packages/:code` | Single public package |
| `GET` | `/admin/packages` | All packages |
| `GET` | `/admin/packages/:id` | Single (admin) |
| `POST` | `/admin/packages` | Create |
| `PATCH` | `/admin/packages/:id` | Update |
| `DELETE` | `/admin/packages/:id` | Remove (409 if orders exist) |

---

## State management (Zustand)

Full platform guide: [state-management.md](../platform/state-management.md)

| Store | Route(s) | Responsibility |
|-------|----------|----------------|
| `usePackagesAdminStore` | `/admin/packages` | Admin list, search, sync after CRUD |
| `usePackageDetailStore` | `/admin/packages/:id` | Load/create draft, save, delete; `clear()` on unmount |
| `usePublicPackagesStore` | `/packages`, `/packages/:code`, `/enquire` | Public list cache, detail by code, invalidate on admin edit |

**Local state only** (not in store): URL tab (`?tab=view|edit`), form panel layout, checklist row UI.

**Cross-store**: `packageDetailStore.save/remove` → `packagesAdminStore` upsert/remove + `publicPackagesStore.invalidate()`.

---

## Implementation map

| Layer | Files |
|-------|-------|
| Types | `src/types/package.ts` |
| Utils / seed | `src/services/liverCare/package.utils.ts`, `package.mock.seed.ts` |
| Service | `src/services/liverCare/PackageService.ts` |
| Stores | `src/store/packages/packagesAdminStore.ts`, `packageDetailStore.ts`, `publicPackagesStore.ts` |
| Shared view | `src/components/packages/PackageDetailView.tsx` |
| Checklist editor | `src/components/packages/PackageChecklistEditor.tsx` |
| Detail shell | `src/components/common/EntityDetailShell.tsx` |
| Public UI | `src/app/pages/public/PackagesPage.tsx`, `PackageDetailPage.tsx`, `EnquirePage.tsx` |
| Admin list | `src/app/pages/admin/packages/AdminPackagesPage.tsx` |
| Admin detail | `src/app/pages/admin/packages/AdminPackageDetailPage.tsx` |
| Admin form | `src/app/pages/admin/packages/PackageFormPanel.tsx` |
| Routes | `src/app/routes/AppRoutes.tsx` |
| Nav | `src/app/config/navigation.ts` — `/admin/packages` (admin only) |

### Route registration (`AppRoutes.tsx`)

```tsx
<Route path="/admin/packages" element={<AdminPackagesPage />} />
<Route path="/admin/packages/:id" element={<AdminPackageDetailPage />} />
// :id = "new" for create, or pkg id for view/edit
```

Public:

```tsx
<Route path="/packages" element={<PackagesPage />} />
<Route path="/packages/:code" element={<PackageDetailPage />} />
```

---

## UI note

Public pages use `PublicLayout` inside `livotale-ui` (v1). No separate marketing site entry required.
