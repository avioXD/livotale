# Patient Portal — My Enquiries Under Orders

**Status**: Implemented

## User stories

1. **Patient** opens `/patient/orders` and sees **My orders** plus **My enquiries** (stacked below).
2. **Patient** sees enquiry reference, date, package, patient-friendly status, message preview.
3. **Patient** with converted enquiry sees **View order** → `/patient/orders/:orderId`.
4. **Patient** dashboard shows up to 2 open enquiries with link to full list.
5. **Patient** opens `/patient/enquiries/:id` for full detail (patient-safe fields only).

## API contracts

### GET `/patient-portal/enquiries?phone=`

Phone-scoped. Returns non-deleted enquiries sorted `enquiryAt DESC`.

Response item (`PatientEnquiry`):

- `id`, `enquiryNumber`, `status`, `patientStatusLabel`, `enquiryAt`
- `preferredPackageName`, `preferredPackageCode`, `message`
- `orderId`, `orderNumber` (when converted)

Omits: `internalNotes`, `callRemarks`, `followUpLogs`, `assignedExecutive*`.

### GET `/patient-portal/enquiries/{id}?phone=`

Same auth. Single `PatientEnquiry` or 404.

### Patient status labels

| Internal | Label |
|----------|-------|
| `new` | Submitted |
| `contacted` | Team reviewing |
| `interested` | In progress |
| `follow_up_required` | Follow-up scheduled |
| `converted` | Order created |
| `not_interested`, `closed` | Closed |

## Matching

- Primary: phone last-10 digits (same as portal orders)
- Secondary: `patient_id` when set on enquiry

## RBAC

- Phone-scoped portal access only; no admin CRM fields exposed

## Acceptance criteria

- Public enquiry by logged-in patient phone appears on `/patient/orders`
- Converted enquiry includes `orderId` + link to order detail
- Wrong phone cannot read another patient's enquiry
- Dashboard shows open enquiries teaser
