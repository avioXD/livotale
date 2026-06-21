# Order Visit Address at Home Visit Scheduling

**Status**: Implemented

## User stories

1. **Operator / superadmin** — after payment, on the scan scheduling step, sees the patient's home address and pincode (or enquiry fallback with "incomplete" badge).
2. **Operator / superadmin** — if address or pincode is missing, can add/edit inline without leaving the order page.
3. **Patient** — after payment, sees read-only home address on the scan scheduling card (contact ops if missing).
4. **Technician** — unchanged; already receives address via `load_order_visit_location`.

## Address completeness rules

| State | Display | Can schedule? |
|-------|---------|---------------|
| `patient_addresses` with `line1` + `pincode` | Full address + pincode | Yes |
| Enquiry text only (no pincode) | Show text + "Pincode required" | No until ops adds pincode |
| No address at all | Empty state + inline form | No until ops saves |

**Pincode service zones:** warn-only — show serviceability alert but do not block confirm.

## API contracts

### PATCH `/patients/{id}/demographics`

When payload includes `addressLine1`, `addressLine2`, or `pincode`:

- Upserts default row in `clinical.patient_addresses`
- Requires `addressLine1` and `pincode` when saving address fields
- RBAC: `admin`, `support`, `city_manager`
- When patient has no default address yet (out of zone scope), ops may still upsert address if the patient has an active service order (order visit-address bootstrap)

### GET `/admin/orders/{id}` and GET `/patient-portal/orders/{id}`

Response includes `visitLocation`:

```json
{
  "address": "string | null",
  "city": "string | null",
  "pincode": "string | null",
  "source": "patient_address | enquiry | none",
  "isComplete": true
}
```

`isComplete` is true when structured `patient_addresses` row has both `line1` and `pincode`.

### POST `/admin/orders/{id}/confirm-scan-schedule`

Requires `visitLocation.isComplete === true`. Returns `400 validation_error` otherwise.

## RBAC

- Address edit: `PATIENT_EDIT_ROLES` (`admin`, `support`, `city_manager`)
- Patient portal: read-only `visitLocation` on order detail
- Technician: unchanged (existing visit location on technician order APIs)

## Acceptance criteria

- Ops scan step shows address + pincode after payment success
- Inline address form appears when address incomplete; save refreshes order
- `confirm-scan-schedule` blocked server-side without complete address
- Scan schedule prerequisites reflect real `hasAddress` state
- Patient portal shows read-only address on scan scheduling card
- Out-of-zone pincode shows warning only (does not block confirm)
