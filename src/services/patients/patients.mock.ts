import { MOCK_SEED_PATIENT_ID } from '@/services/auth/auth.mock';
import type {
  ListFetchParams,
  PaginatedResponse,
  Patient,
  PatientDashboardData,
  PatientDetail,
  PatientHistory,
  PatientListItem,
  PatientTrendPoint,
  TimelineEvent,
} from '@/types';
import type { PatientAppointmentRecord, PatientVisitRecord } from '@/types/patientProfile';
import { mapListItemToPatient } from '@/types/patients';

export { MOCK_SEED_PATIENT_ID };

function daysFromNow(days: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysAgo(days: number, hour = 11, minute = 0) {
  return daysFromNow(-days, hour, minute);
}

export function getMockPatientDetail(patientId: string): PatientDetail {
  const isSeed = patientId === MOCK_SEED_PATIENT_ID;
  return {
    patient: {
      id: patientId,
      patient_code: isSeed ? 'MR-21847' : `MR-${patientId.slice(-4)}`,
      full_name: isSeed ? 'Rohan Mehta' : 'Demo Patient',
      email: isSeed ? 'rohan.mock@livotale.test' : 'patient@livotale.test',
      mobile: isSeed ? '+919900000001' : '+919900000099',
      gender: 'male',
      dob: '1984-03-12',
      height_cm: 168,
      current_weight_kg: 78.4,
      bmi: 27.8,
      diabetes: true,
      hypertension: true,
      alcohol_status: 'stopped',
      smoking_status: 'never',
      journey_status: 'visit_booked',
      occupation: 'Software Engineer',
      lifestyle_type: 'sedentary',
      food_preference: 'mixed',
      emergency_contact_name: 'Anita Mehta',
      emergency_contact_mobile: '+919900009999',
    },
    dashboard: null,
    summaryCard: {
      patientCode: isSeed ? 'MR-21847' : `MR-${patientId.slice(-4)}`,
      name: isSeed ? 'Rohan Mehta' : 'Demo Patient',
      ageGender: '42/male',
      bmi: 27.8,
      riskCategory: 'Moderate',
      diagnosis: '6-Month Liver Care Package',
      diabetes: 'Yes',
      alcohol: 'stopped',
      latestLiverFibrosisScanKpa: 8.2,
      latestAlt: 68,
      currentPlan: '6-Month Liver Care Package',
      liverScore: 62,
      fibrosisStage: 'F2',
      alerts: ['High ALT', 'Diabetes'],
      journeyStatus: 'visit_booked',
    },
    addresses: [
      {
        id: 'addr-mock-1',
        line1: 'A-1402, Lodha Park',
        line2: 'Lower Parel',
        pincode: '400013',
        city_name: 'Mumbai',
        is_default: true,
      },
    ],
    allergyAlerts: [
      {
        id: 'allergy-mock-1',
        allergen_name: 'Penicillin',
        allergy_type: 'drug',
        severity: 'moderate',
        alert_flag: true,
      },
    ],
  };
}

export function getMockPatientDashboard(patientId: string): PatientDashboardData {
  const trends: PatientTrendPoint[] = [
    { patient_id: patientId, snapshot_date: daysAgo(90).slice(0, 10), weight_kg: 80.2, bmi: 28.4, sgpt: 72, liverFibrosisScanKpa: 8.8, liver_score: 58 },
    { patient_id: patientId, snapshot_date: daysAgo(60).slice(0, 10), weight_kg: 79.5, bmi: 28.1, sgpt: 70, liverFibrosisScanKpa: 8.5, liver_score: 60 },
    { patient_id: patientId, snapshot_date: daysAgo(30).slice(0, 10), weight_kg: 78.9, bmi: 27.9, sgpt: 68, liverFibrosisScanKpa: 8.2, liver_score: 62 },
    { patient_id: patientId, snapshot_date: daysAgo(7).slice(0, 10), weight_kg: 78.4, bmi: 27.8, sgpt: 68, liverFibrosisScanKpa: 8.2, liver_score: 62 },
  ];
  return {
    kpis: {
      liverScore: 62,
      riskScore: 48,
      complianceScore: 78,
      bmi: 27.8,
      weightKg: 78.4,
      heightCm: 168,
      latestLiverFibrosisScanKpa: 8.2,
      latestCapDbm: 268,
      fibrosisStage: 'F2',
      steatosisGrade: 'S2',
      sgpt: 68,
      sgot: 52,
      hba1c: 6.4,
      triglycerides: 185,
      activePackage: '6-Month Liver Care Package',
      packageStart: daysAgo(60).slice(0, 10),
      packageEnd: daysFromNow(120).slice(0, 10),
      dietCompliance: 82,
      exerciseCompliance: 65,
      medicineCompliance: 88,
      scoreCalculatedAt: daysAgo(2),
      homeVisitsTotal: 3,
      homeVisitsCompleted: 2,
      prescriptionsTotal: 2,
      prescriptionsApproved: 1,
    },
    trends,
    compliance: [
      {
        checkinWeekStart: daysAgo(21).slice(0, 10),
        weightKg: 79.1,
        dietCompliancePercent: 80,
        exerciseCompliancePercent: 60,
        medicineCompliancePercent: 85,
        alcoholIntake: 'none',
        submittedAt: daysAgo(21),
      },
      {
        checkinWeekStart: daysAgo(14).slice(0, 10),
        weightKg: 78.7,
        dietCompliancePercent: 85,
        exerciseCompliancePercent: 70,
        medicineCompliancePercent: 90,
        alcoholIntake: 'none',
        submittedAt: daysAgo(14),
      },
    ],
  };
}

export function getMockPatientTimeline(_patientId: string): TimelineEvent[] {
  return [
    {
      id: 'tl-1',
      occurred_at: daysAgo(12),
      activity_type: 'home_visit_completed',
      role: 'technician',
      description: 'Liver Fibrosis Scan and blood sample collected at home.',
    },
    {
      id: 'tl-2',
      occurred_at: daysAgo(10),
      activity_type: 'lab_report_uploaded',
      role: 'lab',
      description: 'Comprehensive liver panel results uploaded.',
    },
    {
      id: 'tl-3',
      occurred_at: daysAgo(8),
      activity_type: 'doctor_consultation',
      role: 'doctor',
      description: 'Teleconsultation with Dr. Anuradha Iyer — lifestyle plan updated.',
    },
    {
      id: 'tl-4',
      occurred_at: daysAgo(2),
      activity_type: 'appointment_booked',
      role: 'patient',
      description: 'Clinic follow-up booked for next week.',
    },
  ];
}

export function getMockPatientTrends(patientId: string): PatientTrendPoint[] {
  return getMockPatientDashboard(patientId).trends;
}

export function getMockPatientHistory(_patientId: string): PatientHistory {
  return {
    conditions: [
      { id: 'c1', condition_code: 'diabetes', condition_name: 'Type 2 Diabetes', is_present: true, control_status: 'moderate' },
      { id: 'c2', condition_code: 'hypertension', condition_name: 'Hypertension', is_present: true, control_status: 'controlled' },
      { id: 'c3', condition_code: 'dyslipidemia', condition_name: 'Dyslipidemia', is_present: true, control_status: 'moderate' },
      { id: 'c4', condition_code: 'nafld', condition_name: 'NAFLD / MASLD', is_present: true, control_status: 'active' },
    ],
    liverHistory: {
      fatty_liver: { diagnosed: 'yes', grade: 'grade_2' },
      fibrosis: { stage: 'F2', kpa: 8.2 },
      alcohol_history: { consumption: 'stopped', durationYears: 8 },
    },
    medications: [
      { id: 'm1', medicine_name: 'Metformin', dose: '500 mg', frequency: 'Twice daily', is_current: true },
      { id: 'm2', medicine_name: 'Atorvastatin', dose: '10 mg', frequency: 'Once daily', is_current: true },
      { id: 'm3', medicine_name: 'Vitamin D3', dose: '60k IU', frequency: 'Weekly', is_current: true },
    ],
    allergies: [
      { id: 'a1', allergen_name: 'Penicillin', allergy_type: 'drug', severity: 'moderate', alert_flag: true, reaction_type: 'rash' },
    ],
    surgeries: [],
    vaccinations: [
      { id: 'v1', vaccine_name: 'Hepatitis B', vaccination_date: '2020-06-15', dose_number: 3 },
    ],
    familyMembers: [
      { id: 'f1', full_name: 'Anita Mehta', relationship: 'mother', notes: 'Type 2 diabetes' },
    ],
    defaultConditionCodes: [
      { code: 'diabetes', name: 'Type 2 Diabetes' },
      { code: 'hypertension', name: 'Hypertension' },
    ],
  };
}

export function getMockPatientAppointments(_patientId: string): PatientAppointmentRecord[] {
  return [
    {
      id: 'appt-mock-001',
      appointmentCode: 'APT-2026-0142',
      typeName: 'Doctor Consultation',
      visitMode: 'clinic',
      status: 'doctor_assigned',
      scheduledStart: daysFromNow(2, 9, 0),
      scheduledEnd: daysFromNow(2, 9, 30),
      doctorName: 'Dr. Anuradha Iyer',
      chiefComplaint: 'Elevated liver enzymes, fatigue',
      paymentStatus: 'paid',
    },
    {
      id: 'appt-mock-002',
      appointmentCode: 'APT-2026-0098',
      typeName: 'Teleconsultation',
      visitMode: 'tele',
      status: 'confirmed',
      scheduledStart: daysFromNow(5, 14, 0),
      scheduledEnd: daysFromNow(5, 14, 30),
      doctorName: 'Dr. Rajesh Kumar',
      chiefComplaint: 'Follow-up on Liver Fibrosis Scan results',
      paymentStatus: 'paid',
    },
    {
      id: 'appt-mock-003',
      appointmentCode: 'APT-2026-0061',
      typeName: 'Home Visit',
      visitMode: 'home',
      status: 'completed',
      scheduledStart: daysAgo(12, 10, 0),
      scheduledEnd: daysAgo(12, 11, 30),
      doctorName: 'Dr. Anuradha Iyer',
      technicianName: 'Ravi Sharma',
      chiefComplaint: 'Liver Fibrosis Scan + blood draw',
      paymentStatus: 'paid',
    },
    {
      id: 'appt-mock-004',
      appointmentCode: 'APT-2026-0033',
      typeName: 'Clinic Visit',
      visitMode: 'clinic',
      status: 'completed',
      scheduledStart: daysAgo(28, 15, 0),
      scheduledEnd: daysAgo(28, 15, 45),
      doctorName: 'Dr. Meera Shah',
      paymentStatus: 'paid',
    },
  ];
}

export function getMockPatientVisits(_patientId: string): PatientVisitRecord[] {
  return [
    {
      id: 'visit-mock-001',
      visitType: 'home_visit',
      status: 'completed',
      scheduledAt: daysAgo(12, 10, 0),
      completedAt: daysAgo(12, 11, 25),
      technicianName: 'Ravi Sharma',
      addressSummary: 'A-1402, Lodha Park, Lower Parel, 400013',
      preferredTimeSlot: 'morning',
      checklistCompleted: 5,
      checklistTotal: 5,
    },
    {
      id: 'visit-mock-002',
      visitType: 'Liver Fibrosis Scan',
      status: 'completed',
      scheduledAt: daysAgo(45, 14, 0),
      completedAt: daysAgo(45, 14, 50),
      technicianName: 'Priya Nair',
      addressSummary: 'A-1402, Lodha Park, Lower Parel, 400013',
      preferredTimeSlot: 'afternoon',
      checklistCompleted: 3,
      checklistTotal: 3,
    },
    {
      id: 'visit-mock-003',
      visitType: 'blood_sample_collection',
      status: 'booked',
      scheduledAt: daysFromNow(7, 9, 0),
      technicianName: 'Ravi Sharma',
      addressSummary: 'A-1402, Lodha Park, Lower Parel, 400013',
      preferredTimeSlot: 'morning',
      checklistCompleted: 0,
      checklistTotal: 4,
    },
  ];
}

export function mergeMockPatientDetail(
  patientId: string,
  payload: Record<string, unknown>,
): PatientDetail {
  const detail = getMockPatientDetail(patientId);
  const patient = { ...detail.patient };
  const address: Record<string, unknown> = detail.addresses[0]
    ? { ...detail.addresses[0] }
    : { id: 'addr-mock-1', is_default: true };

  if (payload.fullName !== undefined) patient.full_name = payload.fullName;
  if (payload.mobile !== undefined) patient.mobile = payload.mobile;
  if (payload.email !== undefined) patient.email = payload.email;
  if (payload.dob !== undefined) patient.dob = payload.dob;
  if (payload.gender !== undefined) patient.gender = payload.gender;
  if (payload.heightCm !== undefined) patient.height_cm = payload.heightCm;
  if (payload.weightKg !== undefined) patient.current_weight_kg = payload.weightKg;
  if (payload.occupation !== undefined) patient.occupation = payload.occupation;
  if (payload.emergencyContactName !== undefined) patient.emergency_contact_name = payload.emergencyContactName;
  if (payload.emergencyContactMobile !== undefined) patient.emergency_contact_mobile = payload.emergencyContactMobile;
  if (payload.addressLine1 !== undefined) address.line1 = payload.addressLine1;
  if (payload.addressLine2 !== undefined) address.line2 = payload.addressLine2;
  if (payload.pincode !== undefined) address.pincode = payload.pincode;

  const height = Number(patient.height_cm);
  const weight = Number(patient.current_weight_kg);
  if (height && weight) {
    patient.bmi = Number((weight / ((height / 100) ** 2)).toFixed(1));
  }

  const summaryCard = { ...detail.summaryCard };
  if (payload.fullName !== undefined) summaryCard.name = String(payload.fullName ?? '');
  if (payload.gender !== undefined || payload.dob !== undefined) {
    const dob = patient.dob ? new Date(String(patient.dob)) : null;
    const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
    summaryCard.ageGender = age ? `${age}/${patient.gender}` : String(patient.gender ?? '—');
  }
  if (patient.bmi) summaryCard.bmi = Number(patient.bmi);

  return {
    ...detail,
    patient,
    summaryCard,
    addresses: [address],
  };
}

const MOCK_PATIENT_LIST: PatientListItem[] = [
  {
    patient_id: MOCK_SEED_PATIENT_ID,
    patient_code: 'MR-21847',
    full_name: 'Rohan Mehta',
    primary_doctor_id: '00000000-0000-4000-8000-000000000102',
    liver_score: 62,
    risk_score: 48,
    latest_fibroscan_kpa: 8.2,
    sgpt: 68,
    active_package_name: '6-Month Liver Care Package',
    score_calculated_at: daysAgo(2),
    bmi: 27.8,
  },
  {
    patient_id: '00000000-0000-4000-8000-000000000202',
    patient_code: 'MR-21848',
    full_name: 'Priya Nair',
    liver_score: 71,
    risk_score: 35,
    latest_fibroscan_kpa: 6.1,
    sgpt: 42,
    active_package_name: '3-Month Liver Wellness',
    score_calculated_at: daysAgo(5),
    bmi: 24.2,
  },
  {
    patient_id: '00000000-0000-4000-8000-000000000203',
    patient_code: 'MR-21849',
    full_name: 'Amit Shah',
    liver_score: 55,
    risk_score: 62,
    latest_fibroscan_kpa: 9.4,
    sgpt: 78,
    active_package_name: '6-Month Liver Care Package',
    score_calculated_at: daysAgo(1),
    bmi: 29.1,
  },
  {
    patient_id: '00000000-0000-4000-8000-000000000204',
    patient_code: 'MR-21850',
    full_name: 'Sneha Rao',
    liver_score: 68,
    risk_score: 41,
    latest_fibroscan_kpa: 7.0,
    sgpt: 55,
    active_package_name: 'Fibroscan Follow-up',
    score_calculated_at: daysAgo(8),
    bmi: 26.4,
  },
];

export function mockListPatients(
  params: ListFetchParams<Record<string, unknown>>,
): PaginatedResponse<Patient> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  let rows = [...MOCK_PATIENT_LIST];
  if (params.search) {
    const q = params.search.toLowerCase();
    rows = rows.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.patient_code.toLowerCase().includes(q),
    );
  }
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);
  return {
    data: slice.map(mapListItemToPatient),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function mockUpdatePatientHistorySection(
  patientId: string,
  section: string,
  payload: Record<string, unknown>,
): PatientHistory {
  const history = getMockPatientHistory(patientId);
  if (section === 'conditions' && Array.isArray(payload.conditions)) {
    return { ...history, conditions: payload.conditions as Record<string, unknown>[] };
  }
  if (section === 'medications' && Array.isArray(payload.medications)) {
    return { ...history, medications: payload.medications as Record<string, unknown>[] };
  }
  if (section === 'allergies' && Array.isArray(payload.allergies)) {
    return { ...history, allergies: payload.allergies as Record<string, unknown>[] };
  }
  return { ...history, ...payload };
}
