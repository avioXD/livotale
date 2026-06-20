import type { FibrosisScanRecord } from './fibrosisScan';
import type { LabReportUpload } from './labReport';
import type { LiverCareOrder, LiverCarePaymentStatus } from './serviceOrder';

export interface PatientPaymentRecord {
  orderId: string;
  orderNumber: string;
  packageName: string;
  amount: number;
  paymentMode: string | null;
  paymentStatus: LiverCarePaymentStatus;
  paidAt?: string | null;
}

export interface PatientAppointmentRecord {
  orderId: string;
  orderNumber: string;
  packageName: string;
  scheduledAt?: string | null;
  status: string;
  doctorName?: string | null;
}

export interface PatientReportRecord {
  orderId: string;
  orderNumber: string;
  packageName: string;
  orderStatus: string;
}

export interface PatientClinicalContext {
  orders: LiverCareOrder[];
  payments: PatientPaymentRecord[];
  pathologyReports: LabReportUpload[];
  scans: FibrosisScanRecord[];
  appointments: PatientAppointmentRecord[];
  reports: PatientReportRecord[];
}

export type PatientDetailTab =
  | 'profile'
  | 'orders'
  | 'payments'
  | 'appointments'
  | 'tests'
  | 'scans'
  | 'reports';

export const PATIENT_DETAIL_TABS: { value: PatientDetailTab; label: string }[] = [
  { value: 'profile', label: 'Profile' },
  { value: 'orders', label: 'Orders' },
  { value: 'payments', label: 'Payments' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'tests', label: 'Tests' },
  { value: 'scans', label: 'Scans' },
  { value: 'reports', label: 'Reports' },
];
