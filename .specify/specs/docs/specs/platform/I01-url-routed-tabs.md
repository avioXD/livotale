# I01 — URL-Routed Tabs Specification

**Query param convention**: `?tab=<value>` for page-level tabs; `?section=<value>` for staff hub (already established).

---

## Shared primitive: `useUrlTabState`

**Location**: `src/hooks/useUrlTabState.ts`

```typescript
type UseUrlTabStateOptions<T extends string> = {
  param?: 'tab' | 'section';       // default 'tab'
  defaultValue: T;
  validValues: readonly T[];
  omitDefault?: boolean;           // delete param when === defaultValue (ops hub pattern)
};
```

**Behaviour**

| Rule | Detail |
|------|--------|
| Read | Parse `searchParams.get(param)`; if invalid/missing → `defaultValue` |
| Write | `setSearchParams` with `replace: true`; preserve unrelated query keys |
| Omit default | When `omitDefault: true` and tab === default, remove param (see operations hub) |
| Type safety | Generic `T` constrained to union; invalid URL values fall back silently |

**Reference implementations to consolidate**

- `AdminOperationsHubPage.setTab` (lines 33–50)
- `SettingsPage.handleTabChange`
- `PatientDetailPage.setTab`
- `EnquiryDetailPage` + `parseTab` guard logic
- `AdminStaffHubPage.setSection`

---

## Tab inventory (scan 2026-06-20)

### ✅ Already URL-synced (no change except optional hook refactor)

| Page | Param | Valid values | Notes |
|------|-------|--------------|-------|
| `AdminOperationsHubPage` | `tab` | overview, enquiries, appointments, partner-lab, orders, ai-review | `samples` alias → partner-lab |
| `SettingsPage` | `tab` | my-profile, availability, leave, emergency, consent, security | Role-gated tabs hidden, not removed from URL |
| `EnquiryDetailPage` | `tab` | view, edit, followup, create-order, edit-details, order-outcome | Guards redirect illegal tabs |
| `PatientDetailPage` | `tab` | profile, orders, payments | |
| `DoctorConsultationDetailPage` | `tab` | patient, prescription | |
| `EntityDetailShell` | `tab` | view, edit (+ custom `editTabKey`) | Packages, etc. |
| `TechnicianSchedulePage` | `tab` | clinical, samples, route | Default clinical omits param |
| `AdminStaffHubPage` | `section` | dashboard, users | Via `StaffRoleWorkspace` |
| `LiverCareOrderDetailPage` | `step` | business step ids | Stepper, not Radix Tabs — keep `?step=` |

### ⚠️ Partial — reads URL, does not write on tab change

| Page | Issue | Fix |
|------|-------|-----|
| `AdminStaffMemberDetailPage` | `defaultValue={defaultTab}` + `key={defaultTab}` — tab clicks don't update URL | Replace with `useUrlTabState<'dashboard'\|'profile'\|'performance'>` |

### ❌ State-based — must migrate

| Page | Current | Target URL |
|------|---------|------------|
| `MyProfilePanel` (inside Settings) | `useState(profileTab)` | `?tab=my-profile&section=basic` **or** nested: settings keeps `tab=my-profile`, add `profileSection=basic\|employment\|address\|coverage\|legal` |
| `TechnicianProfileView` | `defaultValue="employment"` | Used inside settings/staff — same `profileSection` param when embedded |
| `StaffEmployeeProfileView` | `defaultValue="employment"` | Same as above |
| `AdminPartnerLabDetailPage` | `defaultValue="profile"` | `?tab=profile\|legal\|reports\|billing`; keep `tab=edit` for edit mode (document precedence: edit overrides view tabs) |
| `AdminStaffOnboardPage` | `defaultValue="send-link"` | `?tab=send-link\|admin-complete` |
| `PatientLoginPage` | `defaultValue="otp"` | `?mode=otp\|password` (public route — no org scope) |

### 🔵 Low priority / legacy

| Page | Action |
|------|--------|
| `StaffRoleWorkspace` | Already controlled by parent — no change |
| Appointment pages | Redirected under Option A — do not invest |
| `DoctorAppointmentsPage` | Table/calendar toggle is view mode, not navigation tab — optional `?view=calendar` later |

---

## URL precedence rules

1. **Edit mode wins** — On `AdminPartnerLabDetailPage`, if `tab=edit`, show edit form; profile/legal/reports/billing tabs hidden until edit exits.
2. **Guard redirects** — Enquiry pattern: illegal tab for entity state → `replace` navigate to allowed tab (keep existing `useEffect` guards).
3. **Preserve foreign params** — Changing tab must not drop `labId`, `extractionStatus`, `onboard=admin`, etc.
4. **Default omission** — Hubs may omit default tab param (operations overview, staff dashboard, technician clinical).

---

## Navigation updates required

| Source | Update |
|--------|--------|
| `AdminStaffOnboardPage` navigate after create | Already uses `?tab=profile` — verify member detail writes URL on tab click |
| `AdminStaffPerformancePage` redirect | Already maps to `?tab=performance` |
| `StaffSelfProfilePage` / `TechnicianProfilePage` | Redirect to `settings?tab=my-profile` — add `profileSection` when sub-tabs migrated |
| Sidebar / `AdminLayout` | Already matches `tab=` for operations — no change |
| Deep links in dashboard KPI cards | Already use `?tab=` — verify after I1 |

---

## Testing

### Manual matrix

| URL | Expected tab |
|-----|--------------|
| `/org/kolkata/settings?tab=security` | Security |
| `/org/kolkata/admin/staff/doctors/:id?tab=profile` | Profile (after I1) |
| `/org/kolkata/admin/operations?tab=enquiries` | Enquiries list |
| `/org/kolkata/admin/enquiries/:id?tab=followup` | Follow-up form |
| `/org/kolkata/admin/lab-partners/:id?tab=billing` | Billing (after I1) |

### Automated

- Extend `e2e/super-admin-smoke.spec.ts` → settings security tab via URL
- New `e2e/url-tabs.spec.ts` — 3 deep-link cases
- Optional unit test for `useUrlTabState` (jsdom + memory router)

---

## Migration wave order

1. **I0** — Ship `useUrlTabState`
2. **I1** — `AdminStaffMemberDetailPage`, `AdminPartnerLabDetailPage`, `MyProfilePanel` + `profileSection`
3. **I2** — `AdminStaffOnboardPage`, `PatientLoginPage`, shared profile views
4. **I3** — Refactor existing URL tab pages to use hook (DRY, no behaviour change)
