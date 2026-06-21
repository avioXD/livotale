# Spec: Technician Field Portal

**Module**: FibroScan field visit workflow for assigned technicians  
**Routes**: `/org/:city/technician/orders`, `/org/:city/technician/orders/:id`  
**Service**: `TechnicianOrderService`

## Scope

Technicians perform **home FibroScan visits only** on orders assigned to them:

1. View assigned orders list — **scan phase only** (pending scan + completed scans; excludes pathology, AI, report, consult, and terminal statuses)
2. Open order detail with patient contact + home address + schedule
3. Advance visit status (`visit_started` → `reached_location`)
4. View patient details after payment (ops pre-fill or order defaults); verify/update at location with phone OTP — **no operator approve/reject gate**
5. Submit FibroScan machine intake (device patient code + demographics)
6. Capture scan KPIs (device fetch or manual entry)
7. Upload report proof (PDF/image) with document type
8. Send visit completion OTP and close visit

## Out of scope (technician UI)

Blood sample collection, sample dispatch, pathology handover, and lab partner workflows are **not** shown to technicians. Those are handled by **operations** and **third-party lab partner associates** after the FibroScan visit is complete.

Technicians must **not** call:

- `GET /admin/orders/{id}`
- Any `/technician/orders/{id}/sample-dispatch/*` endpoints from UI
- Patient registry or pathology panels

## List filter (technician)

`GET /technician/orders` returns only orders in scan-relevant statuses:

- `technician_assigned`, `scan_scheduled`, `scan_in_progress` — pending scan
- `scan_completed` — visit finished; visible until ops advances the order to pathology/AI/report

Excluded: `pathology_pending`, lab/AI/report/doctor/consult/prescription statuses, `completed`, `cancelled`.

UI splits the list into **Pending scan** and **Completed scans** tabs using visit step + order status.

## Visit step state machine

`assigned` → `visit_started` → `reached_location` → `scan_in_progress` → `scan_completed` | `unable_to_complete`

## OTP checkpoints

| Step | When | API |
|------|------|-----|
| Patient intake | Before submitting demographics at home | `POST .../patient-intake/otp` then `POST .../patient-intake/verify` |
| Visit completion | After scan captured + report uploaded | `POST .../visit-completion-otp` then `POST .../complete` |

Demo OTP: `123456` — validated via `identity.otp_challenges` (see [otp-security.md](../platform/otp-security.md))

Intake panel supports resend with 60s cooldown after first send.

## Scan capture

- **Sources**: `manual`, `device`, `upload`
- **Report proof**: Required for both manual and device paths before visit completion
- **Report document type** (`scanReportDocumentType`): `scanner_pdf` | `report_photo` | `letter`
- Device fetch uses `DummyFibrosisScanDeviceService`

### Step 3 UI — unified submit

`LiverFibrosisScanCapturePanel` uses a single primary **Submit scan** button:

1. Technician enters KPIs (manual entry or **Fetch from machine**).
2. Technician selects report document type and a PDF/image file.
3. **Submit scan** saves KPIs, uploads via presign flow, and attaches proof in one action.
4. On success, the panel collapses to `TechnicianScanResultsPanel`.

Optional **Save draft** persists KPIs only (no file) for partial entry.

Visit completion (Step 4) stays disabled until `scanFileUrl` is present (`isScanCaptureComplete`). The helper coerces `liverStiffnessKpa` with `Number()` because the API returns Decimal fields as JSON strings (e.g. `"6.2"`).

### Step 4 UI — visit completion OTP

After **Submit scan** succeeds, the capture panel collapses to `TechnicianScanResultsPanel`. `TechnicianVisitCompletionPanel` is shown **directly below** (send OTP + verify & complete — no extra navigation step):

1. Technician taps **Send completion OTP** (patient phone on file).
2. Patient shares the 6-digit code.
3. Technician enters OTP and taps **Verify OTP & complete visit** (`POST .../complete`).

Order on the detail page: **1** patient intake OTP → **2** FibroScan intake → **3** scan + report → **4** visit completion OTP.

See [scan-report-upload-design.md](../../../docs/superpowers/specs/2026-06-20-scan-report-upload-design.md).

## API matrix

| Action | Method | Path | Role |
|--------|--------|------|------|
| List assigned | GET | `/technician/orders` | technician (scan-phase statuses only) |
| Order detail | GET | `/technician/orders/{id}` | technician (assigned) |
| Visit state | GET | `/technician/orders/{id}/visit` | technician |
| Patient intake | GET | `/technician/orders/{id}/patient-intake` | technician |
| Send intake OTP | POST | `/technician/orders/{id}/patient-intake/otp` | technician |
| Verify intake | POST | `/technician/orders/{id}/patient-intake/verify` | technician (auto-approved; no ops review) |
| FibroScan intake | POST | `/technician/orders/{id}/fibroscan-intake` | technician |
| Ops validate FibroScan intake | PATCH | `/admin/orders/{id}/fibroscan-intake/verify` | admin, support, city_manager |
| Start visit | POST | `/technician/orders/{id}/visit-started` | technician |
| Mark reached | POST | `/technician/orders/{id}/reached` | technician |
| Fetch device scan | POST | `/technician/orders/{id}/fibrosis-scan/fetch` | technician |
| Save scan KPIs | POST | `/technician/orders/{id}/fibrosis-scan` | technician |
| Attach report file | POST | `/technician/orders/{id}/fibrosis-scan/attach` | technician |
| Send completion OTP | POST | `/technician/orders/{id}/visit-completion-otp` | technician |
| Complete visit | POST | `/technician/orders/{id}/complete` | technician |
| Rescan | POST | `/technician/orders/{id}/fibrosis-scan/rescan` | technician |
| Unable to complete | POST | `/technician/orders/{id}/unable` | technician |

## Order detail response (technician)

Extends standard order fields with:

- `patientEmail`
- `address`, `city`, `pincode` (from patient address or enquiry)
- `visitStep` (current technician visit step)

No pricing edits. Payment status read-only gate.

## UI components

| Component | Purpose |
|-----------|---------|
| `TechnicianOrdersPage` | Pending scan + completed scans tabs (no pathology/downstream statuses) |
| `TechnicianOrderDetailPage` | Full field workflow |
| `TechnicianPatientInfoCard` | Contact, address, schedule |
| `TechnicianVisitProgressCard` | Visit status buttons |
| `TechnicianPatientIntakePanel` | Step 1 intake + OTP |
| `TechnicianFibroScanIntakePanel` | Step 2 machine intake |
| `LiverFibrosisScanCapturePanel` | Step 3 scan + report upload |
| `TechnicianVisitCompletionPanel` | Completion OTP |

## Phase 2 (future)

- `POST /technician/orders/{id}/fibrosis-scan/extract` — AI validation of uploaded report vs entered KPIs

## Related specs

- [05-fibrosis-scan-technician.md](./05-fibrosis-scan-technician.md) — scan record fields
- [03-orders-workflow.md](./03-orders-workflow.md) — order status machine
- [14-rbac-navigation.md](./14-rbac-navigation.md) — technician sidebar
- [06-partner-lab-pathology.md](./06-partner-lab-pathology.md) — ops/lab only (not technician)
