import type { LiverCarePrescription } from '@/types/consultation';
import type { ConsultationQueueRow, ConsultationQueueStage } from '@/types/consultationQueue';
import type { LiverCarePackage } from '@/types/package';
import type { LiverCareOrder, OrderStatus } from '@/types/serviceOrder';

export interface ConsultationQueueFilters {
  search?: string;
  orderStatus?: string;
  stage?: string;
}

const CONSULTATION_QUEUE_STATUSES: OrderStatus[] = [
  'final_report_generated',
  'doctor_assignment_pending',
  'doctor_assigned',
  'consultation_pending',
  'prescription_pending',
  'prescription_generated',
  'completed',
];

export function consultationPackageIdSet(packages: LiverCarePackage[]): Set<string> {
  return new Set(packages.filter((p) => p.consultationIncluded).map((p) => p.id));
}

export function deriveConsultationStage(
  order: LiverCareOrder,
  prescription?: LiverCarePrescription | null,
): ConsultationQueueStage {
  return deriveConsultationStageFromFields({
    orderStatus: order.orderStatus,
    doctorId: order.doctorId ?? null,
    consultationScheduledAt: order.consultationScheduledAt ?? null,
    prescriptionStatus: prescription?.status ?? null,
  });
}

export function deriveConsultationStageFromFields(input: {
  orderStatus: OrderStatus;
  doctorId?: string | null;
  consultationScheduledAt?: string | null;
  prescriptionStatus?: LiverCarePrescription['status'] | null;
}): ConsultationQueueStage {
  if (input.orderStatus === 'completed') return 'completed';
  if (input.orderStatus === 'prescription_generated' || input.prescriptionStatus === 'published') {
    return 'prescription_ready';
  }
  if (input.orderStatus === 'prescription_pending') return 'prescription_pending';
  if (input.orderStatus === 'consultation_pending' || input.consultationScheduledAt) return 'scheduled';
  if (input.orderStatus === 'doctor_assigned' || (input.doctorId && !input.consultationScheduledAt)) {
    return 'doctor_assigned';
  }
  return 'awaiting_doctor';
}

/** Maps `/admin/consultations/queue` API rows into UI queue rows. */
export function mapConsultationQueueApiRow(raw: {
  orderId: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  packageCode?: string | null;
  orderStatus: OrderStatus;
  doctorId?: string | null;
  doctorName?: string | null;
  consultationScheduledAt?: string | null;
  consultationPatientPreferredAt?: string | null;
  consultationTimeSlot?: string | null;
  prescriptionStatus?: LiverCarePrescription['status'] | null;
  updatedAt: string;
}): ConsultationQueueRow {
  const stage = deriveConsultationStageFromFields(raw);

  return {
    id: raw.orderId,
    orderId: raw.orderId,
    orderNumber: raw.orderNumber,
    patientId: raw.patientId,
    patientName: raw.patientName,
    packageCode: raw.packageCode ?? '—',
    doctorId: raw.doctorId ?? null,
    doctorName: raw.doctorName ?? null,
    consultationScheduledAt: raw.consultationScheduledAt ?? null,
    consultationPatientPreferredAt: raw.consultationPatientPreferredAt ?? null,
    consultationTimeSlot: raw.consultationTimeSlot ?? null,
    orderStatus: raw.orderStatus,
    stage,
    prescriptionStatus: raw.prescriptionStatus ?? null,
    updatedAt: raw.updatedAt,
  };
}

export function buildConsultationQueueRow(
  order: LiverCareOrder,
  prescription?: LiverCarePrescription | null,
): ConsultationQueueRow {
  const stage = deriveConsultationStage(order, prescription);

  return {
    id: `cqr-${order.id}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    patientId: order.patientId,
    patientName: order.patientName,
    packageCode: order.packageCode,
    doctorId: order.doctorId ?? null,
    doctorName: order.doctorName ?? null,
    consultationScheduledAt: order.consultationScheduledAt ?? null,
    orderStatus: order.orderStatus,
    stage,
    prescriptionStatus: prescription?.status ?? null,
    updatedAt: prescription?.updatedAt ?? order.updatedAt,
  };
}

export function buildConsultationQueueRows(
  orders: LiverCareOrder[],
  consultationPackageIds: Set<string>,
  prescriptions: Record<string, LiverCarePrescription[]>,
): ConsultationQueueRow[] {
  return orders
    .filter(
      (o) =>
        consultationPackageIds.has(o.packageId) &&
        CONSULTATION_QUEUE_STATUSES.includes(o.orderStatus) &&
        o.orderStatus !== 'cancelled' &&
        o.orderStatus !== 'draft',
    )
    .map((order) => {
      const list = prescriptions[order.id] ?? [];
      const latest = list.length
        ? [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
        : null;
      return buildConsultationQueueRow(order, latest);
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function filterConsultationQueueRows(
  rows: ConsultationQueueRow[],
  filters: ConsultationQueueFilters,
): ConsultationQueueRow[] {
  let list = rows;
  if (filters.orderStatus) {
    list = list.filter((r) => r.orderStatus === filters.orderStatus);
  }
  if (filters.stage) {
    list = list.filter((r) => r.stage === filters.stage);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter((r) => {
      const hay = [
        r.orderNumber,
        r.patientName,
        r.packageCode,
        r.doctorName,
        r.orderStatus,
        r.stage,
        r.prescriptionStatus,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }
  return list;
}

export const CONSULTATION_STAGE_LABELS: Record<ConsultationQueueStage, string> = {
  awaiting_doctor: 'Assign doctor',
  doctor_assigned: 'Schedule consultation',
  scheduled: 'Consultation scheduled',
  prescription_pending: 'Awaiting prescription',
  prescription_ready: 'Prescription published',
  completed: 'Completed',
};
