export interface PatientListItem {
  patient_id: string;
  patient_code: string;
  full_name: string;
  primary_doctor_id?: string | null;
  liver_score?: number | null;
  risk_score?: number | null;
  latest_fibroscan_kpa?: number | null;
  sgpt?: number | null;
  active_package_name?: string | null;
  score_calculated_at?: string | null;
  bmi?: number | null;
}

/** @deprecated Use PatientListItem — kept for list store compatibility */
export interface Patient {
  id: string;
  patientCode: string;
  fullName: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'pending';
  assignedDoctor?: string;
  lastVisit?: string;
  bmi?: number | null;
  riskScore?: number | null;
  liverScore?: number | null;
}

export interface PatientSummaryCard {
  patientCode: string;
  name: string;
  ageGender: string;
  bmi: number | null;
  riskCategory: string;
  diagnosis: string;
  diabetes: string;
  alcohol: string;
  latestLiverFibrosisScanKpa: number | null;
  latestAlt: number | null;
  currentPlan: string | null;
  liverScore: number | null;
  fibrosisStage: string | null;
  alerts: string[];
  journeyStatus: string;
}

export interface PatientDetail {
  patient: Record<string, unknown>;
  dashboard: Record<string, unknown> | null;
  summaryCard: PatientSummaryCard;
  addresses: Record<string, unknown>[];
  allergyAlerts: Record<string, unknown>[];
}

export interface PatientTrendPoint {
  patient_id: string;
  snapshot_date: string;
  weight_kg?: number | null;
  bmi?: number | null;
  sgpt?: number | null;
  sgot?: number | null;
  hba1c?: number | null;
  triglycerides?: number | null;
  liverFibrosisScanKpa?: number | null;
  cap_dbm?: number | null;
  liver_score?: number | null;
  compliance_score?: number | null;
}

export interface PatientDashboardKpis {
  liverScore: number | null;
  riskScore: number | null;
  complianceScore: number | null;
  bmi: number | null;
  weightKg: number | null;
  heightCm: number | null;
  latestLiverFibrosisScanKpa: number | null;
  latestCapDbm: number | null;
  fibrosisStage: string | null;
  steatosisGrade: string | null;
  sgpt: number | null;
  sgot: number | null;
  hba1c: number | null;
  triglycerides: number | null;
  activePackage: string | null;
  packageStart: string | null;
  packageEnd: string | null;
  dietCompliance: number | null;
  exerciseCompliance: number | null;
  medicineCompliance: number | null;
  scoreCalculatedAt: string | null;
  homeVisitsTotal: number;
  homeVisitsCompleted: number;
  prescriptionsTotal: number;
  prescriptionsApproved: number;
}

export interface PatientCompliancePoint {
  checkinWeekStart: string;
  weightKg: number | null;
  dietCompliancePercent: number | null;
  exerciseCompliancePercent: number | null;
  medicineCompliancePercent: number | null;
  alcoholIntake: string;
  submittedAt: string;
}

export interface PatientDashboardData {
  kpis: PatientDashboardKpis;
  trends: PatientTrendPoint[];
  compliance: PatientCompliancePoint[];
}

export interface TimelineEvent {
  id?: string;
  occurred_at: string;
  activity_type: string;
  role?: string | null;
  description: string;
  event_category?: string;
  status?: string | null;
  source?: string;
}

export interface PatientHistory {
  conditions: Record<string, unknown>[];
  liverHistory: Record<string, unknown> | null;
  medications: Record<string, unknown>[];
  allergies: Record<string, unknown>[];
  surgeries: Record<string, unknown>[];
  vaccinations: Record<string, unknown>[];
  familyMembers: Record<string, unknown>[];
  defaultConditionCodes: { code: string; name: string }[];
}

export interface DashboardOverview {
  stats: {
    activePatients: number;
    visitsToday: number;
    pendingPrescriptions: number;
    highRiskPatients: number;
  };
  charts: {
    patientsByCity: { city_name: string; patients: number }[];
    clinicTrends: {
      snapshot_date: string;
      avg_bmi: number | null;
      avg_alt: number | null;
      avg_liver_fibrosis_scan: number | null;
    }[];
  };
}

export interface PatientFilters extends Record<string, unknown> {
  status: '' | 'active' | 'inactive' | 'pending';
  assignedDoctor: string;
}

export const DEFAULT_PATIENT_FILTERS: PatientFilters = {
  status: '',
  assignedDoctor: '',
};

export function mapListItemToPatient(row: PatientListItem): Patient {
  return {
    id: row.patient_id,
    patientCode: row.patient_code,
    fullName: row.full_name,
    status: 'active',
    bmi: row.bmi,
    riskScore: row.risk_score,
    liverScore: row.liver_score,
    lastVisit: row.score_calculated_at ?? undefined,
  };
}
