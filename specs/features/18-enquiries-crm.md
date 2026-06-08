# Spec: Enquiries CRM

**Module**: Lead queue, manual CRM, website auto-ingest, order conversion  
**Roles**: Operations, City Manager, Super Admin  
**UI patterns**: [ui-page-patterns.md](../platform/ui-page-patterns.md) · [list-detail-pattern.md](../platform/list-detail-pattern.md)  
**State**: `useEnquiriesAdminStore`, `useEnquiryDetailStore`

---

## Lead sources

| Source | How it enters the queue |
|--------|-------------------------|
| `website` | Auto — public `/enquire` → `enquiryService.createPublic()` |
| `whatsapp` | Manual — ops **Add lead** (CRM for WhatsApp chats) |
| `manual` | Manual — phone / walk-in capture |

**Primary fields**: `patientName`, `phone` (required)  
**Secondary**: email, city, package, message (optional)

---

## Lead threads (repeat enquiries)

Returning leads (re-enquiry, new order request) must not lose history. Enquiries are grouped by **phone** into a **thread**:

| Field | Purpose |
|-------|---------|
| `threadId` | Stable group id (`thread-{normalizedPhone}`) |
| `threadSequence` | 1, 2, 3… — each return visit is a **new enquiry thread** |

### Behaviour

| Event | System action |
|-------|----------------|
| First contact (website / WhatsApp / manual) | `threadSequence = 1`, new `threadId` from phone |
| Lead converts + returns later | Auto **new thread** (`threadSequence + 1`) on next enquiry with same phone |
| Ops **New enquiry thread** button | Manual new thread from converted/closed enquiry |
| List page | Shows **latest thread only** per lead; badge `N enquiries` when history exists |
| Detail page | **Lead thread** panel — all threads under one roof, switch to view older ones |

Inherited `patientId` from prior converted threads is copied to new threads so repeat orders skip patient creation.

**Demo data**: Anita Desai (`9988776655`) — Thread #1 converted (`enq-3`), Thread #2 active (`enq-4`).

---

## Navigation & routes

| Screen | Route |
|--------|-------|
| Enquiry list | `/admin/operations?tab=enquiries` (ops hub tab) |
| Add lead | `/admin/enquiries/new?tab=edit` |
| Enquiry detail (view) | `/admin/enquiries/:id?tab=view` |
| CRM follow-up | `/admin/enquiries/:id?tab=followup` |
| Create order | `/admin/enquiries/:id?tab=create-order` |
| Edit details | `/admin/enquiries/:id?tab=edit-details` |

Legacy `/admin/enquiries` (list only) redirects to `/admin/operations?tab=enquiries`.

List table **Create order** button opens `/admin/enquiries/:id?tab=create-order` directly.

Sidebar: **Enquiries** under **Day-to-day ops** only.

---

## List page (`AdminEnquiriesPage`)

Rendered inside operations hub (`AdminOperationsEnquiriesTab`, `embedded` mode).

Uses `ListToolbar` + `DataTable` + `PaginationControls`.

| Control | Behaviour |
|---------|-----------|
| **Add lead** | Top-right → `/admin/enquiries/new?tab=edit` |
| Search | Name, phone, enquiry # |
| Filters | Status, source |
| Row click | `/admin/enquiries/:id?tab=view` |
| **Create order** (row action) | `/admin/enquiries/:id?tab=create-order` — always shown, including converted leads |
| **Open order** (row action) | Shown when converted; links to latest `orderId` |

---

## Detail page (`EnquiryDetailPage`)

Flat top-level tabs (no nesting). Custom layout in `EnquiryDetailPage`.

### Lead thread panel (compact, all tabs)
- Single inline row: pill per thread (`#sequence`, short status icon)
- Status icons: `●` open, `✓` converted/confirmed, `✕` cancelled, `!` payment failed, `⚠` defaulter, `—` closed
- **latest** badge on newest thread when viewing an older one
- **+ New thread** when current thread is converted/closed and no newer open thread exists

### Tab visibility (thread-aware)

| Thread state | Tabs shown |
|--------------|------------|
| **Active** (`new` … `follow_up_required`) | View, Follow-up, Create order, Edit details |
| **Converted — latest thread** | View, **Order outcome** |
| **Converted/closed — older thread** | **View only** (archived; CRM tabs hidden) |

Deep links to hidden tabs (`?tab=followup`, `create-order`, `edit-details`, `order-outcome`) redirect to View when not allowed.

### View tab (`?tab=view`)
- Lead info card (name, phone, source badge, thread #)
- Package interest, message, received time
- CRM notes if present
- Link to order if converted

### Follow-up tab (`?tab=followup`)
- **Active threads only** (not archived converted, not converted-latest)
- **Append-only log** — each save adds a `followUpLogs` entry (not overwrite)
- New entry: status, call remarks, internal notes, optional next follow-up date
- **Follow-up history** list below the form (newest first)
- `enquiry.status` and `followUpAt` update from the latest log entry
- **Add follow-up log** — stays on Follow-up tab so the new entry is visible

### Order outcome tab (`?tab=order-outcome`)
- **Converted latest thread only** — after order is created
- Outcome: confirmed / cancelled / payment failed / defaulter
- Remarks (why cancelled, gateway error, defaulter follow-up, etc.)
- **Save outcome** → returns to View tab
- Cancelled, payment failed, or defaulter sets enquiry `status` to `closed`
- Default outcome on convert: `confirmed`

### Create order tab (`?tab=create-order`)
- Package selector
- Optional **call remarks** and **internal notes** — if filled, appended to `followUpLogs` on order create (status `converted`, includes order number)
- **Create order** (only conversion path — no separate book-appointment CTA) → `liverCareOrderService.create` → navigate `/admin/orders/:id`
- Available for **all** enquiries, including already-converted leads (repeat orders)
- Converted enquiries: badge + **Open previous order** link; **Create order** still enabled
- Same screen opened from list table **Create order** button

#### Patient linking on order create

| Enquiry state | Patient behaviour |
|---------------|-------------------|
| **Not yet converted** (`patientId` is null) | New patient id derived from lead phone (`patient-{digits}`) and stored on enquiry after first order |
| **Already converted** (`patientId` set) | **Patient creation skipped** — reuse `enquiry.patientId`; `CreateOrderInput.skipPatientCreation: true` |

Repeat orders from the same enquiry create additional `LiverCareOrder` rows but do not create a duplicate patient. Enquiry `orderId` updates to the latest order created.

### Edit details tab (`?tab=edit-details`)
- Name*, phone*, email, city, preferred package, message
- Source shown read-only
- **Save details** → returns to View tab

### Add lead (create mode)
- Single tab: **Create** (`?tab=edit`)
- Source: WhatsApp | Manual
- Name*, phone* required
- Collapsible additional fields
- Save → list store upsert → detail View tab

---

## End-to-end dummy flow

```
Website /enquire ──auto──► MOCK_ENQUIRIES (source=website)
Ops Add lead ──manual──► MOCK_ENQUIRIES (source=whatsapp|manual)
        │
        ▼
/admin/operations?tab=enquiries (list)
        │
        ▼
Detail → View | Follow-up | Create order | Edit details (top tabs)
        │
        └── Create order → /admin/orders/:id
              ├── first time: new patientId from phone
              └── converted: reuse patientId (skip patient creation)
        │
        ▼
MOCK_LIVER_ORDERS + enquiry.status=converted + patientId + orderId
```

Public form: `EnquirePage` → `createPublic` (unchanged).

---

## Service layer

`EnquiryService`:
- `list` — latest thread per lead + `threadCount`
- `getById`, `getThread(threadId)`, `create`, `createPublic`, `createNewThread`, `update`

`saveFollowUp` → `enquiryService.addFollowUp` appends to `followUpLogs` and updates `status` / `followUpAt`  
`saveDetails` updates: `patientName`, `phone`, `email`, `city`, `message`, `preferredPackageId`

`OrderService.create` with `enquiryId`:
- First order: sets `enquiry.status = converted`, links `patientId` and `orderId`
- Repeat order (`skipPatientCreation: true`): keeps existing `patientId`, updates `orderId` to latest

`convertToOrder` in `enquiryDetailStore` sets `skipPatientCreation` when `enquiry.patientId` is already present.

---

## Implementation map

| Layer | Files |
|-------|-------|
| Stores | `src/store/enquiries/enquiriesAdminStore.ts`, `enquiryDetailStore.ts` |
| List | `AdminEnquiriesPage.tsx`, `AdminOperationsEnquiriesTab.tsx` |
| Detail | `EnquiryDetailPage.tsx` |
| Panels | `EnquiryThreadPanel`, `EnquiryViewPanel`, `EnquiryFollowUpNotesPanel`, `EnquiryCreateOrderPanel`, `EnquiryEditDetailsPanel`, `EnquiryLeadFormPanel` |
| Utils | `src/utils/enquiryThread.ts` |
| Public | `EnquirePage.tsx` |
| Shells | `ListPageShell`, flat tabs in `EnquiryDetailPage` |
| Routes | `LIVER_CARE_ROUTE_ROLES.adminOperations` |

---

## Status workflow

`new` → `contacted` → `interested` | `follow_up_required` | `not_interested` → **`converted`** (on order create) | `closed`
