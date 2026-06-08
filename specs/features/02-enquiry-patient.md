# Spec: Enquiry & Patient Registry

**Module**: Enquiry queue, patient list, patient profile  
**Roles**: Operations, Admin (write profile); Doctor (read-only profile)  
**State**: [state-management.md](../platform/state-management.md) — `usePatientsStore`, `usePatientDetailStore`

---

## Enquiry CRM

Full spec: [18-enquiries-crm.md](./18-enquiries-crm.md)

| Screen | Route |
|--------|-------|
| Enquiry list | `/admin/enquiries` |
| Add lead | `/admin/enquiries/new` |
| Enquiry detail | `/admin/enquiries/:id` |

Website auto-ingest via `/enquire`; WhatsApp/phone via **Add lead**. Convert → order at `/admin/orders/:id`.

---

## Patient registry — sidebar access

| Role | Nav item | Route |
|------|----------|-------|
| Doctor | Patients (Overview + Clinical child) | `/patients` |
| Operations | Patients | `/patients` |
| City Manager / Super Admin | Patients | `/patients` |
| Technician | — | No access |

Config: `LIVER_CARE_ROUTE_ROLES.patients` = `[DOCTOR, ...OPS_ROLES]`  
Nav: `patients-registry` in `navigation.ts`

---

## Patient list (`/patients`)

**Page**: `PatientsPage`  
**Store**: `usePatientsStore` (`createListStore`)

| Feature | Behaviour |
|---------|-----------|
| Table | `DataTable` — click row opens detail |
| Search | Debounced via store |
| Filters | Status, assigned doctor (`PatientFiltersPanel`) |
| Pagination | `PaginationControls` |
| Ops CTA | **Book appointment** → `/admin/appointments/book` |
| Default detail tab | `?tab=profile` |

---

## Patient detail (`/patients/:id`)

**Page**: `PatientDetailPage`  
**Store**: `usePatientDetailStore`

### Layout

```
[← Back]  Patient name · MR code · age/gender
[Read-only banner for doctors]

┌─────────────────────────────────────────────────────────┐
│ Profile │ Appointments │ Orders │ Tests │ Scans │ ...  │  ← top-level tabs
└─────────────────────────────────────────────────────────┘
<tab content>
```

Tabs are **top-level** immediately under the header (not nested). URL: `?tab=profile|appointments|orders|tests|scans|reports|payments`.

### Tabs (7)

| Tab | Content | Edit |
|-----|---------|------|
| **Profile** | Clinical summary, contact, demographics, medical/liver/meds/allergies/family | Ops/Admin only |
| **Appointments** | Appointment cards + home visits section | View links |
| **Orders** | Liver care orders (`LiverCareOrder`) | Link to ops order |
| **Tests** | Partner lab pathology PDFs + extraction status | View / open PDF |
| **Scans** | Fibrosis scan records (LSM, CAP, F-stage) | Read-only |
| **Reports** | Clinical / final report cards | Read-only for doctor |
| **Payments** | Per-order amount, mode, status table | Read-only |

### Removed tabs (v1 consolidation)

Dashboard, Timeline, Visits (standalone), Demographics, Medical, Liver, Medications, Allergies, Family — merged into **Profile** or **Appointments**.

### RBAC

| Action | Doctor | Ops / Admin |
|--------|--------|-------------|
| View all tabs | ✓ | ✓ |
| Edit profile sections | ✗ | ✓ |
| `canEditPatientProfile()` | false | true |

---

## Data layer

### Services (`PatientsService`)

| Method | Purpose |
|--------|---------|
| `list` | Paginated patient registry |
| `getById` | Profile + summary card |
| `getHistory` | Medical history sections |
| `getAppointments` / `getVisits` | Scheduling |
| `getReports` | Clinical report list |
| `getClinicalContext` | Orders, payments, pathology, scans |
| `updateDemographics` / `updateHistorySection` | Profile edits |

### Clinical context (`getClinicalContext`)

Mock: `patientsClinical.mock.ts` — filters `MOCK_LIVER_ORDERS`, `MOCK_LAB_REPORTS`, `MOCK_FIBROSIS_SCANS` by `patientId` (with alias map for seed patient).

API target: `GET /patients/:id/clinical`

### Store (`usePatientDetailStore`)

Loads in parallel on `loadPatient(id)`:

- `detail`, `history`, `appointments`, `visits`, `reports`, `clinical`
- `clear()` on route unmount

---

## Implementation map

| Layer | Files |
|-------|-------|
| Types | `src/types/patientClinical.ts`, `patientProfile.ts` |
| Clinical mock | `src/services/patients/patientsClinical.mock.ts` |
| Service | `src/services/patients/PatientsService.ts` |
| List store | `src/store/patients/patientsStore.ts` |
| Detail store | `src/store/patients/patientDetailStore.ts` |
| List UI | `PatientsPage.tsx`, `PatientFiltersPanel.tsx`, `patientColumns.tsx` |
| Detail UI | `PatientDetailPage.tsx` |
| Profile tab | `PatientProfilePanel.tsx` |
| Clinical tabs | `PatientClinicalPanels.tsx` |
| Appointments | `PatientAppointmentsPanel.tsx` |
| Reports | `PatientReportsPanel.tsx` |

---

## User flows

### Ops — find and edit patient

1. Sidebar → **Patients**
2. Search / filter → click row
3. **Profile** tab → edit contact or medical history → save
4. **Orders** / **Payments** tabs → review liver care journey

### Doctor — review before consult

1. **Patients** or appointment drawer link
2. Read-only **Profile**, **Scans**, **Reports**, **Tests**
3. No save actions shown
