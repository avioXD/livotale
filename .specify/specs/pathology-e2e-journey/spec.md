# Pathology E2E Journey

**Status**: Implemented  
**Priority**: P3

## Integration test (PKG-2)

```
assign-lab → lab-partner-order → PATCH external-id → schedule-pathology
→ lab-partner-visit(visited) → lab-partner-collected → received → awaiting-report
→ lab-report → ai-extract → verify → final-report/generate → publish → complete
```

## Playwright

`e2e/s4-pathology-partner-lab.spec.ts` — ops navigates lab step UI (smoke where fixtures allow).

## Matrix

Update `specs/recovery/04-E2E-TEST-MATRIX.md` S4 — remove deprecated technician dispatch step.
