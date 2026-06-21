# Scan Report Upload Design

**Date:** 2026-06-20  
**Status:** Approved for implementation  
**Related:** [21-technician-field-portal.md](../../../docs/specs/features/21-technician-field-portal.md), [05-fibrosis-scan-technician.md](../../../docs/specs/features/05-fibrosis-scan-technician.md)

## Overview

Step 3 of the technician field visit captures FibroScan KPIs and requires an uploaded report proof (PDF or image) before the visit can be completed. This spec defines the unified **Submit scan** UX and the storage → attach API chain validated end-to-end.

## Scope

- Step 3 only: `LiverFibrosisScanCapturePanel` (not Step 1 patient OTP or Step 2 FibroScan intake)
- Storage presign → S3 PUT → confirm → save scan KPIs → attach file
- Integration tests, manual verification script, Playwright coverage

## Acceptance criteria

1. Technician selects a PDF or image (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`).
2. Technician selects `scanReportDocumentType`: `scanner_pdf` | `report_photo` | `letter`.
3. Technician fills required KPI fields (LSM, CAP, IQR/Median %, valid/total measurements).
4. Technician clicks **Submit scan** — saves KPIs, uploads file, attaches proof in one action.
5. On success, panel collapses to `TechnicianScanResultsPanel` (`isScanCaptureComplete` true).
6. Visit completion (Step 4) remains blocked until `scanFileUrl` is set.
7. Optional **Save draft** saves KPIs only without file (for partial entry).

## API contract

| Step | Method | Path | Notes |
|------|--------|------|-------|
| Presign | POST | `/api/v1/storage/presign` | `entityType: fibroscan_report`, `entityId: orderId` |
| Upload | PUT | presigned `uploadUrl` | Browser or script |
| Confirm | POST | `/api/v1/storage/{fileId}/confirm` | Verifies object in S3 via head_object |
| Save KPIs | POST | `/api/v1/technician/orders/{id}/fibrosis-scan` | Requires fibroscan intake submitted |
| Attach | POST | `/api/v1/technician/orders/{id}/fibrosis-scan/attach` | Requires prior save_scan; `storageUrl` required |
| Read | GET | `/api/v1/technician/orders/{id}/fibrosis-scan` | Returns `scanFileUrl`, `scanReportDocumentType` |

### Attach request body

```json
{
  "fileName": "fibroscan-report.pdf",
  "fileType": "application/pdf",
  "fileId": "<uuid>",
  "storageUrl": "https://...",
  "scanReportDocumentType": "scanner_pdf"
}
```

### Error responses

| Condition | Status | Message |
|-----------|--------|---------|
| Attach before save_scan | 400 | Save scan KPIs before uploading report proof |
| Missing storageUrl on attach | 400 | storageUrl is required |
| Confirm without S3 object | 400 | Uploaded object not found in storage |
| Save scan without fibroscan intake | 400 | Submit FibroScan intake before saving scan data |

## UI behaviour

### Primary action: Submit scan

- Enabled when: KPIs valid **and** file selected **and** not locked/saving.
- Sequence: `saveScan` → `attachScanFile` (presign → PUT → confirm → attach).
- Clears file input on success; calls `onSaved` when capture complete.

### Secondary action: Save draft

- Saves KPIs only (`POST /fibrosis-scan`); does not require file.
- Does not advance to results panel.

### Error messages (UI)

| Failure point | User message |
|---------------|--------------|
| Presign | Could not start upload |
| S3 PUT | Upload to storage failed |
| Confirm | Upload could not be verified |
| Attach | API error message |

## Storage

- Entity type: `fibroscan_report`
- S3 key prefix: `livotale/clinical/fibroscan/orders/{orderId}/{fileId}/{filename}`
- Dev requires valid AWS credentials or LocalStack (`S3_ENDPOINT` in `.env`).

## Testing

- Integration: `tests/integration/test_scan_report_upload.py` with mocked S3
- Manual: `scripts/verify_scan_report_upload.py --order-id <uuid> [--file ~/Downloads/...]`
- E2E: Playwright with fixture PDF in `apps/ui/e2e/fixtures/`

## Out of scope

- AI report extraction (`POST /fibrosis-scan/extract`)
- Admin review workflow for uploaded proof
- Twilio / OTP changes
