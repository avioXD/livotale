import { MOCK_SEED_PATIENT_ID } from '@/services/auth/auth.mock';
import { MOCK_LIVER_ORDERS } from '@/services/liverCare/liverCare.mock';
import { MOCK_FIBROSIS_SCANS } from '@/services/liverCare/technicianOrder.mock';
import { MOCK_LAB_REPORTS } from '@/services/liverCare/pathology.mock';
import type { PatientClinicalContext, PatientPaymentRecord } from '@/types/patientClinical';
import type { FibrosisScanRecord } from '@/types/fibrosisScan';
import type { LabReportUpload } from '@/types/labReport';
import type { LiverCareOrder } from '@/types/serviceOrder';

/** Map registry patient ids to liver-care order patient ids (mock only). */
const PATIENT_ID_ALIASES: Record<string, string[]> = {
  [MOCK_SEED_PATIENT_ID]: [MOCK_SEED_PATIENT_ID, 'demo-patient-rohan'],
};

function matchesPatientId(candidate: string, patientId: string): boolean {
  if (candidate === patientId) return true;
  const aliases = PATIENT_ID_ALIASES[patientId] ?? [patientId];
  return aliases.includes(candidate);
}

function ordersForPatient(patientId: string): LiverCareOrder[] {
  return MOCK_LIVER_ORDERS.filter((o) => matchesPatientId(o.patientId, patientId)).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function paymentsFromOrders(orders: LiverCareOrder[]): PatientPaymentRecord[] {
  return orders.map((o) => ({
    orderId: o.id,
    orderNumber: o.orderNumber,
    packageName: o.packageName,
    amount: o.finalAmount,
    paymentMode: o.paymentMode,
    paymentStatus: o.paymentStatus,
    paidAt: o.paymentStatus === 'success' ? o.updatedAt : null,
  }));
}

function pathologyForPatient(patientId: string, orderIds: string[]): LabReportUpload[] {
  return Object.values(MOCK_LAB_REPORTS).filter(
    (r) => matchesPatientId(r.patientId, patientId) || orderIds.includes(r.orderId),
  );
}

function scansForPatient(patientId: string, orderIds: string[]): FibrosisScanRecord[] {
  return Object.values(MOCK_FIBROSIS_SCANS).filter(
    (s) => matchesPatientId(s.patientId, patientId) || orderIds.includes(s.orderId),
  );
}

export function getMockPatientClinicalContext(patientId: string): PatientClinicalContext {
  const orders = ordersForPatient(patientId);
  const orderIds = orders.map((o) => o.id);
  return {
    orders,
    payments: paymentsFromOrders(orders),
    pathologyReports: pathologyForPatient(patientId, orderIds),
    scans: scansForPatient(patientId, orderIds),
  };
}
