export type JourneyStatus =
  | 'registered'
  | 'ai_screened'
  | 'visit_booked'
  | 'visit_in_progress'
  | 'visit_completed'
  | 'draft_prescription'
  | 'awaiting_doctor_review'
  | 'prescription_approved';

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionnaireQuestion {
  id: string;
  questionText: string;
  questionType: 'boolean' | 'single_choice' | 'multi_choice' | 'text' | 'number' | 'date';
  options: QuestionOption[];
  riskWeight: number;
  sortOrder: number;
  isRequired: boolean;
}

export interface Questionnaire {
  id: string;
  code: string;
  title: string;
  version: string;
  questions: QuestionnaireQuestion[];
}

export interface QuestionnaireAnswerInput {
  questionId: string;
  answer: string | boolean;
}

export interface PatientAddress {
  id: string;
  line1: string;
  line2: string | null;
  pincode: string | null;
  isDefault: boolean;
}

export interface AiRecommendation {
  id: string;
  recommendation_type: string;
  title: string;
  description: string | null;
  severity: string;
  metadata: Record<string, unknown>;
}

export interface AiAssessment {
  id: string;
  risk_score: number;
  risk_category: string;
  diagnosis_summary: string;
  package_name?: string;
  package_code?: string;
  duration_days?: number;
  recommendations: AiRecommendation[];
  generated_at: string;
}

export interface HomeVisit {
  id: string;
  visit_type: string;
  scheduled_at: string;
  status: string;
  line1: string;
  line2: string | null;
  pincode: string | null;
  technician_name: string | null;
}

export interface JourneyState {
  onboardingComplete: boolean;
  currentStep?: string;
  patient: {
    id: string;
    journey_status: JourneyStatus;
    journey_timestamps: Record<string, string>;
    full_name: string;
    email: string | null;
    mobile: string | null;
    gender: string;
    dob: string | null;
    diabetes: boolean;
    hypertension: boolean;
    dyslipidemia: boolean;
    viral_hepatitis: boolean;
    alcohol_status: string;
  };
  assessment: AiAssessment | null;
  visits: HomeVisit[];
  addresses: PatientAddress[];
  draftPrescription: { id: string; status: string } | null;
}

export interface OnboardingPayload {
  address?: { line1: string; line2?: string; pincode?: string };
  diabetes?: boolean;
  hypertension?: boolean;
  dyslipidemia?: boolean;
  viralHepatitis?: boolean;
  alcoholStatus?: string;
  smokingStatus?: string;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  user?: { gender?: string; dob?: string };
}

export interface BookVisitPayload {
  addressId: string;
  scheduledAt: string;
  visitType?: string;
}

export interface ReportUploadPayload {
  fileName: string;
  mimeType: string;
  storageUrl?: string;
  reportType?: string;
  reportDate?: string;
  notes?: string;
}

export interface PendingPrescription {
  prescription_id: string;
  patient_id: string;
  patient_name: string;
  patient_code: string;
  diagnosis: string | null;
  diet_plan: string | null;
  exercise_plan: string | null;
  monitoring_plan: string | null;
  status: string;
  prescription_type: string;
  created_at: string;
}

export interface TechnicianVisit {
  visit_id: string;
  patient_name: string;
  patient_code: string;
  scheduled_at: string;
  status: string;
  line1: string;
  pincode: string | null;
}

export interface VisitDetail extends TechnicianVisit {
  checklist: Array<{ code: string; title: string; status: string }>;
  vitals: Record<string, unknown> | null;
  liverFibrosisScanResults: Array<Record<string, unknown>>;
  samples: Array<Record<string, unknown>>;
}
