# Order Payment — UPI Submit + Ops Verify

**Status**: Implemented

## User stories

1. **Patient** views org UPI ID and QR on pay page, uploads payment screenshot, submits → order enters `processing`.
2. **Operator / superadmin** reviews receipt on order detail, verifies or rejects submission.
3. **Operator** marks offline payment with optional receipt → immediate `success`.
4. **Technician** sees read-only payment status badge on assigned order detail.

## Payment status machine

| Status | Set by | Downstream |
|--------|--------|------------|
| `pending` | Default / reject | Blocked |
| `processing` | Patient submit with receipt | Blocked |
| `success` | Verify or offline mark | Unlocked |
| `failed` | Dev simulate failure | Blocked |

`payment_completed` workflow event fires only on verify or offline mark.

## API contracts

### GET `/patient-portal/payment-config?phone=`

Response: `{ upiId, qrImageUrl, payeeName }`

### POST `/patient-portal/orders/{id}/pay`

Body: `{ phone, method, receiptFileId, transactionRef?, outcome? }` — `receiptFileId` required unless `outcome=failure` (dev).

Sets `payment_status=processing`, creates `OrderPayment` with `status=processing`.

### POST `/admin/orders/{id}/verify-payment`

Ops role. Requires `payment_status=processing`. Sets `success`, fires workflow.

### POST `/admin/orders/{id}/reject-payment`

Ops role. Body: `{ remarks? }`. Sets `payment_status=pending`.

### POST `/admin/orders/{id}/offline-payment`

Body adds optional `receiptFileId`. Immediate `success`.

### Platform settings

`paymentUpiId`, `paymentQrFileId` on `integrations.platform_settings`; exposed via admin integrations settings and patient payment-config.

## RBAC

- Patient portal: phone-scoped order access
- Verify/reject/offline: `is_ops_role` (`support`, `admin`, `city_manager`)
- Technician: read-only `paymentStatus`

## Acceptance criteria

- Patient cannot book scan/pathology while `processing`
- Ops hub filter `paymentStatus=processing` lists pending verifications
- Technician header shows payment badge
