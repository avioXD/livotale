# Admin Operations API Contract

## GET `/admin/operations/overview`

Returns combined KPIs for Operations Hub overview tab.

```json
{
  "data": {
    "appointmentsToday": 12,
    "pendingAssignments": 3,
    "missedToday": 1,
    "samplesPendingAssign": 2,
    "unpaidOrders": 4,
    "collectedToday": 18500
  }
}
```

## GET `/admin/operations/orders`

Query: `paymentStatus`, `orderType` (`appointment`|`pharmacy`), `search`, `limit`

```json
{
  "data": [
    {
      "id": "uuid",
      "orderType": "appointment",
      "orderNumber": "LG-APT-20260607-001",
      "patientId": "uuid",
      "patientName": "Rohan Mehta",
      "serviceLabel": "Doctor consultation",
      "amount": 800,
      "paymentStatus": "pending",
      "placedAt": "2026-06-07T09:00:00Z",
      "referenceId": "appointment-uuid"
    }
  ]
}
```

## POST `/admin/operations/orders/:id/collect`

Body: `{ "orderType": "appointment", "method": "cash"|"online"|"qr", "amount": 800, "notes": "..." }`

Updates payment status to `paid`, inserts `commerce.payments` audit row.

## POST `/patient/appointments/:id/demo-pay`

Body: `{ "method": "upi"|"card" }` — simulates patient online payment for pending appointment.

Response: `{ "paymentStatus": "paid", "providerPaymentId": "demo_pay_..." }`
