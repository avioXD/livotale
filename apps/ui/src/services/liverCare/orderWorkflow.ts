import type { LiverCareOrder, OrderStatus } from '@/types/serviceOrder';
import type { LiverCarePackage } from '@/types/package';

export interface PackageWorkflowFlags {
  pathology: boolean;
  consultation: boolean;
}

export function getPackageFlags(pkg: Pick<LiverCarePackage, 'pathologyIncluded' | 'consultationIncluded'>): PackageWorkflowFlags {
  return {
    pathology: pkg.pathologyIncluded,
    consultation: pkg.consultationIncluded,
  };
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'draft',
  'created',
  'payment_pending',
  'payment_completed',
  'technician_assigned',
  'scan_scheduled',
  'scan_in_progress',
  'scan_completed',
  'pathology_pending',
  'lab_report_uploaded',
  'ai_extraction_pending',
  'ai_extraction_completed',
  'report_review_pending',
  'final_report_generated',
  'doctor_assignment_pending',
  'doctor_assigned',
  'consultation_pending',
  'prescription_pending',
  'prescription_generated',
  'completed',
];

export type OrderWorkflowEvent =
  | 'submit'
  | 'request_payment'
  | 'payment_completed'
  | 'assign_technician'
  | 'schedule_scan'
  | 'start_scan'
  | 'complete_scan'
  | 'assign_lab'
  | 'upload_lab_report'
  | 'trigger_ai'
  | 'verify_ai'
  | 'generate_report'
  | 'assign_doctor'
  | 'schedule_consultation'
  | 'complete_consultation'
  | 'publish_prescription'
  | 'complete'
  | 'cancel';

const TRANSITIONS: Partial<Record<OrderStatus, Partial<Record<OrderWorkflowEvent, OrderStatus>>>> = {
  draft: { submit: 'created', cancel: 'cancelled' },
  created: { request_payment: 'payment_pending', payment_completed: 'payment_completed', cancel: 'cancelled' },
  payment_pending: { payment_completed: 'payment_completed', cancel: 'cancelled' },
  payment_completed: { assign_technician: 'technician_assigned', cancel: 'cancelled' },
  technician_assigned: { schedule_scan: 'scan_scheduled' },
  scan_scheduled: { start_scan: 'scan_in_progress' },
  scan_in_progress: { complete_scan: 'scan_completed' },
  scan_completed: { assign_lab: 'pathology_pending', trigger_ai: 'ai_extraction_pending', generate_report: 'report_review_pending' },
  pathology_pending: { upload_lab_report: 'lab_report_uploaded' },
  lab_report_uploaded: { trigger_ai: 'ai_extraction_pending' },
  ai_extraction_pending: { verify_ai: 'ai_extraction_completed' },
  ai_extraction_completed: { generate_report: 'report_review_pending' },
  report_review_pending: { generate_report: 'final_report_generated' },
  final_report_generated: { assign_doctor: 'doctor_assignment_pending', complete: 'completed' },
  doctor_assignment_pending: { assign_doctor: 'doctor_assigned' },
  doctor_assigned: { schedule_consultation: 'consultation_pending' },
  consultation_pending: { complete_consultation: 'prescription_pending' },
  prescription_pending: { publish_prescription: 'prescription_generated' },
  prescription_generated: { complete: 'completed' },
};

export function canTransition(order: LiverCareOrder, event: OrderWorkflowEvent, flags: PackageWorkflowFlags): boolean {
  const next = TRANSITIONS[order.orderStatus]?.[event];
  if (!next) return false;

  if (event === 'assign_lab' && !flags.pathology) return false;
  if (event === 'assign_doctor' && !flags.consultation) return false;
  if (event === 'complete' && order.orderStatus === 'scan_completed' && flags.pathology) return false;
  if (event === 'complete' && order.orderStatus === 'final_report_generated' && flags.consultation) return false;

  return true;
}

export function applyTransition(order: LiverCareOrder, event: OrderWorkflowEvent, flags: PackageWorkflowFlags): LiverCareOrder {
  if (!canTransition(order, event, flags)) {
    throw new Error(`Cannot apply "${event}" from status "${order.orderStatus}"`);
  }
  const nextStatus = TRANSITIONS[order.orderStatus]![event]!;
  return { ...order, orderStatus: nextStatus, updatedAt: new Date().toISOString() };
}

export function getApplicableEvents(order: LiverCareOrder, flags: PackageWorkflowFlags): OrderWorkflowEvent[] {
  const events = Object.keys(TRANSITIONS[order.orderStatus] ?? {}) as OrderWorkflowEvent[];
  return events.filter((e) => canTransition(order, e, flags));
}

export function skipPathologyStatuses(flags: PackageWorkflowFlags): OrderStatus[] {
  if (flags.pathology) return [];
  return ['pathology_pending', 'lab_report_uploaded'];
}

export function getOrderProgressSteps(flags: PackageWorkflowFlags): OrderStatus[] {
  let steps = ORDER_STATUS_FLOW.filter((s) => s !== 'draft' && s !== 'cancelled');
  if (!flags.pathology) {
    steps = steps.filter((s) => !skipPathologyStatuses(flags).includes(s));
  }
  if (!flags.consultation) {
    steps = steps.filter(
      (s) =>
        ![
          'doctor_assignment_pending',
          'doctor_assigned',
          'consultation_pending',
          'prescription_pending',
          'prescription_generated',
        ].includes(s),
    );
  }
  return steps;
}
