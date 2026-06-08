import { MOCK_SEED_PATIENT_ID } from '@/services/auth/auth.mock';
import { getMockPatientDashboard } from '@/services/patients/patients.mock';
import type {
  AiAssessment,
  BookVisitPayload,
  HomeVisit,
  JourneyState,
  OnboardingPayload,
  PatientAddress,
  PatientDashboardData,
  PendingPrescription,
  Questionnaire,
  QuestionnaireAnswerInput,
  ReportUploadPayload,
  TechnicianVisit,
  VisitDetail,
} from '@/types';

function daysFromNow(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function daysAgo(days: number, hour = 10): string {
  return daysFromNow(-days, hour);
}

let onboardingComplete = true;
let journeyStatus = 'visit_booked';

let mockAddresses: PatientAddress[] = [
  {
    id: 'addr-mock-1',
    line1: 'A-1402, Lodha Park',
    line2: 'Lower Parel',
    pincode: '400013',
    isDefault: true,
  },
];

let mockHomeVisits: HomeVisit[] = [
  {
    id: 'visit-mock-001',
    visit_type: 'home_fibroscan',
    scheduled_at: daysAgo(12, 10),
    status: 'completed',
    line1: 'A-1402, Lodha Park',
    line2: 'Lower Parel',
    pincode: '400013',
    technician_name: 'Vinod K.',
  },
  {
    id: 'visit-mock-002',
    visit_type: 'blood_sample_collection',
    scheduled_at: daysFromNow(7, 9),
    status: 'booked',
    line1: 'A-1402, Lodha Park',
    line2: 'Lower Parel',
    pincode: '400013',
    technician_name: 'Vinod K.',
  },
];

const MOCK_ASSESSMENT: AiAssessment = {
  id: 'ai-assess-1',
  risk_score: 48,
  risk_category: 'Moderate',
  diagnosis_summary: 'MASLD with moderate fibrosis risk. Lifestyle intervention recommended.',
  package_name: '6-Month Liver Care Package',
  package_code: 'liver_care_6m',
  duration_days: 180,
  recommendations: [
    {
      id: 'rec-1',
      recommendation_type: 'diet',
      title: 'Reduce refined carbohydrates',
      description: 'Target < 150g carbs/day with emphasis on whole grains.',
      severity: 'moderate',
      metadata: {},
    },
    {
      id: 'rec-2',
      recommendation_type: 'exercise',
      title: 'Aerobic activity 150 min/week',
      description: 'Brisk walking or cycling at moderate intensity.',
      severity: 'low',
      metadata: {},
    },
  ],
  generated_at: daysAgo(45),
};

let mockPendingPrescriptions: PendingPrescription[] = [
  {
    prescription_id: 'rx-pending-1',
    patient_id: MOCK_SEED_PATIENT_ID,
    patient_name: 'Rohan Mehta',
    patient_code: 'MR-21847',
    diagnosis: 'MASLD with F2 fibrosis',
    diet_plan: 'Mediterranean diet, low refined carbs',
    exercise_plan: '150 min/week moderate activity',
    monitoring_plan: 'Repeat LFT in 6 weeks',
    status: 'pending_review',
    prescription_type: 'ai_draft',
    created_at: daysAgo(2),
  },
];

export function mockGetOnboardingStatus() {
  return {
    onboardingComplete,
    journeyStatus,
    currentStep: onboardingComplete ? 'dashboard' : 'health_profile',
  };
}

export function mockGetDashboardAnalytics(): PatientDashboardData {
  return getMockPatientDashboard(MOCK_SEED_PATIENT_ID);
}

export function mockGetJourney(): JourneyState {
  return {
    onboardingComplete,
    currentStep: onboardingComplete ? 'dashboard' : 'health_profile',
    patient: {
      id: MOCK_SEED_PATIENT_ID,
      journey_status: journeyStatus as JourneyState['patient']['journey_status'],
      journey_timestamps: {
        registered: daysAgo(60),
        ai_screened: daysAgo(55),
        visit_booked: daysAgo(14),
        visit_completed: daysAgo(12),
      },
      full_name: 'Rohan Mehta',
      email: 'rohan.mock@livotale.test',
      mobile: '+919900000001',
      gender: 'male',
      dob: '1984-03-12',
      diabetes: true,
      hypertension: true,
      dyslipidemia: true,
      viral_hepatitis: false,
      alcohol_status: 'stopped',
    },
    assessment: MOCK_ASSESSMENT,
    visits: [...mockHomeVisits],
    addresses: [...mockAddresses],
    draftPrescription: { id: 'rx-pending-1', status: 'pending_review' },
  };
}

export function mockGetQuestionnaire(code: string): Questionnaire {
  return {
    id: `q-${code}`,
    code,
    title: 'Liver Health Pre-screening',
    version: '1.0',
    questions: [
      {
        id: 'qq-1',
        questionText: 'Do you have diabetes?',
        questionType: 'boolean',
        options: [],
        riskWeight: 2,
        sortOrder: 1,
        isRequired: true,
      },
      {
        id: 'qq-2',
        questionText: 'How often do you consume alcohol?',
        questionType: 'single_choice',
        options: [
          { value: 'never', label: 'Never' },
          { value: 'occasional', label: 'Occasional' },
          { value: 'regular', label: 'Regular' },
        ],
        riskWeight: 3,
        sortOrder: 2,
        isRequired: true,
      },
    ],
  };
}

export function mockSubmitQuestionnaire(_code: string, _answers: QuestionnaireAnswerInput[]) {
  return { submitted: true, riskScore: 48 };
}

export function mockCompleteOnboarding(payload: OnboardingPayload) {
  onboardingComplete = true;
  journeyStatus = 'ai_screened';
  if (payload.address) {
    mockAddresses = [
      {
        id: 'addr-mock-1',
        line1: payload.address.line1,
        line2: payload.address.line2 ?? null,
        pincode: payload.address.pincode ?? null,
        isDefault: true,
      },
    ];
  }
  return mockGetJourney();
}

export function mockUploadReport(_payload: ReportUploadPayload) {
  return { uploaded: true, reportId: `report-${Date.now()}` };
}

export function mockRunPreScreen() {
  journeyStatus = 'ai_screened';
  return { assessment: MOCK_ASSESSMENT };
}

export function mockGetAssessment(): AiAssessment | null {
  return { ...MOCK_ASSESSMENT };
}

export function mockListAddresses(): PatientAddress[] {
  return [...mockAddresses];
}

export function mockListHomeVisits(): HomeVisit[] {
  return [...mockHomeVisits];
}

export function mockBookHomeVisit(payload: BookVisitPayload): HomeVisit {
  const address = mockAddresses.find((a) => a.id === payload.addressId) ?? mockAddresses[0];
  const visit: HomeVisit = {
    id: `visit-mock-${Date.now()}`,
    visit_type: payload.visitType ?? 'home_fibroscan',
    scheduled_at: payload.scheduledAt,
    status: 'booked',
    line1: address.line1,
    line2: address.line2,
    pincode: address.pincode,
    technician_name: 'Vinod K.',
  };
  mockHomeVisits = [visit, ...mockHomeVisits];
  journeyStatus = 'visit_booked';
  return { ...visit };
}

export function mockGetPendingPrescriptions(): PendingPrescription[] {
  return [...mockPendingPrescriptions];
}

export function mockGetPrescription(id: string) {
  const rx = mockPendingPrescriptions.find((p) => p.prescription_id === id);
  if (!rx) throw new Error('Prescription not found');
  return {
    ...rx,
    diet_plan: rx.diet_plan ?? '',
    exercise_plan: rx.exercise_plan ?? '',
    monitoring_plan: rx.monitoring_plan ?? '',
    items: [
      { name: 'Metformin', dose: '500 mg', frequency: 'Twice daily' },
      { name: 'Vitamin E', dose: '400 IU', frequency: 'Once daily' },
    ],
  };
}

export function mockApprovePrescription(id: string, doctorNotes?: string) {
  mockPendingPrescriptions = mockPendingPrescriptions.filter((p) => p.prescription_id !== id);
  journeyStatus = 'prescription_approved';
  return { approved: true, doctorNotes };
}

export function mockEditPrescription(id: string, payload: Record<string, unknown>) {
  const idx = mockPendingPrescriptions.findIndex((p) => p.prescription_id === id);
  if (idx < 0) throw new Error('Prescription not found');
  mockPendingPrescriptions[idx] = { ...mockPendingPrescriptions[idx], ...payload } as PendingPrescription;
  return mockPendingPrescriptions[idx];
}

export function mockGetTechnicianVisitsToday(): TechnicianVisit[] {
  return [
    {
      visit_id: 'visit-mock-002',
      patient_name: 'Rohan Mehta',
      patient_code: 'MR-21847',
      scheduled_at: daysFromNow(0, 9),
      status: 'booked',
      line1: 'A-1402, Lodha Park',
      pincode: '400013',
    },
    {
      visit_id: 'visit-mock-003',
      patient_name: 'Priya Nair',
      patient_code: 'MR-21848',
      scheduled_at: daysFromNow(0, 11),
      status: 'booked',
      line1: '44 Turner Road, Bandra',
      pincode: '400013',
    },
  ];
}

export function mockGetTechnicianVisit(id: string): VisitDetail {
  return {
    visit_id: id,
    patient_name: 'Rohan Mehta',
    patient_code: 'MR-21847',
    scheduled_at: daysFromNow(0, 9),
    status: 'booked',
    line1: 'A-1402, Lodha Park',
    pincode: '400013',
    checklist: [
      { code: 'consent', title: 'Patient consent captured', status: 'pending' },
      { code: 'vitals', title: 'Vitals recorded', status: 'pending' },
      { code: 'fibroscan', title: 'Liver Fibrosis Scan performed', status: 'pending' },
      { code: 'sample', title: 'Blood sample collected', status: 'pending' },
    ],
    vitals: null,
    liverFibrosisScanResults: [],
    samples: [],
  };
}

export function mockCaptureConsent(visitId: string) {
  return { visitId, captured: true };
}

export function mockCaptureVitals(visitId: string, payload: Record<string, unknown>) {
  return { visitId, vitals: payload };
}

export function mockCaptureLiverFibrosisScan(visitId: string, payload: Record<string, unknown>) {
  return { visitId, liverFibrosisScan: { liver_stiffness_kpa: 8.2, cap_dbm: 268, ...payload } };
}

export function mockCollectSample(visitId: string, payload: Record<string, unknown>) {
  return { visitId, sample: payload };
}

export function mockCompleteVisit(visitId: string) {
  journeyStatus = 'visit_completed';
  return { visitId, status: 'completed' };
}
