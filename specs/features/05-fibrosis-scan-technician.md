# Spec: Fibrosis Scan & Technician Workflow

**Module**: Liver Fibrosis Scan capture, device dummy  
**Interface**: `IFibrosisScanDeviceService` → `DummyFibrosisScanDeviceService`

## Technician workflow steps

1. View assigned orders  
2. Mark `visit_started`  
3. Mark `reached_location`  
4. Capture scan (manual / device fetch / file upload)  
5. Add remarks  
6. Mark `scan_completed` OR `unable_to_complete` + reason

## Scan record fields

`order_id`, `patient_id`, `liver_stiffness_kpa` (LSM), `cap_dbm`, `iqr`, `iqr_median_percent`, `valid_measurements`, `total_measurements`, `success_rate_percent`, `probe_type` (M/XL), `scan_at`, `operator_name`, `device_serial`, `fasting_status`, `bmi`, `interpretation`, `steatosis_grade` (S0–S3), `fibrosis_stage` (F0–F4), `remarks`, `scan_file_id`, `source` (manual|device|upload), `locked`, `audit`

## Device dummy

`DummyFibrosisScanDeviceService.fetchScanData(orderId)` returns realistic JSON simulating Wi-Fi device export.

## Permissions

- Technician: assigned orders only; no payment/pricing
- Ops/Admin: review, edit until lock
- Doctor: read on assigned cases
- Patient: read published report only (not raw device JSON)

## UI realign

| Existing | Change |
|----------|--------|
| `TechnicianSchedulePage` | Filter by assigned orders |
| `TechnicianVisitDetailPage` | Order-centric step buttons |
| `FibroScanClinicalPanel` | Full parameter form + device fetch button |

## API

- `GET /technician/orders` (assigned)
- `POST /technician/orders/:id/visit-started|reached|scan|complete|failed`
- `POST /integrations/fibrosis-scan/fetch` (dummy device)
- `PATCH /admin/orders/:id/fibrosis-scan` (review edit)
