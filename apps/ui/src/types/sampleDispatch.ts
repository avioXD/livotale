export type CollectionProofPhotoType =
  | 'order_id_label'
  | 'sample_tube'
  | 'technician_collector'
  | 'lab_handover'
  | 'container_label';

export interface CollectionProofPhoto {
  id: string;
  orderId: string;
  photoType: CollectionProofPhotoType;
  fileName: string;
  storageUrl?: string | null;
  createdAt: string;
}

export const COLLECTION_PHOTO_LABELS: Record<CollectionProofPhotoType, string> = {
  order_id_label: 'Tube label (order ID)',
  sample_tube: 'Sample tubes',
  technician_collector: 'Technician at collection',
  lab_handover: 'Handover at lab',
  container_label: 'Container label',
};

/** Photos required at patient home before marking sample collected. */
export const COLLECTION_PHASE_PHOTOS: CollectionProofPhotoType[] = [
  'order_id_label',
  'sample_tube',
  'technician_collector',
];

export type SampleDispatchStatus =
  | 'not_required'
  | 'pending_dispatch'
  | 'sample_collected'
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
  collectedBy?: string | null;
  collectedAt?: string | null;
  /** Legacy single proof — prefer collectionPhotos. */
  collectionProofFileId?: string | null;
  collectionProofFileName?: string | null;
  collectionProofUploadedAt?: string | null;
  orderLabelVerified?: boolean;
  /** Sample collection proof images keyed to order ID. */
  collectionPhotos?: CollectionProofPhoto[];
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
  pending_dispatch: 'Awaiting schedule confirmation',
  sample_collected: 'Sample collected by lab partner',
  dispatched: 'Handed over to lab',
  received_at_lab: 'Lab received — testing',
  awaiting_report: 'Awaiting report (email)',
  report_uploaded: 'Lab PDF uploaded',
  cancelled: 'Cancelled',
};
