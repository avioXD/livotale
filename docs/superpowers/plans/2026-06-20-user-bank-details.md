# User Bank Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralized encrypted bank/payout profiles for every `identity.users` account — self-service edit, Super Admin full view + verification, Ops/City Manager masked view.

**Architecture:** New `identity.user_bank_accounts` table with AES-256-GCM encrypted account numbers. `BankDetailsService` handles RBAC and serialization. Shared `BankDetailsPanel` UI across staff/patient profiles; admin directory + staff detail tab for Super Admin.

**Tech Stack:** FastAPI, SQLAlchemy raw SQL (existing pattern), Python `cryptography` (AESGCM), React/TypeScript, existing `StorageService` for doc upload.

**Spec:** `docs/superpowers/specs/2026-06-20-user-bank-details-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `packages/database/migrations/040_user_bank_accounts.sql` | Schema |
| `apps/api/app/core/field_encryption.py` | Encrypt/decrypt account numbers |
| `apps/api/app/services/bank_details_service.py` | CRUD, RBAC, validation, payout gate |
| `apps/api/app/schemas/bank_details.py` | Pydantic request/response models |
| `apps/api/app/api/v1/routers/bank_details.py` | `/me/bank-details` + admin routes |
| `apps/api/app/api/v1/micro/identity/__init__.py` | Register router |
| `apps/api/tests/test_bank_details.py` | Integration tests |
| `apps/ui/src/types/bankDetails.ts` | TS types |
| `apps/ui/src/services/bank/BankDetailsService.ts` | API client |
| `apps/ui/src/app/pages/bank/components/BankDetailsPanel.tsx` | Self-service form |
| `apps/ui/src/app/pages/bank/components/BankDetailsAdminPanel.tsx` | Admin read/verify |
| `apps/ui/src/app/pages/settings/components/MyProfilePanel.tsx` | Add Bank tab |
| `apps/ui/src/app/pages/admin/staff/AdminStaffMemberDetailPage.tsx` | Bank tab |
| `apps/ui/src/app/pages/admin/bank/AdminBankDetailsDirectoryPage.tsx` | Super Admin directory |
| `apps/ui/src/app/routes/AppRoutes.tsx` | Route for directory |
| `apps/ui/src/app/config/navigation.ts` | Nav link (Super Admin) |

---

### Task 1: Database migration

**Files:**
- Create: `packages/database/migrations/040_user_bank_accounts.sql`

- [ ] **Step 1: Write migration**

```sql
BEGIN;

CREATE TABLE identity.user_bank_accounts (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  account_holder_name varchar(160),
  account_number_encrypted bytea,
  account_number_last4 varchar(4),
  ifsc_code varchar(11),
  bank_name varchar(120),
  branch_name varchar(120),
  upi_id varchar(120),
  verification_status varchar(20) NOT NULL DEFAULT 'pending',
  verification_doc_file_id uuid REFERENCES storage.files(id) ON DELETE SET NULL,
  verified_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  verification_notes text,
  required_for_payout boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_bank_accounts_verification
  ON identity.user_bank_accounts (verification_status);
CREATE INDEX idx_user_bank_accounts_required
  ON identity.user_bank_accounts (required_for_payout)
  WHERE required_for_payout = true;

CREATE TRIGGER trg_user_bank_accounts_updated_at
BEFORE UPDATE ON identity.user_bank_accounts
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- Backfill last4 from legacy staff/technician profiles where possible
INSERT INTO identity.user_bank_accounts (user_id, account_number_last4, verification_status)
SELECT hr.user_id, hr.bank_account_last4, 'pending'
FROM operations.staff_hr_profiles hr
WHERE hr.bank_account_last4 IS NOT NULL
  AND hr.user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO identity.user_bank_accounts (user_id, account_number_last4, verification_status)
SELECT t.user_id, ep.bank_account_last4, 'pending'
FROM operations.technicians t
JOIN operations.technician_employee_profiles ep ON ep.technician_id = t.id
WHERE ep.bank_account_last4 IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
```

- [ ] **Step 2: Apply migration locally**

Run: `cd livotale-apis/api && .venv/bin/python scripts/apply_pending_migrations.py`  
Expected: `040_user_bank_accounts.sql` applied

- [ ] **Step 3: Verify table exists**

Run: `cd livotale-apis/api && .venv/bin/python -c "
from sqlalchemy import create_engine, text
import os
e = create_engine(os.environ['DATABASE_URL'].replace('+asyncpg',''))
with e.connect() as c:
    r = c.execute(text(\"SELECT column_name FROM information_schema.columns WHERE table_schema='identity' AND table_name='user_bank_accounts'\"))
    print(sorted(x[0] for x in r))
"`  
Expected: includes `account_number_encrypted`, `account_number_last4`

---

### Task 2: Field encryption utility

**Files:**
- Create: `apps/api/app/core/field_encryption.py`
- Modify: `apps/api/pyproject.toml` (add `cryptography` if missing)
- Test: `apps/api/tests/test_field_encryption.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_field_encryption.py
import os
import base64
import pytest
from app.core.field_encryption import encrypt_field, decrypt_field

@pytest.fixture(autouse=True)
def _key(monkeypatch):
    key = base64.urlsafe_b64encode(b"0" * 32).decode()
    monkeypatch.setenv("BANK_DETAILS_ENCRYPTION_KEY", key)

def test_encrypt_decrypt_round_trip():
    plain = "123456789012"
    blob = encrypt_field(plain)
    assert blob != plain.encode()
    assert decrypt_field(blob) == plain
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd livotale-apis/api && .venv/bin/python -m pytest tests/test_field_encryption.py -v`

- [ ] **Step 3: Implement**

```python
# app/core/field_encryption.py
from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.exceptions import AppError

_ENV_KEY = "BANK_DETAILS_ENCRYPTION_KEY"


def _aesgcm() -> AESGCM:
    raw = os.getenv(_ENV_KEY)
    if not raw:
        raise AppError("BANK_DETAILS_ENCRYPTION_KEY is not configured", status_code=500)
    key = base64.urlsafe_b64decode(raw)
    if len(key) != 32:
        raise AppError("BANK_DETAILS_ENCRYPTION_KEY must decode to 32 bytes", status_code=500)
    return AESGCM(key)


def encrypt_field(plaintext: str) -> bytes:
    nonce = os.urandom(12)
    ciphertext = _aesgcm().encrypt(nonce, plaintext.encode("utf-8"), None)
    return nonce + ciphertext


def decrypt_field(blob: bytes) -> str:
    nonce, ciphertext = blob[:12], blob[12:]
    return _aesgcm().decrypt(nonce, ciphertext, None).decode("utf-8")
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Add key to `.env.example` and `LOCAL_CREDENTIALS.md`**

```
BANK_DETAILS_ENCRYPTION_KEY=<generate with: python -c "import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())">
```

---

### Task 3: BankDetailsService + schemas

**Files:**
- Create: `apps/api/app/schemas/bank_details.py`
- Create: `apps/api/app/services/bank_details_service.py`
- Test: `apps/api/tests/test_bank_details.py`

- [ ] **Step 1: Write schemas**

```python
# app/schemas/bank_details.py
from datetime import datetime
from uuid import UUID
from pydantic import Field
from app.schemas.common import BaseSchema

class UpsertBankDetailsInput(BaseSchema):
    account_holder_name: str = Field(alias="accountHolderName")
    account_number: str = Field(alias="accountNumber")
    ifsc_code: str = Field(alias="ifscCode")
    bank_name: str | None = Field(default=None, alias="bankName")
    branch_name: str | None = Field(default=None, alias="branchName")
    upi_id: str | None = Field(default=None, alias="upiId")
    verification_doc_file_id: UUID | None = Field(default=None, alias="verificationDocFileId")

class BankDetailsMasked(BaseSchema):
    user_id: UUID = Field(alias="userId")
    account_holder_name: str | None = Field(default=None, alias="accountHolderName")
    account_number_last4: str | None = Field(default=None, alias="accountNumberLast4")
    ifsc_code: str | None = Field(default=None, alias="ifscCode")
    bank_name: str | None = Field(default=None, alias="bankName")
    upi_id: str | None = Field(default=None, alias="upiId")
    verification_status: str = Field(alias="verificationStatus")
    has_verification_doc: bool = Field(default=False, alias="hasVerificationDoc")
    required_for_payout: bool = Field(default=False, alias="requiredForPayout")
    verified_at: datetime | None = Field(default=None, alias="verifiedAt")

class BankDetailsFull(BankDetailsMasked):
    account_number: str | None = Field(default=None, alias="accountNumber")
    branch_name: str | None = Field(default=None, alias="branchName")
    verification_doc_file_id: UUID | None = Field(default=None, alias="verificationDocFileId")
    verification_notes: str | None = Field(default=None, alias="verificationNotes")
```

- [ ] **Step 2: Write service skeleton with validation**

Key methods:
- `get_for_user(user_id, viewer_roles, viewer_id) -> dict`
- `upsert_for_user(user_id, body) -> dict`
- `verify(user_id, verifier_id, status, notes) -> dict`
- `list_directory(filters) -> list[dict]`
- `require_for_payout(user_id) -> None` raises `AppError` code `bank_details_required`

Validation helpers (module-level):
```python
import re
IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")

def validate_ifsc(value: str) -> str:
    v = value.strip().upper()
    if not IFSC_RE.match(v):
        raise AppError("Invalid IFSC code", status_code=422)
    return v

def validate_account_number(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if not (9 <= len(digits) <= 18):
        raise AppError("Account number must be 9–18 digits", status_code=422)
    return digits
```

RBAC in `get_for_user`:
- Self or `admin` in roles → full (decrypt)
- `support` or `city_manager` → masked
- Else → 403

On upsert: encrypt account number, set `account_number_last4`, reset `verification_status='pending'` if account number or doc changed.

- [ ] **Step 3: Write integration tests**

```python
def test_self_can_upsert_and_read_bank_details(staff_client, admin_token):
    # login as operations@livotale.com, PUT /me/bank-details, GET returns full number

def test_super_admin_sees_full_account_number(staff_client, admin_token, ops_token):
    # admin GET /admin/users/{ops_user_id}/bank-details includes accountNumber

def test_ops_sees_masked_only(staff_client, admin_token, ops_token):
    # ops GET same URL — no accountNumber field, has accountNumberLast4

def test_verify_flow(staff_client, admin_token):
    # POST verify verified → status verified
```

Use existing test fixtures from `tests/test_staff_archive.py` (`staff_client`, `_login`).

- [ ] **Step 4: Run tests — implement until green**

Run: `cd livotale-apis/api && .venv/bin/python -m pytest tests/test_bank_details.py -v`

---

### Task 4: API routes

**Files:**
- Create: `apps/api/app/api/v1/routers/bank_details.py`
- Modify: `apps/api/app/api/v1/micro/identity/__init__.py`

- [ ] **Step 1: Create router**

```python
router = APIRouter(tags=["bank-details"])

@router.get("/me/bank-details")
async def get_my_bank_details(current_user, service): ...

@router.put("/me/bank-details")
async def upsert_my_bank_details(body: UpsertBankDetailsInput, current_user, service): ...

@router.get("/admin/users/{user_id}/bank-details")
async def admin_get_bank_details(user_id, current_user, service): ...

@router.post("/admin/users/{user_id}/bank-details/verify")
async def admin_verify_bank_details(user_id, body, current_user, service):
    # require admin role only

@router.get("/admin/bank-details")
async def admin_list_bank_details(current_user, service):
    # require admin role only; query params: status, requiredForPayout, q
```

- [ ] **Step 2: Register in identity micro router**

```python
from app.api.v1.routers import bank_details
router.include_router(bank_details.router)
```

- [ ] **Step 3: Re-run integration tests**

---

### Task 5: Frontend types + API service

**Files:**
- Create: `apps/ui/src/types/bankDetails.ts`
- Create: `apps/ui/src/services/bank/BankDetailsService.ts`

- [ ] **Step 1: Types**

```typescript
export type BankVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface BankDetailsMasked {
  userId: string;
  accountHolderName: string | null;
  accountNumberLast4: string | null;
  ifscCode: string | null;
  bankName?: string | null;
  upiId?: string | null;
  verificationStatus: BankVerificationStatus;
  hasVerificationDoc?: boolean;
  requiredForPayout: boolean;
  verifiedAt?: string | null;
}

export interface BankDetailsFull extends BankDetailsMasked {
  accountNumber?: string | null;
  branchName?: string | null;
  verificationDocFileId?: string | null;
  verificationNotes?: string | null;
}

export interface UpsertBankDetailsInput {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string | null;
  branchName?: string | null;
  upiId?: string | null;
  verificationDocFileId?: string | null;
}
```

- [ ] **Step 2: Service**

```typescript
class BankDetailsService extends BaseApiService {
  getMine(): Promise<BankDetailsFull | null> { return this.get('/me/bank-details'); }
  upsertMine(body: UpsertBankDetailsInput): Promise<BankDetailsFull> { return this.put('/me/bank-details', body); }
  getForUser(userId: string): Promise<BankDetailsFull | BankDetailsMasked> {
    return this.get(`/admin/users/${userId}/bank-details`);
  }
  verify(userId: string, status: 'verified' | 'rejected', notes?: string) {
    return this.post(`/admin/users/${userId}/bank-details/verify`, { status, notes });
  }
  listDirectory(params?: { status?: string; q?: string }) {
    return this.get<BankDetailsFull[]>('/admin/bank-details', { params });
  }
}
export const bankDetailsService = new BankDetailsService();
```

Handle 404 on GET as `null` (no record yet).

---

### Task 6: Shared BankDetailsPanel (self-service)

**Files:**
- Create: `apps/ui/src/app/pages/bank/components/BankDetailsPanel.tsx`

- [ ] **Step 1: Build form component**

Props: `mode: 'self'`

Fields: accountHolderName, accountNumber (password input with show toggle), ifscCode, bankName, branchName, upiId.

Doc upload: reuse `storageService.uploadFile(file, 'payout_verification', userId, 'cheque')` — add bucket key to storage service if needed.

Show verification status badge; if `requiredForPayout && !isComplete` show destructive banner.

Submit calls `bankDetailsService.upsertMine`.

- [ ] **Step 2: Wire into MyProfilePanel**

Add `'bank'` to `STAFF_PROFILE_SECTIONS` and `TECH_PROFILE_SECTIONS`:

```typescript
const STAFF_PROFILE_SECTIONS = ['basic', 'employment', 'address', 'legal', 'bank'] as const;
// ...
<TabsTrigger value="bank">Bank / Payout</TabsTrigger>
<TabsContent value="bank"><BankDetailsPanel mode="self" /></TabsContent>
```

- [ ] **Step 3: Wire into PatientProfilePage** (patient portal)

Same `BankDetailsPanel` for logged-in patient.

---

### Task 7: Admin panels

**Files:**
- Create: `apps/ui/src/app/pages/bank/components/BankDetailsAdminPanel.tsx`
- Modify: `apps/ui/src/app/pages/admin/staff/AdminStaffMemberDetailPage.tsx`

- [ ] **Step 1: Admin panel component**

Props: `userId: string`, `canVerify: boolean`, `masked: boolean`

Load via `bankDetailsService.getForUser(userId)`.

If `canVerify && verificationStatus === 'pending'`: Show Verify / Reject buttons → `bankDetailsService.verify`.

If `masked`: hide account number field, show `****{last4}`.

- [ ] **Step 2: Add tab to AdminStaffMemberDetailPage**

Add `'bank'` to detail tabs for all roles. Pass `canVerify={isSuperAdmin}`, `masked={!isSuperAdmin && isOpsOrCityManager}`.

Use `useUserRole()` + `AppRole.SUPER_ADMIN`, `AppRole.OPERATIONS`, `AppRole.CITY_MANAGER`.

---

### Task 8: Super Admin directory page

**Files:**
- Create: `apps/ui/src/app/pages/admin/bank/AdminBankDetailsDirectoryPage.tsx`
- Modify: `apps/ui/src/app/routes/AppRoutes.tsx`
- Modify: `apps/ui/src/app/config/navigation.ts`

- [ ] **Step 1: Directory page**

DataTable: user name, role, IFSC, last4, verification status, requiredForPayout.  
Row click → staff member detail bank tab or user profile.

Filters: verification status, search by name/email.

- [ ] **Step 2: Route + nav**

Route: `/org/:city/admin/bank-details`  
Nav: under Admin section, Super Admin only (`isAdminRole`).

---

### Task 9: Remove legacy bankAccountLast4 UI

**Files:**
- Modify: `apps/ui/src/app/pages/staff/profile/staffProfileConfig.ts` — remove `bankAccountLast4` from `BASE_EMPLOYMENT_FIELDS`
- Modify: `apps/ui/src/app/pages/staff/profile/components/StaffEmployeeProfileView.tsx` — remove form field
- Modify: `apps/ui/src/app/pages/technician/profile/components/TechnicianProfileView.tsx` — remove bank last4 input

Do **not** drop DB columns yet.

---

### Task 10: Payout gate hook + docs

**Files:**
- Modify: `apps/api/app/services/bank_details_service.py` — `require_for_payout`
- Modify: `LOCAL_CREDENTIALS.md` — document env key + test flow
- Modify: `apps/api/README.md` — migration 040 note

- [ ] **Step 1: Implement gate**

```python
async def require_for_payout(self, user_id: UUID) -> None:
    row = await self._fetch_row(user_id)
    if not row or not self._is_complete(row):
        await self._set_required(user_id)
        raise AppError("Bank details required before payout", status_code=422, error="bank_details_required")
    if row["verification_status"] != "verified":
        raise AppError("Bank details must be verified", status_code=422, error="bank_details_unverified")
```

- [ ] **Step 2: Document manual test**

1. Login as ops user → Settings → Bank / Payout → fill + upload doc  
2. Login as Super Admin → verify document  
3. Login as ops (different account) → view staff member → masked bank tab  
4. Super Admin → full view + directory page

- [ ] **Step 3: Full test suite**

Run: `cd livotale-apis/api && .venv/bin/python -m pytest tests/test_bank_details.py tests/test_field_encryption.py -v`

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Central table per user | Task 1 |
| AES encryption | Task 2 |
| Self GET/PUT | Task 4 |
| Super Admin full view | Task 3, 7 |
| Ops/City Manager masked | Task 3, 7 |
| Verification upload + approve | Task 3, 6, 7 |
| required_for_payout gate | Task 10 |
| All user types (staff + patient) | Task 6 |
| Admin directory | Task 8 |
| Deprecate bankAccountLast4 UI | Task 9 |
| Audit events | Task 3 (log in service on view/verify) |
| No full number in logs | Task 2 (discipline + code review) |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-20-user-bank-details.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement task-by-task in this session with checkpoints

Which approach do you want?
