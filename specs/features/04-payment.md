# Spec: Payment Workflow (Dummy)

**Module**: Payments, payment links, receipts  
**Interface**: `IPaymentService` → `DummyPaymentService`

## Payment modes

| Mode | Actor | Flow |
|------|-------|------|
| Offline | Ops/Admin | Mark paid with method, ref, date, collector |
| Online link | Ops | `createPaymentLink()` → dummy WhatsApp/SMS/email send |
| Patient portal | Patient | Dummy Razorpay checkout UI |

## Offline payment fields

`amount`, `method` (cash/UPI/bank/card), `transaction_ref`, `paid_at`, `collected_by`, `receipt_file_id`, `remarks`

## Payment link fields

`link_id`, `order_id`, `patient_id`, `amount`, `status`, `expires_at`, `sent_via`, `paid`

## Payment statuses

`pending`, `link_sent`, `processing`, `success`, `failed`, `refunded`, `cancelled`

## DummyPaymentService methods

```ts
createOrder(orderId, amount): PaymentOrder
createPaymentLink(orderId, channels): PaymentLink
simulateSuccess(paymentId): PaymentResult
simulateFailure(paymentId): PaymentResult
handleWebhook(payload): WebhookResult  // for future Razorpay shape
getPaymentStatus(orderId): PaymentStatus
```

## UI

- Order detail → Payment section
- Patient portal → Pay now modal (fake Razorpay redirect → success/fail buttons in dev)
- Receipt/invoice PDF via `DummyPDFGenerationService`

## Reuse

- `adminOperations.mock.ts` `demoCollectPayment` → migrate to `DummyPaymentService`
