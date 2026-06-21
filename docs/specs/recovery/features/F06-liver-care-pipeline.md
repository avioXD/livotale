# F06 — Liver Care Order Pipeline (PKG-1/2/3)

**Priority**: P1 (mostly working after DB baseline)  
**Status**: Phase B–C complete in UI; API routes exist (~80 endpoints)

---

## Package workflows

| PKG | Scan | Pathology | Doctor | Key API groups |
|-----|------|-----------|--------|----------------|
| PKG-1 | ✅ | — | — | orders, technician, fibrosis-scan |
| PKG-2 | ✅ | ✅ | — | + pathology, AI extraction, final report |
| PKG-3 | ✅ | ✅ | ✅ | + consultations, prescriptions |

---

## API domains (all registered)

| Domain | Prefix | Count |
|--------|--------|-------|
| Admin orders | `/admin/orders` | 12 |
| Admin pathology | `/admin/pathology`, order subpaths | 25 |
| Technician orders | `/technician/orders` | 18 |
| Doctor consultations | `/doctor/consultations` | 13 |
| Doctor prescriptions | `/doctor/orders/.../prescriptions` | 6 |
| Patient portal | `/patient-portal` | 12 |

---

## Known issues within pipeline

| Issue | Impact | Fix |
|-------|--------|-----|
| Dummy payment link | Ops order detail | Wire real payment_links API (partial exists) |
| Dummy PDF generation | Final report | API generates server-side — remove dummy call |
| Pathology mock upload deprecated | Dev only | Use presign + POST lab-report |
| WS order channels | Real-time panels | Verify Redis connected |

---

## State machine (order transitions)

Document in `features/03-orders-workflow.md`. Contract test each transition:

```
enquiry → order_created → payment_pending → paid → scan_scheduled →
scan_completed → [pathology_*] → [consultation_*] → report_published
```

**Edge cases**:

| # | Scenario | Expected |
|---|----------|----------|
| E1 | Skip pathology on PKG-1 | Workflow blocks pathology steps |
| E2 | Offline payment record | POST offline-payment |
| E3 | AI extraction reject + reupload | reupload endpoint |
| E4 | Final report lock after publish | POST lock → immutable |
| E5 | Technician unable to visit | POST unable → ops notified |
| E6 | Concurrent transition | Optimistic lock / version column |

**DB**: `service_orders.version` from migration 034_enquiry.

---

## Realtime

| Channel | UI consumer |
|---------|-------------|
| `ws:operations:orders:{id}` | Admin order detail |
| `ws:technician:orders:{id}` | Technician order detail |
| `ws:patient-portal:{phone}` | Patient order detail |

---

## Tests

- Integration: PKG-1 happy path (enquiry → scan complete)
- Integration: PKG-2 through final report publish
- Integration: PKG-3 through prescription publish
- Contract: each workflow transition invalid from wrong state → 422

See [04-E2E-TEST-MATRIX.md](../04-E2E-TEST-MATRIX.md) scenarios S2–S5.
