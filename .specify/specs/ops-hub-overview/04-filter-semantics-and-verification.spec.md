# Ops Hub Overview — Filter Semantics & Verification

**Status**: Implemented

## Backend

- `GET /admin/orders?paymentStatus=unpaid` returns orders where `payment_status != 'success'` (matches overview `unpaidOrders` KPI).

## UI

- `ORDER_PAYMENT_PRESETS` includes `unpaid` option.
- Target tabs show `ActiveFilterBanner` when filters are applied from URL or toolbar.
- Banner visible even when filter panel is collapsed.

## Tests

- Contract: overview returns all six KPI keys; orders accepts `paymentStatus=unpaid`.
- E2E: quick actions show filter banner on orders/lab tabs when applicable.

## Cleanup

- Remove unused `AdminCollectPaymentModal.tsx` (collect flow lives on order detail page).
