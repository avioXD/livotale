# F03 — Notifications & Inbox Recovery

**Priority**: P0 (fixed via migration 038)  
**Gaps**: G-01, G-14

---

## Architecture

```
Business event → notification_outbox (pending)
              → process_pending_outbox worker
              → inbox_notifications (role | phone)
              → Redis WS publish
              → UI bell poll + WebSocket
```

---

## APIs

| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | `/notifications/inbox?role=` | JWT | ✅ after 038 |
| GET | `/notifications/inbox/patient?phone=` | Public | ✅ |
| PATCH | `/notifications/inbox/:id/read` | JWT | ✅ |
| PATCH | `/notifications/inbox/read-all` | JWT | ✅ |
| POST | `/notifications/inbox` | Ops admin | ✅ push |
| WS | `/ws/v1/notifications?role=&token=` | JWT query | ✅ |

**Role mapping** (UI → API):

| UI role | API recipient_id |
|---------|------------------|
| SUPER_ADMIN | admin |
| OPERATIONS | support |
| TECHNICIAN | technician |
| DOCTOR | doctor |

---

## DB (migration 038)

```sql
audit.inbox_notifications (
  recipient_type 'role' | 'phone',
  recipient_id text,
  category, title, body, order_id, read_at, created_at
)
audit.notification_outbox (...)
```

**Idempotent seed**: Do not insert duplicate welcome notifications on re-seed.

---

## UI components

| Component | Behavior |
|-----------|----------|
| `NotificationBell` | Poll + WS; role from active AppRole |
| `StaffNotificationsPage` | Full inbox list |
| `PatientNotificationsPage` | Portal notifications API |
| `AdminLiverCareNotificationsPage` | **Dummy only — needs API** |

---

## Edge cases

| # | Scenario | Expected |
|---|----------|----------|
| E1 | Empty inbox | 200, `data: []` |
| E2 | SUPER_ADMIN role query | Maps to `admin` recipient |
| E3 | Mark all read | PATCH read-all → all read=true |
| E4 | WS reconnect | Bell refreshes on message |
| E5 | Table missing | 500 → toast "Database schema out of date" |
| E6 | Unauthorized poll | 401 → login redirect |
| E7 | Push to multiple roles | Multiple inbox rows |

---

## Outbox worker

**Gap**: No background worker documented for `process_pending_outbox`.

**Options**:

1. Call processor on each mutating order transition (inline)
2. APScheduler / cron in API lifespan
3. Manual admin trigger for dev

Spec: invoke `process_pending_outbox(limit=50)` after order state changes in `order_service.py`.

---

## Tests

- Contract: inbox authenticated, empty and populated
- Contract: role mapping SUPER_ADMIN → admin rows returned
- E2E: bell badge count updates after ops creates order notification
- Migration: table exists verification in CI
