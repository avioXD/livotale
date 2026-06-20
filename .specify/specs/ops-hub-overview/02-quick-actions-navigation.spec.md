# Ops Hub Overview — Quick Actions Navigation

**Status**: Implemented  
**Config**: `src/app/pages/admin/operations/overviewActions.ts`

## Quick actions

| Label | Type | Target |
|-------|------|--------|
| Book walk-in | link | `/admin/appointments/book` |
| Pending payments | tab | `orders?paymentStatus=link_sent` |
| Missed today | link | `/admin/appointments/missed` |
| Lab partner queue | tab | `partner-lab?status=pending_dispatch` |
| Enquiry queue | tab | `enquiries` |
| Collect payments | tab | `orders?paymentStatus=pending` |

## Tab navigation rules

- `setTab` replaces URL params (does not merge stale filter keys).
- Tab-specific keys cleared on every tab switch: `paymentStatus`, `orderStatus`, `createdBy`, `assignedTo`, `status`, `dispatchStatus`, `labId`, `extractionStatus`, `stage`.

## Verification

- E2E: each button updates URL and tab heading.
- Switching between quick actions does not leave stale query params.
