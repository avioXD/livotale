# S3 Storage Integration — Admin Configure

**Status**: Implemented

## User stories

1. **Super Admin** opens Integrations → Object storage (S3) and sees current config status.
2. **Super Admin** completes **connection intake** (bucket, region, key prefix, optional endpoints).
3. **Super Admin** completes **credentials intake** (access key ID + secret); secret is masked on reload.
4. **Super Admin** runs **connection test** (bucket reachable, write probe succeeds).
5. **Hub** card shows `Configured` / `Not configured` badge.

## Fields

| Field | DB column | Notes |
|-------|-----------|-------|
| Bucket | `s3_bucket` | Required for configured |
| Region | `s3_region` | e.g. `ap-south-1` |
| Key prefix | `s3_key_prefix` | Default `livotale` |
| Internal endpoint | `s3_endpoint` | Optional (LocalStack) |
| Public endpoint | `s3_public_endpoint` | Optional (browser-reachable URL rewrite) |
| Access key ID | `s3_access_key_id` | Plain text in DB |
| Secret access key | `s3_secret_access_key_enc` | Encrypted bytea |

**`s3Configured` rule:** `bucket` + `region` + `access_key_id` + decrypted secret present.

## Runtime resolution

DB `platform_settings` values override env when present; empty DB fields fall back to `Settings` env defaults.

## API contracts

### GET/PUT `/admin/integrations/settings`

Extended with: `s3Bucket`, `s3Region`, `s3KeyPrefix`, `s3Endpoint`, `s3PublicEndpoint`, `s3AccessKeyId`, `s3SecretAccessKey` (masked), `s3Configured`.

### GET `/admin/integrations/status`

Adds `s3Configured`.

### POST `/admin/integrations/settings/test-storage`

Response: `{ ok, bucket, region, endpoint?, error? }`

Probe writes to `{prefix}/.livotale-probe/{uuid}` then deletes.

## RBAC

- Settings read/write + test: Super Admin (`RoleCode.ADMIN`)
- Hub status badge: Super Admin + City Manager (via `/status`)

## Security

- Never return raw secret; blank password input keeps existing.
- Test endpoint Super Admin only.
- Credentials encrypted with `INTEGRATIONS_ENCRYPTION_KEY`.

## Acceptance criteria

- Hub shows S3 card with configured badge.
- Save persists encrypted secret; reload shows masked value.
- Connection test succeeds against configured bucket.
- `StorageService` uses DB config when set, else env fallback.
