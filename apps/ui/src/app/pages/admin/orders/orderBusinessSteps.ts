import type { LiverCarePackage } from '@/types/package';
import type { LiverCareOrder, OrderStatus } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';

/** Ops-facing workflow steps (package-pruned). */
export type OrderBusinessStepId =
  | 'payment'
  | 'scan'
  | 'lab'
  | 'report'
  | 'consultation'
  | 'complete';

export type OrderStepUiState = 'completed' | 'active' | 'upcoming';

export interface OrderBusinessStepConfig {
  id: OrderBusinessStepId;
  label: string;
  shortLabel: string;
  owner: string;
  /** Why this step appears — tied to package flags / checklist. */
  packageReason?: string;
}

export interface PackageWorkflowSummary {
  packageCode: string;
  stepCount: number;
  includesScan: boolean;
  includesPathology: boolean;
  includesConsultation: boolean;
  stepLabels: string[];
}

const STEP_META: Record<OrderBusinessStepId, Omit<OrderBusinessStepConfig, 'id'>> = {
  payment: { label: 'Order & payment', shortLabel: 'Payment', owner: 'Operations' },
  scan: { label: 'Fibrosis scan', shortLabel: 'Scan', owner: 'Technician' },
  lab: { label: 'Lab report', shortLabel: 'Lab report', owner: 'Operations' },
  report: { label: 'Letterhead report', shortLabel: 'Report', owner: 'Operations' },
  consultation: { label: 'Consultation & Rx', shortLabel: 'Consult', owner: 'Doctor' },
  complete: { label: 'Complete', shortLabel: 'Done', owner: 'Operations' },
};

function stepConfig(id: OrderBusinessStepId, pkg: LiverCarePackage | null): OrderBusinessStepConfig {
  const base = { id, ...STEP_META[id] };
  if (id === 'scan' && pkg?.fibrosisScanIncluded) {
    return { ...base, packageReason: 'Fibrosis scan included in package' };
  }
  if (id === 'lab' && pkg?.pathologyIncluded) {
    return { ...base, packageReason: 'Pathology included in package' };
  }
  if (id === 'consultation' && pkg?.consultationIncluded) {
    return { ...base, packageReason: 'Doctor consultation included in package' };
  }
  if (id === 'report') {
    return { ...base, packageReason: 'Letterhead report included in all packages' };
  }
  if (id === 'payment') {
    return { ...base, packageReason: 'Order & payment — all packages' };
  }
  return base;
}

/** Business steps derived from package flags (`fibrosisScanIncluded`, `pathologyIncluded`, `consultationIncluded`). */
export function getBusinessStepsForPackage(pkg: LiverCarePackage | null): OrderBusinessStepConfig[] {
  const ids: OrderBusinessStepId[] = ['payment'];

  if (pkg?.fibrosisScanIncluded !== false) {
    ids.push('scan');
  }
  if (pkg?.pathologyIncluded) {
    ids.push('lab');
  } else {
    ids.push('report');
  }
  if (pkg?.consultationIncluded) {
    ids.push('consultation');
  }
  ids.push('complete');

  return ids.map((id) => stepConfig(id, pkg));
}

export function getPackageWorkflowSummary(pkg: LiverCarePackage | null): PackageWorkflowSummary {
  const steps = getBusinessStepsForPackage(pkg);
  return {
    packageCode: pkg?.code ?? '—',
    stepCount: steps.length,
    includesScan: pkg?.fibrosisScanIncluded !== false,
    includesPathology: Boolean(pkg?.pathologyIncluded),
    includesConsultation: Boolean(pkg?.consultationIncluded),
    stepLabels: steps.map((s) => s.shortLabel),
  };
}

/** True when this workflow step is part of the order's package definition. */
export function isStepInPackage(stepId: OrderBusinessStepId, pkg: LiverCarePackage | null): boolean {
  return getBusinessStepsForPackage(pkg).some((s) => s.id === stepId);
}

const SCAN_STATUSES: OrderStatus[] = [
  'payment_completed',
  'technician_assigned',
  'scan_scheduled',
  'scan_in_progress',
];

const LAB_STATUSES: OrderStatus[] = ['pathology_pending'];

const LAB_REPORT_STATUSES: OrderStatus[] = [
  'lab_report_uploaded',
  'ai_extraction_pending',
  'ai_extraction_completed',
];

const REPORT_STATUSES: OrderStatus[] = ['report_review_pending', 'final_report_generated'];

const CONSULT_STATUSES: OrderStatus[] = [
  'doctor_assignment_pending',
  'doctor_assigned',
  'consultation_pending',
  'prescription_pending',
  'prescription_generated',
];

function paymentComplete(order: LiverCareOrder): boolean {
  const paymentPhase: OrderStatus[] = ['draft', 'created', 'payment_pending'];
  if (paymentPhase.includes(order.orderStatus) && order.paymentStatus !== 'success') {
    return false;
  }
  return (
    order.paymentStatus === 'success' ||
    order.orderStatus === 'payment_completed' ||
    scanComplete(order)
  );
}

function scanComplete(order: LiverCareOrder): boolean {
  const afterScan: OrderStatus[] = [
    'scan_completed',
    ...LAB_STATUSES,
    ...LAB_REPORT_STATUSES,
    ...REPORT_STATUSES,
    ...CONSULT_STATUSES,
    'completed',
  ];
  return afterScan.includes(order.orderStatus);
}

function labComplete(order: LiverCareOrder): boolean {
  const afterLab: OrderStatus[] = [...REPORT_STATUSES, ...CONSULT_STATUSES, 'completed'];
  return afterLab.includes(order.orderStatus);
}

function reportComplete(order: LiverCareOrder, pkg: LiverCarePackage | null): boolean {
  if (pkg?.consultationIncluded) {
    return CONSULT_STATUSES.includes(order.orderStatus) || order.orderStatus === 'completed';
  }
  return order.orderStatus === 'completed' || order.orderStatus === 'final_report_generated';
}

function consultationComplete(order: LiverCareOrder): boolean {
  return order.orderStatus === 'completed' ||
    order.orderStatus === 'prescription_generated';
}

function isStepComplete(
  stepId: OrderBusinessStepId,
  order: LiverCareOrder,
  pkg: LiverCarePackage | null,
): boolean {
  if (order.orderStatus === 'cancelled') return false;
  if (stepId === 'complete') return order.orderStatus === 'completed';
  if (stepId === 'payment') return paymentComplete(order);
  if (stepId === 'scan') return scanComplete(order);
  if (stepId === 'lab') return labComplete(order);
  if (stepId === 'report') return reportComplete(order, pkg);
  if (stepId === 'consultation') return consultationComplete(order);
  return false;
}

/** First incomplete step = where ops work happens. */
export function getActiveBusinessStep(
  order: LiverCareOrder,
  pkg: LiverCarePackage | null,
): OrderBusinessStepId {
  if (order.orderStatus === 'completed') return 'complete';
  if (order.orderStatus === 'cancelled') return 'payment';

  const steps = getBusinessStepsForPackage(pkg);
  for (const step of steps) {
    if (!isStepComplete(step.id, order, pkg)) return step.id;
  }
  return 'complete';
}

export function getStepUiState(
  stepId: OrderBusinessStepId,
  order: LiverCareOrder,
  pkg: LiverCarePackage | null,
): OrderStepUiState {
  const steps = getBusinessStepsForPackage(pkg);
  const activeId = getActiveBusinessStep(order, pkg);
  const stepIdx = steps.findIndex((s) => s.id === stepId);
  const activeIdx = steps.findIndex((s) => s.id === activeId);

  if (stepIdx < 0) return 'upcoming';
  if (stepIdx < activeIdx || isStepComplete(stepId, order, pkg)) return 'completed';
  if (stepId === activeId) return 'active';
  return 'upcoming';
}

export function canOpenStep(
  stepId: OrderBusinessStepId,
  order: LiverCareOrder,
  pkg: LiverCarePackage | null,
): boolean {
  const state = getStepUiState(stepId, order, pkg);
  return state === 'active' || state === 'completed';
}

export function parseOrderStep(
  stepParam: string | null,
  tabLegacy: string | null,
): OrderBusinessStepId | null {
  const raw = stepParam ?? mapLegacyTabToStep(tabLegacy);
  if (!raw) return null;
  const valid: OrderBusinessStepId[] = [
    'payment', 'scan', 'lab', 'report', 'consultation', 'complete',
  ];
  if (raw === 'pathology' || raw === 'lab-report' || raw === 'ai') return 'lab';
  if (valid.includes(raw as OrderBusinessStepId)) return raw as OrderBusinessStepId;
  return null;
}

function mapLegacyTabToStep(tab: string | null): string | null {
  if (!tab || tab === 'overview' || tab === 'activity') return null;
  if (tab === 'pathology') return 'lab';
  return tab;
}

export function stepStatusHint(
  stepId: OrderBusinessStepId,
  order: LiverCareOrder,
): string | null {
  if (stepId === 'payment' && order.paymentStatus !== 'success') {
    return `Payment: ${order.paymentStatus}`;
  }
  if (stepId === 'scan' && order.orderStatus in ORDER_STATUS_LABELS) {
    if (SCAN_STATUSES.includes(order.orderStatus) || order.orderStatus === 'scan_completed') {
      return ORDER_STATUS_LABELS[order.orderStatus];
    }
  }
  return ORDER_STATUS_LABELS[order.orderStatus] ?? null;
}
