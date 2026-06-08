# Spec: AI Report Extraction (Dummy)

**Module**: AI extraction jobs, review UI  
**Interface**: `IAIExtractionService` → `DummyAIExtractionService`

## Flow

1. Ops uploads scan PDF and/or pathology PDF  
2. `POST /orders/:id/ai-extract` → job queued  
3. Dummy service returns structured JSON after delay  
4. Review screen shows editable grid  
5. User verifies → saves to `extracted_fields`  
6. Order status → `ai_extraction_completed`

## Job statuses

`not_started`, `queued`, `processing`, `extracted`, `review_pending`, `verified`, `failed`, `re_upload_required`

## Extracted field shape

`field_name`, `extracted_value`, `unit`, `reference_range`, `flag` (normal/high/low/critical), `confidence_score`, `source_page`, `edited_value`, `verified`

## DummyAIExtractionService

```ts
queueExtraction(orderId, fileId, type: 'pathology'|'fibrosis_scan'): JobId
getJobStatus(jobId): ExtractionJob
getResult(jobId): ExtractedField[]
simulateProcessing(jobId): void  // dev helper
```

## UI

- Ops: `/admin/operations?tab=ai-review` or order detail sub-panel
- Bulk edit, confirm all, flag low-confidence rows

## Future

Interface accepts `Buffer|fileId`; real OCR provider swaps in via env `AI_EXTRACTION_PROVIDER`.
