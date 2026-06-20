# Pathology Visit Confirmation

**Status**: Implemented  
**Priority**: P1

## Goal

After pathology schedule is confirmed, ops watches the **lab partner portal** and updates visit outcome here before marking sample collected.

## Fields (service_orders)

- `pathologyVisitOutcome`: `null | visited | no_show`
- `pathologyVisitConfirmedAt`, `pathologyVisitConfirmedBy`

## API

| Method | Path | Body |
|--------|------|------|
| POST | `/api/v1/admin/orders/{orderId}/lab-partner-visit` | `{ outcome: 'visited' \| 'no_show', notes?: string }` |

Gates:
- Requires `pathologyScheduledAt`
- Blocks if dispatch already `sample_collected` or later
- `POST .../lab-partner-collected` requires `pathologyVisitOutcome === 'visited'`

No-show clears schedule fields so ops can re-confirm schedule.

## UI

Visit confirmation card in `OrderPathologySection` with "Collector visited" / "No-show" buttons. Collection button hidden until visited.

## Checklist

Insert step "Lab collector visit confirmed" between schedule and collection (9 steps total).
