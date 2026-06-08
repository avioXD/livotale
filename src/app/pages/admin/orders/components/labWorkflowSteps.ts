import type { AIExtractionJob } from '@/types/aiExtraction';
import type { LabReportUpload } from '@/types/labReport';
import type { SampleDispatch } from '@/types/sampleDispatch';
import type { LiverCareOrder } from '@/types/serviceOrder';

export const LAB_WORKFLOW_STEP_LABELS = [
  'Assign lab partner',
  'Collect blood sample',
  'Submit blood sample to lab',
  'Lab receives sample & testing',
  'Awaiting report (email)',
  'Upload lab PDF',
  'AI extraction review',
  'Livotale letterhead PDF',
] as const;

export type LabWorkflowStepState = 'done' | 'current' | 'pending';

export interface LabWorkflowStep {
  label: (typeof LAB_WORKFLOW_STEP_LABELS)[number];
  state: LabWorkflowStepState;
}

const LETTERHEAD_DONE_STATUSES = new Set<LiverCareOrder['orderStatus']>([
  'final_report_generated',
  'doctor_assignment_pending',
  'doctor_assigned',
  'consultation_pending',
  'prescription_pending',
  'prescription_generated',
  'completed',
]);

const AI_VERIFIED_STATUSES = new Set<LiverCareOrder['orderStatus']>([
  'report_review_pending',
  'final_report_generated',
  'doctor_assignment_pending',
  'doctor_assigned',
  'consultation_pending',
  'prescription_pending',
  'prescription_generated',
  'completed',
]);

const DISPATCH_PROGRESSION: SampleDispatch['status'][] = [
  'pending_dispatch',
  'sample_collected',
  'dispatched',
  'received_at_lab',
  'awaiting_report',
  'report_uploaded',
];

function dispatchAtLeast(status: SampleDispatch['status'] | undefined, min: SampleDispatch['status']): boolean {
  if (!status) return false;
  return DISPATCH_PROGRESSION.indexOf(status) >= DISPATCH_PROGRESSION.indexOf(min);
}

export function getLabWorkflowSteps(input: {
  order: LiverCareOrder;
  dispatch: SampleDispatch | null;
  report: LabReportUpload | null;
  aiJob: AIExtractionJob | null;
}): LabWorkflowStep[] {
  const { order, dispatch, report, aiJob } = input;

  const completed = [
    Boolean(order.partnerLabId),
    dispatchAtLeast(dispatch?.status, 'sample_collected'),
    dispatchAtLeast(dispatch?.status, 'dispatched'),
    dispatchAtLeast(dispatch?.status, 'received_at_lab'),
    dispatchAtLeast(dispatch?.status, 'awaiting_report') || Boolean(report),
    Boolean(report),
    report?.finalStatus === 'verified' ||
      aiJob?.status === 'verified' ||
      AI_VERIFIED_STATUSES.has(order.orderStatus),
    LETTERHEAD_DONE_STATUSES.has(order.orderStatus),
  ];

  const firstPending = completed.findIndex((done) => !done);
  const currentIndex = firstPending === -1 ? completed.length - 1 : firstPending;

  return LAB_WORKFLOW_STEP_LABELS.map((label, index) => ({
    label,
    state: completed[index]
      ? 'done'
      : index === currentIndex
        ? 'current'
        : 'pending',
  }));
}
