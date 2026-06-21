import type { SampleCollectionStatus } from '@/types/sampleCollection';

export interface PipelineStage {
  status: SampleCollectionStatus;
  label: string;
  phase: 'Order' | 'Field' | 'Handover' | 'Lab' | 'Approval';
}

/** Main happy-path stages shown in the admin pipeline stepper. */
export const SAMPLE_PIPELINE_STAGES: PipelineStage[] = [
  { status: 'sample_id_generated', label: 'Sample ID', phase: 'Order' },
  { status: 'pending_technician_assignment', label: 'Pending assign', phase: 'Order' },
  { status: 'assigned', label: 'Assigned', phase: 'Field' },
  { status: 'accepted', label: 'Accepted', phase: 'Field' },
  { status: 'travel_started', label: 'In transit', phase: 'Field' },
  { status: 'reached_location', label: 'At location', phase: 'Field' },
  { status: 'collection_started', label: 'Collecting', phase: 'Field' },
  { status: 'sample_collected', label: 'Collected', phase: 'Field' },
  { status: 'sample_image_uploaded', label: 'Photo uploaded', phase: 'Field' },
  { status: 'pending_lab_handover', label: 'Pending handover', phase: 'Handover' },
  { status: 'handed_over_to_lab', label: 'At lab courier', phase: 'Handover' },
  { status: 'received_by_lab', label: 'Lab received', phase: 'Lab' },
  { status: 'testing_in_progress', label: 'Testing', phase: 'Lab' },
  { status: 'report_uploaded', label: 'Report ready', phase: 'Lab' },
  { status: 'pending_approval', label: 'Pending approval', phase: 'Approval' },
  { status: 'approved', label: 'Approved', phase: 'Approval' },
  { status: 'published_to_patient', label: 'Published', phase: 'Approval' },
  { status: 'completed', label: 'Completed', phase: 'Approval' },
];

const STAGE_INDEX = new Map(SAMPLE_PIPELINE_STAGES.map((s, i) => [s.status, i]));

const STATUS_ALIASES: Partial<Record<SampleCollectionStatus, SampleCollectionStatus>> = {
  testing_started: 'testing_in_progress',
};

export type StageVisualState = 'complete' | 'current' | 'upcoming' | 'skipped';

export function resolvePipelineIndex(status: SampleCollectionStatus): number {
  const normalized = STATUS_ALIASES[status] ?? status;
  const direct = STAGE_INDEX.get(normalized);
  if (direct != null) return direct;

  if (status === 'rejected_by_lab' || status === 'recollection_required') {
    return STAGE_INDEX.get('received_by_lab') ?? 0;
  }
  if (status === 'failed' || status === 'cancelled') {
    return STAGE_INDEX.get('assigned') ?? 0;
  }
  return 0;
}

export function getStageVisualState(
  stageStatus: SampleCollectionStatus,
  currentStatus: SampleCollectionStatus,
): StageVisualState {
  const currentIdx = resolvePipelineIndex(currentStatus);
  const stageIdx = STAGE_INDEX.get(stageStatus);
  if (stageIdx == null) return 'skipped';

  if (['failed', 'cancelled', 'rejected_by_lab', 'recollection_required'].includes(currentStatus)) {
    if (stageIdx < currentIdx) return 'complete';
    if (stageIdx === currentIdx) return 'current';
    return 'upcoming';
  }

  if (stageIdx < currentIdx) return 'complete';
  if (stageIdx === currentIdx) return 'current';
  return 'upcoming';
}

export function formatSampleStatus(status: string): string {
  return status.replace(/_/g, ' ');
}
