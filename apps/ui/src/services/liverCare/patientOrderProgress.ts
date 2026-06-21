import type { LiverCareOrder, OrderStatus } from '@/types/serviceOrder';
import { ORDER_STATUS_FLOW } from '@/services/liverCare/orderWorkflow';

export type PatientProgressStepState = 'completed' | 'current' | 'pending';

export interface PatientProgressStep {
  id: string;
  label: string;
  state: PatientProgressStepState;
}

export interface PatientOrderProgressFlags {
  pathology: boolean;
  consultation: boolean;
}

export function getPatientOrderFlags(order: LiverCareOrder): PatientOrderProgressFlags {
  const code = order.packageCode?.toUpperCase() ?? '';
  return {
    pathology: code === 'PKG-2' || code === 'PKG-3',
    consultation: code === 'PKG-3',
  };
}

function statusIndex(status: OrderStatus): number {
  const idx = ORDER_STATUS_FLOW.indexOf(status);
  return idx >= 0 ? idx : 0;
}

function atOrPast(order: LiverCareOrder, milestone: OrderStatus): boolean {
  return statusIndex(order.orderStatus) >= statusIndex(milestone);
}

function buildStepDefinitions(flags: PatientOrderProgressFlags): { id: string; label: string }[] {
  const steps = [
    { id: 'payment', label: 'Payment' },
    { id: 'scan', label: 'Scan visit' },
  ];
  if (flags.pathology) steps.push({ id: 'pathology', label: 'Pathology' });
  steps.push({ id: 'report', label: 'Report' });
  if (flags.consultation) {
    steps.push({ id: 'consult', label: 'Consultation' });
    steps.push({ id: 'prescription', label: 'Prescription' });
  }
  steps.push({ id: 'done', label: 'Complete' });
  return steps;
}

function isStepCompleted(order: LiverCareOrder, stepId: string): boolean {
  switch (stepId) {
    case 'payment':
      return order.paymentStatus === 'success';
    case 'scan':
      return atOrPast(order, 'scan_completed');
    case 'pathology':
      return atOrPast(order, 'lab_report_uploaded') || atOrPast(order, 'ai_extraction_pending');
    case 'report':
      return atOrPast(order, 'final_report_generated');
    case 'consult':
      return atOrPast(order, 'prescription_pending');
    case 'prescription':
      return atOrPast(order, 'prescription_generated') || order.orderStatus === 'completed';
    case 'done':
      return order.orderStatus === 'completed';
    default:
      return false;
  }
}

function resolveCurrentStepId(order: LiverCareOrder, flags: PatientOrderProgressFlags): string {
  const defs = buildStepDefinitions(flags);
  for (const def of defs) {
    if (!isStepCompleted(order, def.id)) return def.id;
  }
  return 'done';
}

export function getPatientOrderProgressSteps(order: LiverCareOrder): PatientProgressStep[] {
  const flags = getPatientOrderFlags(order);
  const defs = buildStepDefinitions(flags);
  const currentId = resolveCurrentStepId(order, flags);

  return defs.map((def) => {
    const completed = isStepCompleted(order, def.id);
    let state: PatientProgressStepState = 'pending';
    if (completed) state = 'completed';
    else if (def.id === currentId) state = 'current';
    return { ...def, state };
  });
}

export type PatientNextAction =
  | { type: 'pay'; order: LiverCareOrder; label: string; href: string }
  | { type: 'schedule_scan'; order: LiverCareOrder; label: string; href: string }
  | { type: 'schedule_pathology'; order: LiverCareOrder; label: string; href: string }
  | { type: 'schedule_consult'; order: LiverCareOrder; label: string; href: string }
  | { type: 'view_report'; order: LiverCareOrder; label: string; href: string }
  | { type: 'view_prescription'; order: LiverCareOrder; label: string; href: string }
  | { type: 'view_order'; order: LiverCareOrder; label: string; href: string }
  | { type: 'none' };

export function getPatientNextAction(order: LiverCareOrder): PatientNextAction {
  const base = `/patient/orders/${order.id}`;

  if (order.paymentStatus !== 'success') {
    return { type: 'pay', order, label: 'Complete payment', href: `${base}/pay` };
  }

  if (!atOrPast(order, 'scan_completed') && !order.scanPatientPreferredAt && !order.scanScheduledAt) {
    return { type: 'schedule_scan', order, label: 'Schedule your scan visit', href: `${base}?focus=scan-schedule` };
  }

  const flags = getPatientOrderFlags(order);
  if (
    flags.pathology &&
    !order.pathologyPatientPreferredAt &&
    !order.pathologyScheduledAt &&
    atOrPast(order, 'scan_completed') &&
    !atOrPast(order, 'lab_report_uploaded')
  ) {
    return { type: 'schedule_pathology', order, label: 'Schedule pathology sample collection', href: base };
  }

  if (atOrPast(order, 'final_report_generated')) {
    if (flags.consultation && !order.consultationScheduledAt && !order.consultationPatientPreferredAt) {
      return { type: 'schedule_consult', order, label: 'Book your consultation', href: base };
    }
    if (atOrPast(order, 'prescription_generated')) {
      return {
        type: 'view_prescription',
        order,
        label: 'View your prescription',
        href: `${base}/prescription`,
      };
    }
    return { type: 'view_report', order, label: 'View your health report', href: `${base}/report` };
  }

  if (order.orderStatus === 'completed') {
    return { type: 'none' };
  }

  return { type: 'view_order', order, label: 'Track your order', href: base };
}

export function getMostUrgentPatientAction(orders: LiverCareOrder[]): PatientNextAction {
  const priority: PatientNextAction['type'][] = [
    'pay',
    'schedule_scan',
    'schedule_pathology',
    'schedule_consult',
    'view_report',
    'view_prescription',
    'view_order',
  ];

  for (const p of priority) {
    const match = orders.map(getPatientNextAction).find((a) => a.type === p);
    if (match && match.type !== 'none') return match;
  }
  return { type: 'none' };
}
