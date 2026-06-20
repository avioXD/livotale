# Consult Scheduling API Contract

**Feature:** PKG-3 teleconsult booking (patient preference → ops confirm)  
**Base URL:** `VITE_API_BASE_URL` (default `http://localhost:4001`)  
**Envelope:** `{ data: T }` on success; `{ error: { code, message, details? } }` on failure

## Public slots

### `GET /api/v1/public/slots/consult`

Query: `date` (ISO date, required)

Response `data`: `ConsultSlotOption[]`

```typescript
interface ConsultSlotOption {
  code: string;       // slot key (scheduledAt ISO or composite)
  label: string;      // e.g. "10:00 AM – 10:30 AM"
  available: boolean;
  scheduledAt: string | null; // ISO8601 when available
}
```

## Patient portal

### `POST /api/v1/patient-portal/orders/{order_id}/consult-date`

Auth: patient OTP session (phone must match order).

Body:

```typescript
{
  preferredAt: string;   // ISO8601
  timeSlot: string;      // display label
}
```

Gates: PKG-3, letterhead report ready, no existing `consultationScheduledAt`.

Errors: `409` if preference already set or consult confirmed; `400` if gate not met.

## Admin / ops

### `GET /api/v1/admin/orders/{order_id}/consult-slots`

Query: `date` (required). Highlights patient preference when set.

### `GET /api/v1/admin/doctors/available-for-slot`

Query:

| Param | Required | Notes |
|-------|----------|-------|
| `scheduledAt` | yes | ISO8601 slot start |
| `language` | no | Filter by patient/doctor language |
| `excludeOrderId` | no | Exclude current order from occupancy |

Response `data`: `AssignableDoctor[]`

```typescript
interface AssignableDoctor {
  id: string;
  name: string;
  languages: string[];
  specialty?: string;
}
```

### `POST /api/v1/admin/orders/{order_id}/confirm-consultation-schedule`

Body:

```typescript
{
  doctorId: string;
  scheduledAt: string;   // ISO8601
  timeSlot: string;
  doctorName?: string;
}
```

Effects: sets `doctor_id`, `consultation_scheduled_at`, `consultation_time_slot`; creates/updates `OrderConsultation`; transitions to `consultation_pending`.

Errors: `409` slot_unavailable / doctor_unavailable; `400` invalid_state.

## Doctor (deprecated schedule)

### `POST /api/v1/doctor/consultations/{order_id}/schedule`

Returns **403** with `error: "doctor_cannot_schedule"`. Ops must schedule via confirm endpoint.

## Timeline events

- `consultation_date_requested` — patient preference
- `consultation_schedule_confirmed` — ops atomic confirm
