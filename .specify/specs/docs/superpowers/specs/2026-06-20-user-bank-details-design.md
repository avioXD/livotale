# User Bank Details — Design Spec

**Date:** 2026-06-20  
**Status:** Approved  
**Author:** Brainstorming session with product owner

---

## Problem

Bank/payout information is fragmented and incomplete:

- Technicians store only `bank_account_last4` on `operations.technician_employee_profiles` (self-editable).
- Other staff store the same field on `operations.staff_hr_profiles` (admin-only, not self-service).
- Patients and partners have no bank profile.
- No IFSC, UPI, verification documents, encryption, or centralized Super Admin view.

Payroll, reimbursements, and refunds need a single, secure, role-aware payout profile per user.

---

## Goals

1. Every `identity.users` account can add/update their own bank/payout details.
2. Super Admin can view full details and verify uploaded documents.
3. Operations and City Manager can view **masked** details only (last-4, IFSC, UPI, verification status).
4. Bank details are optional until a payout/refund is attempted, then required.
5. Account numbers are encrypted at rest; full numbers are never logged.

## Non-goals (v1)

- Multiple bank accounts per user (one active record only).
- External vault/tokenization (Stripe, Hashicorp).
- Automated IFSC → bank name lookup API (manual/optional field only).
- Actual payout execution (RazorpayX, etc.) — only data collection and gating.

---

## Requirements (confirmed)

| Area | Decision |
|------|----------|
| Scope | All `identity.users` — staff, patients, partners, admins |
| Fields | Account holder name, account number, IFSC, bank name (optional branch), optional UPI ID |
| Verification | Cancelled cheque or passbook upload; Super Admin approves/rejects |
| Self-service | User creates/updates own record |
| Super Admin | Full decrypted view + verify/reject + directory listing |
| Ops / City Manager | Masked view: last-4, IFSC, UPI, verification status, doc uploaded (yes/no) |
| Collection timing | Optional until first payout/refund attempt; then `required_for_payout = true` |
| Storage security | AES-256-GCM encryption for account number; IFSC/name plain; no full number in logs |

---

## Architecture

### Approach: Central `identity.user_bank_accounts` table

One row per user (unique on `user_id`). All profile surfaces (staff, technician, patient portal, admin) call the same service and API. RBAC enforced in `BankDetailsService` before decryption.

Replaces scattered `bank_account_last4` fields in UI; legacy columns retained temporarily for backfill only.

```
┌─────────────────┐     PUT/GET /me/bank-details      ┌──────────────────────┐
│  Profile UIs    │ ────────────────────────────────► │  BankDetailsService  │
│  (all roles)    │                                   │  + FieldEncryption   │
└─────────────────┘                                   └──────────┬───────────┘
                                                                 │
┌─────────────────┐     GET /admin/users/{id}/bank-details      │
│  Super Admin    │ ───────────────────────────────────────────►│
│  Ops (masked)   │     GET /admin/bank-details (directory)     │
└─────────────────┘                                   ┌──────────▼───────────┐
                                                      │ identity.user_bank_  │
                                                      │ accounts + storage.  │
                                                      │ files (verification) │
                                                      └──────────────────────┘
```

---

## Data model

### Table: `identity.user_bank_accounts`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid PK | FK → `identity.users(id)` ON DELETE CASCADE |
| `account_holder_name` | varchar(160) | Required when complete |
| `account_number_encrypted` | bytea | AES-256-GCM ciphertext |
| `account_number_last4` | varchar(4) | Denormalized for masked display |
| `ifsc_code` | varchar(11) | Uppercase, validated |
| `bank_name` | varchar(120) | Optional |
| `branch_name` | varchar(120) | Optional |
| `upi_id` | varchar(120) | Optional |
| `verification_status` | varchar(20) | `pending`, `verified`, `rejected` |
| `verification_doc_file_id` | uuid | FK → `storage.files(id)` nullable |
| `verified_by` | uuid | FK → `identity.users(id)` nullable |
| `verified_at` | timestamptz | nullable |
| `verification_notes` | text | nullable |
| `required_for_payout` | boolean | Default false; set true on payout gate |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### Encryption

- Library: Python `cryptography` (`AESGCM`).
- Key: `BANK_DETAILS_ENCRYPTION_KEY` env var (32-byte url-safe base64).
- Stored format: `nonce (12 bytes) || ciphertext`.
- Startup guard: warn if key missing in non-dev environments.

### Migration `040_user_bank_accounts.sql`

- Create table + indexes on `verification_status`, `required_for_payout`.
- Backfill `account_number_last4` from existing `bank_account_last4` on technician/staff HR profiles where user_id is known (no full number migration).

---

## API

Base path: `/api/v1` (identity microservice).

### Self-service

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/me/bank-details` | Any authenticated user | Full own record (decrypted account number) |
| PUT | `/me/bank-details` | Any authenticated user | Upsert; changing account number or doc resets `verification_status` to `pending` |

### Admin

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/admin/users/{userId}/bank-details` | Super Admin | Full record |
| GET | `/admin/users/{userId}/bank-details` | Ops, City Manager | Masked record |
| POST | `/admin/users/{userId}/bank-details/verify` | Super Admin | `{ status: verified\|rejected, notes? }` |
| GET | `/admin/bank-details` | Super Admin | Paginated directory with filters |

### Payout gate helper (internal)

`BankDetailsService.require_for_payout(user_id)` → raises `AppError 422` with code `bank_details_required` if incomplete when payout initiated.

### Response shapes (camelCase envelope)

**Full (self / Super Admin):**
```json
{
  "userId": "...",
  "accountHolderName": "Jane Doe",
  "accountNumber": "123456789012",
  "accountNumberLast4": "9012",
  "ifscCode": "HDFC0001234",
  "bankName": "HDFC Bank",
  "branchName": null,
  "upiId": "jane@upi",
  "verificationStatus": "pending",
  "verificationDocFileId": "...",
  "verificationDocUrl": "...",
  "requiredForPayout": false,
  "verifiedAt": null
}
```

**Masked (Ops / City Manager):**
```json
{
  "userId": "...",
  "accountHolderName": "Jane Doe",
  "accountNumberLast4": "9012",
  "ifscCode": "HDFC0001234",
  "upiId": "jane@upi",
  "verificationStatus": "pending",
  "hasVerificationDoc": true,
  "requiredForPayout": false
}
```

Account number field omitted in masked responses.

---

## RBAC matrix

| Action | Self | Super Admin | Ops | City Manager | Other roles |
|--------|------|-------------|-----|--------------|-------------|
| View full account number | ✓ | ✓ | ✗ | ✗ | ✗ |
| View masked | — | ✓ | ✓ | ✓ | ✗ |
| Create/update own | ✓ | ✗ | ✗ | ✗ | ✗ |
| Verify document | ✗ | ✓ | ✗ | ✗ | ✗ |
| Directory list | ✗ | ✓ | ✗ | ✗ | ✗ |

Admin view of **another user's** details always goes through admin endpoints; self uses `/me/bank-details`.

---

## UI

### Self-service — "Bank / Payout" tab

Add to:

- `MyProfilePanel.tsx` — all staff roles (new tab after Legal docs).
- `TechnicianProfileView.tsx` — self mode (or shared component).
- `PatientProfilePage.tsx` / patient portal settings.

Component: `BankDetailsPanel.tsx` (shared)

- Form fields with validation (IFSC regex, account number 9–18 digits).
- Verification doc upload (PDF/JPG/PNG).
- Status badge + rejection notes if rejected.
- Banner when `requiredForPayout && !isComplete`.

### Super Admin

- `AdminStaffMemberDetailPage.tsx` — new **Bank details** tab (read-only + verify actions).
- New page: `AdminBankDetailsDirectoryPage.tsx` — searchable list, filter by verification status / role / missing.

### Ops / City Manager

- Same staff member **Bank details** tab with masked fields only (no verify button).

### Deprecate

Remove `bankAccountLast4` input from:

- `StaffEmployeeProfileView.tsx`
- `TechnicianProfileView.tsx`
- `staffProfileConfig.ts` field definition

---

## Validation rules

- `accountHolderName`: 2–160 chars, letters/spaces/dots.
- `accountNumber`: 9–18 digits (India typical range).
- `ifscCode`: `/^[A-Z]{4}0[A-Z0-9]{6}$/`.
- `upiId`: optional, basic `@` format check.
- Complete profile = name + account number + IFSC + verification doc uploaded.
- `verified` status set only by Super Admin (not self).

---

## Security & audit

- Never log decrypted account numbers (structlog filter / explicit discipline).
- Audit events (existing `audit.activity_logs`):
  - `bank_details.viewed` — admin views another user's record (userId, viewerId, masked: bool).
  - `bank_details.updated` — self or system update.
  - `bank_details.verified` — Super Admin action.
- Storage path: `payout-verification/{userId}/{fileId}/` via existing `StorageService`.

---

## Payout gate integration (v1 hook)

When ops marks refund/reimbursement (future or existing offline payment flows):

1. Call `require_for_payout(payee_user_id)`.
2. On failure, UI shows link to `/org/.../settings?profileSection=bank`.
3. Sets `required_for_payout = true` on first failed check.

Initial hook point: document in plan; wire to one existing admin payment modal as proof (`AdminCollectPaymentModal` or refund path if present).

---

## Testing

| Layer | Cases |
|-------|-------|
| Unit | Encrypt/decrypt round-trip, IFSC validation, mask serializer |
| Integration | Self CRUD, Super Admin full GET, Ops masked GET (403 on full), verify flow |
| RBAC | Doctor cannot view another user's bank details |
| Migration | Backfill last4 from legacy columns |

---

## Rollout

1. Deploy migration + API (feature flag not required — empty state is safe).
2. Deploy UI tab; announce to staff.
3. Remove legacy `bankAccountLast4` from forms after one release.
4. Optional later: drop `bank_account_last4` columns.

---

## Open questions (resolved)

All product questions resolved in brainstorming session 2026-06-20. No open blockers.
