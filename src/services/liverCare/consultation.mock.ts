import type { Consultation, ConsultationVisitLog, LiverCarePrescription } from '@/types/consultation';

export const MOCK_DOCTOR_ID = 'doc-1';
export const MOCK_DOCTOR_NAME = 'Dr. Meera Iyer';

const now = Date.now();
const days = (n: number) => new Date(now - n * 86400000).toISOString();
const future = (n: number) => new Date(now + n * 86400000).toISOString();

export const MOCK_CONSULTATIONS: Record<string, Consultation> = {
  'lco-3': {
    id: 'con-lco-3',
    orderId: 'lco-3',
    patientId: 'demo-patient-1',
    doctorId: MOCK_DOCTOR_ID,
    doctorName: MOCK_DOCTOR_NAME,
    consultationType: 'video',
    scheduledAt: future(2),
    meetingLink: 'https://meet.livotale.demo/consult-lco-3',
    status: 'consultation_scheduled',
    doctorNotes: null,
    symptoms: 'Mild fatigue, occasional right upper quadrant discomfort after meals.',
    followUpAt: future(30),
    createdBy: 'operations',
    createdAt: days(2),
    updatedAt: days(1),
  },
  'lco-11': {
    id: 'con-lco-11',
    orderId: 'lco-11',
    patientId: 'demo-patient-4',
    doctorId: MOCK_DOCTOR_ID,
    doctorName: MOCK_DOCTOR_NAME,
    consultationType: 'video',
    scheduledAt: days(3),
    meetingLink: 'https://meet.livotale.demo/consult-lco-11',
    status: 'prescription_published',
    doctorNotes: 'Stable fibrosis markers. Continue lifestyle measures.',
    symptoms: 'Resolved abdominal discomfort. Energy levels improving.',
    visitCompletedAt: days(2),
    followUpAt: future(90),
    createdBy: 'operations',
    createdAt: days(14),
    updatedAt: days(1),
  },
};

export const MOCK_VISIT_LOGS: Record<string, ConsultationVisitLog[]> = {
  'lco-3': [
    {
      id: 'visit-lco-3-1',
      orderId: 'lco-3',
      consultationId: 'con-lco-3',
      visitType: 'initial',
      visitNumber: 1,
      scheduledAt: future(2),
      visitCompletedAt: null,
      followUpAt: future(30),
      symptoms: 'Mild fatigue, occasional right upper quadrant discomfort after meals.',
      doctorNotes: null,
      status: 'scheduled',
      prescriptionId: null,
      createdAt: days(2),
      updatedAt: days(1),
    },
  ],
  'lco-11': [
    {
      id: 'visit-lco-11-1',
      orderId: 'lco-11',
      consultationId: 'con-lco-11',
      visitType: 'initial',
      visitNumber: 1,
      scheduledAt: days(3),
      visitCompletedAt: days(2),
      followUpAt: future(90),
      symptoms: 'Resolved abdominal discomfort. Energy levels improving.',
      doctorNotes: 'Stable fibrosis markers. Continue lifestyle measures.',
      status: 'prescription_published',
      prescriptionId: 'rx-lco-11-v1',
      createdAt: days(14),
      updatedAt: days(1),
    },
    {
      id: 'visit-lco-11-2',
      orderId: 'lco-11',
      consultationId: 'con-lco-11',
      visitType: 'follow_up',
      visitNumber: 2,
      scheduledAt: future(60),
      visitCompletedAt: null,
      followUpAt: future(150),
      symptoms: null,
      doctorNotes: null,
      status: 'scheduled',
      prescriptionId: null,
      createdAt: days(1),
      updatedAt: days(1),
    },
  ],
};

export const MOCK_PRESCRIPTIONS: Record<string, LiverCarePrescription[]> = {
  'lco-11': [
    {
      id: 'rx-lco-11-v1',
      orderId: 'lco-11',
      visitLogId: 'visit-lco-11-1',
      patientId: 'demo-patient-4',
      consultationId: 'con-lco-11',
      doctorId: MOCK_DOCTOR_ID,
      doctorName: MOCK_DOCTOR_NAME,
      doctorDegree: 'MD, DM (Hepatology)',
      doctorRegistration: 'MMC-45821',
      status: 'published',
      diagnosis: 'Non-alcoholic fatty liver disease (NAFLD), early fibrosis',
      clinicalNotes: 'Patient tolerating scan and pathology well. No acute decompensation.',
      symptoms: 'Resolved abdominal discomfort. Energy levels improving.',
      visitDate: days(2),
      followUpDate: future(90),
      medicines: [
        {
          id: 'med-1',
          name: 'Ursodeoxycholic acid',
          strength: '300 mg',
          form: 'tablet',
          dosage: '1 tablet',
          frequency: 'Twice daily',
          timing: 'after_food',
          duration: '3 months',
          instruction: 'Take with meals',
        },
        {
          id: 'med-2',
          name: 'Vitamin E',
          strength: '400 IU',
          form: 'capsule',
          dosage: '1 capsule',
          frequency: 'Once daily',
          timing: 'after_food',
          duration: '3 months',
        },
      ],
      dietAdvice: 'Mediterranean-style diet. Limit refined carbs and sugary drinks. Avoid alcohol.',
      lifestyleAdvice: '150 minutes moderate aerobic activity per week. Target 5–7% weight loss if overweight.',
      followUpAdvice: 'Repeat fibrosis scan in 12 months. Liver panel in 6 months.',
      warningSigns: 'Seek urgent care for jaundice, abdominal swelling, vomiting blood, or confusion.',
      pdfUrl: '/mock/pdf/prescription/lco-11.pdf',
      fileId: 'file-rx-lco-11',
      publishedAt: days(1),
      version: 1,
      createdAt: days(2),
      updatedAt: days(1),
    },
  ],
};

export function getPrescriptionsForOrder(orderId: string): LiverCarePrescription[] {
  return MOCK_PRESCRIPTIONS[orderId] ?? [];
}

export function getLatestPrescriptionForOrder(orderId: string): LiverCarePrescription | null {
  const list = getPrescriptionsForOrder(orderId);
  if (!list.length) return null;
  return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

export function getPrescriptionForVisit(orderId: string, visitLogId: string): LiverCarePrescription | null {
  return getPrescriptionsForOrder(orderId).find((rx) => rx.visitLogId === visitLogId) ?? null;
}

export function getVisitLogsForOrder(orderId: string): ConsultationVisitLog[] {
  return [...(MOCK_VISIT_LOGS[orderId] ?? [])].sort((a, b) => a.visitNumber - b.visitNumber);
}
