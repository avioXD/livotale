# Order Flow Spec Implementation (2026-06-20)

Implemented per approved plan: patient scan preference → ops atomic confirm with slot-aware technician assignment.

## Delivered

- Spec updates: `03`, `06`, `10`, `20`, new `22-org-operating-hours.md`
- Migration `044_org_operating_hours.sql`
- API: `SlotAvailabilityService`, public/admin scan slots, `confirm-scan-schedule`, `available-for-slot`
- Portal: unified payment transition, patient timeline endpoint
- UI: `OrderScanScheduleSection` slot→tech→confirm, patient post-pay redirect, API-driven slots
- PKG-3: auto `doctor_assignment_pending` on report publish
- Tests: `test_slot_availability.py`, `test_scan_booking_patient_pref_ops_confirm.py`, helper updates

## Verify

```bash
# Apply migration
psql $DATABASE_URL -f packages/database/migrations/044_org_operating_hours.sql

# API tests (with venv + DB)
cd livotale-apis/api && pytest tests/test_slot_availability.py tests/integration/test_scan_booking_patient_pref_ops_confirm.py -v
```
