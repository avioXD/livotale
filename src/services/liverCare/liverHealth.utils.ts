import type { ExtractedField } from '@/types/aiExtraction';
import type { FibrosisScanRecord } from '@/types/fibrosisScan';
import type { LiverHealthStatus, LiverRoadmapStage } from '@/types/liverHealthReport';

export function parseNumericField(fields: ExtractedField[], names: string[]): number | null {
  for (const name of names) {
    const f = fields.find((x) => x.fieldName.toLowerCase().includes(name.toLowerCase()));
    if (!f) continue;
    const n = Number(String(f.editableValue).replace(/,/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function computeFib4(age: number, ast: number, alt: number, plateletsPerUl: number): number {
  const plateletsGiga = plateletsPerUl / 1000;
  if (plateletsGiga <= 0 || alt <= 0) return 0;
  return (age * ast) / (plateletsGiga * Math.sqrt(alt));
}

export function interpretFib4(score: number): { label: string; status: LiverHealthStatus } {
  if (score < 1.3) return { label: 'Low risk of advanced fibrosis', status: 'normal' };
  if (score <= 2.67) return { label: 'Indeterminate — consider further testing', status: 'caution' };
  return { label: 'High risk of advanced fibrosis', status: 'high' };
}

export function computeApri(ast: number, plateletsPerUl: number, astUln = 40): number {
  const plateletsGiga = plateletsPerUl / 1000;
  if (plateletsGiga <= 0) return 0;
  return ((ast / astUln) / plateletsGiga) * 100;
}

export function interpretApri(score: number): { label: string; status: LiverHealthStatus } {
  if (score < 0.5) return { label: 'No significant fibrosis', status: 'normal' };
  if (score <= 1.5) return { label: 'Possible fibrosis', status: 'caution' };
  return { label: 'Likely cirrhosis', status: 'high' };
}

export function stiffnessStatus(kpa: number): LiverHealthStatus {
  if (kpa < 6) return 'normal';
  if (kpa < 8) return 'caution';
  if (kpa < 12) return 'high';
  return 'critical';
}

export function capStatus(dbm: number): LiverHealthStatus {
  if (dbm < 238) return 'normal';
  if (dbm < 260) return 'caution';
  if (dbm < 290) return 'high';
  return 'critical';
}

export function bmiStatus(bmi: number): LiverHealthStatus {
  if (bmi < 23) return 'normal';
  if (bmi < 25) return 'caution';
  if (bmi < 30) return 'high';
  return 'critical';
}

export function roadmapFromScan(scan: FibrosisScanRecord): LiverRoadmapStage {
  const stage = scan.fibrosisStage.toUpperCase();
  if (stage.includes('F3') || stage.includes('F4')) return 'cirrhosis';
  if (stage.includes('F2') || stage.includes('F1')) return 'fibrosis';
  if (scan.steatosisGrade.toUpperCase().includes('S2') || scan.steatosisGrade.toUpperCase().includes('S3')) {
    return 'fatty';
  }
  if (scan.capDbm >= 260) return 'fatty';
  return scan.liverStiffnessKpa >= 7 ? 'fibrosis' : 'fatty';
}

export function computeLiverHealthScore(scan: FibrosisScanRecord, fib4: number | null, bmi: number): number {
  let score = 100;
  score -= Math.min(35, Math.max(0, (scan.liverStiffnessKpa - 5) * 4));
  score -= Math.min(25, Math.max(0, (scan.capDbm - 220) / 6));
  if (fib4 != null) {
    if (fib4 > 2.67) score -= 20;
    else if (fib4 > 1.3) score -= 10;
  }
  score -= Math.min(15, Math.max(0, (bmi - 23) * 1.5));
  return Math.round(Math.max(35, Math.min(98, score)));
}

export function computeLiverAge(actualAge: number, scan: FibrosisScanRecord): number {
  const stiffnessOffset = Math.max(0, scan.liverStiffnessKpa - 5) * 1.2;
  const fatOffset = Math.max(0, scan.capDbm - 240) / 25;
  return Math.round(actualAge + stiffnessOffset + fatOffset);
}

export function computeRecoveryPotential(scan: FibrosisScanRecord): number {
  let base = 92;
  if (scan.liverStiffnessKpa > 9) base -= 18;
  else if (scan.liverStiffnessKpa > 7) base -= 10;
  if (scan.capDbm > 290) base -= 12;
  else if (scan.capDbm > 260) base -= 6;
  return Math.round(Math.max(45, Math.min(95, base)));
}

export function targetWeightKg(heightCm: number, targetBmi = 24): number {
  const h = heightCm / 100;
  return Math.round(targetBmi * h * h);
}

export function estimateHeightCm(bmi: number, weightKg: number): number {
  if (bmi <= 0) return 170;
  const h = Math.sqrt(weightKg / bmi);
  return Math.round(h * 100);
}

export function estimateWeightKg(bmi: number, heightCm = 170): number {
  const h = heightCm / 100;
  return Math.round(bmi * h * h);
}

export function cardiometabolicRisk(bmi: number, hba1c: number | null, triglycerides: number | null): number {
  let risk = 20;
  if (bmi >= 30) risk += 30;
  else if (bmi >= 25) risk += 18;
  if (hba1c != null) {
    if (hba1c >= 6.5) risk += 25;
    else if (hba1c >= 5.7) risk += 12;
  }
  if (triglycerides != null) {
    if (triglycerides >= 200) risk += 15;
    else if (triglycerides >= 150) risk += 8;
  }
  return Math.round(Math.min(95, risk));
}

export function verdictFromScore(score: number): { verdict: string; level: LiverHealthStatus } {
  if (score >= 85) return { verdict: 'EXCELLENT — MAINTAIN LIFESTYLE', level: 'optimal' };
  if (score >= 70) return { verdict: 'GOOD — NEEDS ATTENTION', level: 'caution' };
  if (score >= 55) return { verdict: 'MODERATE RISK — ACTION ADVISED', level: 'high' };
  return { verdict: 'HIGH RISK — URGENT FOLLOW-UP', level: 'critical' };
}
