# Spec: Org Operating Hours & Slot Engine

**Module**: Shared 45-minute appointment slot generation for home FibroScan visits  
**Storage**: `operations.org_operating_hours`

## Defaults

| Setting | Value |
|---------|-------|
| Open | 08:00 |
| Close | 18:00 (last slot starts at 17:15) |
| Slot duration | 45 minutes |
| Sunday | Closed |
| Monday–Saturday | Open per city row |

## Slot generation

- Slots generated from `open_time` to `close_time` stepping by `slot_duration_minutes`
- Each slot has `code` (`HH:MM` 24h), `label` (12h display), `scheduledAt` (ISO for date+slot)
- Slot marked unavailable when: day closed, slot in past, or capacity exhausted (v1: one confirmed visit per technician per overlapping slot)

## API

| Endpoint | Role | Purpose |
|----------|------|---------|
| `GET /api/v1/public/slots/scan?date=YYYY-MM-DD&city=` | public, patient | Slot cards with `available` flag |
| `GET /api/v1/admin/orders/{id}/scan-slots?date=` | ops | Same + patient preference overlay |

## UI consumers

- `PatientScanScheduleSection` — fetch public slots after payment
- `OrderScanScheduleSection` — fetch admin scan-slots on date change
- `appointmentSlots.ts` — API-first with local 8–6 fallback for offline dev

## Seed data

Migration `044_org_operating_hours.sql` seeds `org_city = 'default'`: Sun closed; Mon–Sat 08:00–18:00.
