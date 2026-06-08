export type SampleDispatchStatus =
  | 'not_required'
  | 'pending_dispatch'
  | 'dispatched'
  | 'received_at_lab'
  | 'awaiting_report'
  | 'report_uploaded'
  | 'cancelled';

export interface SampleDispatch {
  id: string;
  orderId: string;
  partnerLabId: string;
  partnerLabName: string;
  status: SampleDispatchStatus;
  dispatchedBy?: string | null;
  dispatchedAt?: string | null;
  receivedAtLabAt?: string | null;
  awaitingReportSince?: string | null;
  courierRef?: string | null;
  notes?: string | null;
  updatedAt: string;
}

export const SAMPLE_DISPATCH_LABELS: Record<SampleDispatchStatus, string> = {
  not_required: 'Not required',
  pending_dispatch: 'Pending dispatch',
  dispatched: 'Sample sent to lab',
  received_at_lab: 'Received at partner lab',
  awaiting_report: 'Awaiting report (email)',
  report_uploaded: 'Report uploaded',
  cancelled: 'Cancelled',
};
