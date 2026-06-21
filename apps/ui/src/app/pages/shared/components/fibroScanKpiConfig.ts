import type { FibrosisScanRecord } from '@/types/fibrosisScan';

export const METAVIR_STAGES = ['F0', 'F1', 'F2', 'F3', 'F4'] as const;
export const STEATOSIS_GRADES = ['S0', 'S1', 'S2', 'S3'] as const;

export const FIBROSIS_STAGE_HINT =
  'METAVIR F0–F4: degree of liver scarring (F0/F1 healthy–mild, F4 advanced fibrosis/cirrhosis).';

export const STEATOSIS_GRADE_HINT =
  'S0–S3: fatty liver / steatosis (S0 normal, S3 severe).';

export const IQR_MEDIAN_RELIABLE_THRESHOLD = 30;

export function fibroScanReliability(iqrMedianPercent: number): {
  label: string;
  reliable: boolean;
} {
  if (!Number.isFinite(iqrMedianPercent)) {
    return { label: 'Enter IQR / Median %', reliable: false };
  }
  return iqrMedianPercent <= IQR_MEDIAN_RELIABLE_THRESHOLD
    ? { label: `Reliable scan (${iqrMedianPercent}%)`, reliable: true }
    : { label: `Review required (${iqrMedianPercent}%)`, reliable: false };
}

export function measurementSuccessPercent(valid: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((valid / total) * 100);
}

/** All scans require an uploaded report PDF or image before visit completion. */
export function scanNeedsProof(
  scan: Pick<FibrosisScanRecord, 'scanFileUrl'> | null | undefined,
): boolean {
  return !scan?.scanFileUrl;
}

/** @deprecated Use scanNeedsProof */
export function deviceScanNeedsProof(
  scan: Pick<FibrosisScanRecord, 'source' | 'scanFileUrl'> | null | undefined,
): boolean {
  return scanNeedsProof(scan);
}

export function isScanCaptureComplete(
  scan: Pick<FibrosisScanRecord, 'source' | 'scanFileUrl' | 'liverStiffnessKpa'> | null | undefined,
): boolean {
  if (!scan) return false;
  // API serializes Decimal KPIs as strings (e.g. "6.2"); coerce before isFinite check.
  const lsm = Number(scan.liverStiffnessKpa);
  if (!Number.isFinite(lsm)) return false;
  return Boolean(scan.scanFileUrl);
}
