# S3 Storage Integration — Implementation Plan

## Phase 1: Backend

1. Migration `050_platform_s3_settings.sql`
2. Platform settings model + integration service + schemas
3. `s3_config` resolver + `S3Service` refactor
4. Wire `StorageService` to resolve config per request
5. `POST /admin/integrations/settings/test-storage`
6. Extend `/status` with `s3Configured`

## Phase 2: Frontend

1. Hub card on `AdminIntegrationsPage`
2. `AdminS3ConfigPage` (connection intake, credentials, test)
3. Extend `IntegrationsAdminService` + route

## Phase 3: Tests

1. API integration test: settings CRUD + masked secret
2. Connection test endpoint with mocked S3
