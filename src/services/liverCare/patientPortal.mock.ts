import type { PatientNotification, PatientProfile } from '@/types/patientPortal';

const now = Date.now();
const days = (n: number) => new Date(now - n * 86400000).toISOString();

export const MOCK_PATIENT_PROFILES: Record<string, PatientProfile> = {
  'demo-patient-1': {
    patientId: 'demo-patient-1',
    phone: '9988776655',
    name: 'Anita Desai',
    email: 'anita.desai@example.com',
    city: 'Bangalore',
    dateOfBirth: '1985-03-14',
    updatedAt: days(1),
  },
  'demo-patient-rohan': {
    patientId: 'demo-patient-rohan',
    phone: '9900000001',
    name: 'Rohan Mehta',
    email: 'rohan.mehta@example.com',
    city: 'Mumbai',
    dateOfBirth: '1992-08-22',
    updatedAt: days(0),
  },
};

export const MOCK_PATIENT_NOTIFICATIONS: PatientNotification[] = [
  {
    id: 'pn-1',
    channel: 'whatsapp',
    title: 'Final report ready',
    body: 'Your liver care final report has been published. Log in to view and download.',
    orderId: 'lco-3',
    read: false,
    sentAt: days(2),
  },
  {
    id: 'pn-2',
    channel: 'in_app',
    title: 'Consultation scheduled',
    body: 'Your video consultation with Dr. Meera Iyer is scheduled. Check your order for the meeting link.',
    orderId: 'lco-3',
    read: false,
    sentAt: days(1),
  },
  {
    id: 'pn-3',
    channel: 'sms',
    title: 'Payment reminder',
    body: 'Your Liver Fibrosis Scan order payment is pending. Pay now via the patient portal.',
    orderId: 'lco-4',
    read: true,
    sentAt: days(0),
  },
  {
    id: 'pn-4',
    channel: 'email',
    title: 'Order confirmed',
    body: 'Thank you for choosing Livotale Liver Care. Your order has been created.',
    orderId: 'lco-4',
    read: true,
    sentAt: days(0),
  },
];
