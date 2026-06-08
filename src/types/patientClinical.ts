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

export interface PatientClinicalContext {
  orders: LiverCareOrder[];
  payments: PatientPaymentRecord[];
  pathologyReports: LabReportUpload[];
  scans: FibrosisScanRecord[];
}

export type PatientDetailTab = 'profile' | 'orders' | 'payments';

export const PATIENT_DETAIL_TABS: { value: PatientDetailTab; label: string }[] = [
  { value: 'profile', label: 'Profile' },
  { value: 'orders', label: 'Orders' },
  { value: 'payments', label: 'Payments' },
];
