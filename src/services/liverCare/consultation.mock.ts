import type { Consultation, LiverCarePrescription } from '@/types/consultation';

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
    followUpAt: future(30),
    createdBy: 'operations',
    createdAt: days(2),
    updatedAt: days(1),
  },
};

export const MOCK_PRESCRIPTIONS: Record<string, LiverCarePrescription> = {};
