import type { PrescriptionStatus } from '@/types/consultation';
import type { OrderStatus } from '@/types/serviceOrder';

export type ConsultationQueueStage =
  | 'awaiting_doctor'
  | 'doctor_assigned'
  | 'scheduled'
  | 'prescription_pending'
  | 'prescription_ready'
  | 'completed';

export interface ConsultationQueueRow {
  id: string;
  orderId: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  packageCode: string;
  doctorId: string | null;
  doctorName: string | null;
  consultationScheduledAt: string | null;
  consultationPatientPreferredAt?: string | null;
  consultationTimeSlot?: string | null;
  orderStatus: OrderStatus;
  stage: ConsultationQueueStage;
  prescriptionStatus: PrescriptionStatus | null;
  updatedAt: string;
}
