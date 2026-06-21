export type SampleCollectionStatus =
  | 'sample_id_generated'
  | 'pending_technician_assignment'
  | 'assigned'
  | 'accepted'
  | 'travel_started'
  | 'reached_location'
  | 'collection_started'
  | 'sample_collected'
  | 'sample_image_uploaded'
  | 'pending_lab_handover'
  | 'handed_over_to_lab'
  | 'received_by_lab'
  | 'rejected_by_lab'
  | 'testing_started'
  | 'testing_in_progress'
  | 'report_uploaded'
  | 'pending_approval'
  | 'approved'
  | 'published_to_patient'
  | 'recollection_required'
  | 'failed'
  | 'cancelled'
  | 'completed';

export type SampleRejectionReason =
  | 'sample_id_mismatch'
  | 'image_unclear'
  | 'damaged'
  | 'leaked'
  | 'wrong_container'
  | 'insufficient_quantity'
  | 'delayed_delivery'
  | 'not_labelled'
  | 'patient_mismatch'
  | 'test_not_possible'
  | 'other';

export interface SampleCollectionTimelineEntry {
  fromStatus: SampleCollectionStatus | null;
  toStatus: SampleCollectionStatus;
  actorRole: string | null;
  reason: string | null;
  notes: string | null;
  occurredAt: string;
}

export type SamplePhotoType = 'container_label' | 'container_qr' | 'lab_bottle_verification';

export interface SamplePhoto {
  id: string;
  fileId: string;
  photoType: SamplePhotoType | string;
  createdAt: string;
  storageUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}

export type LabResultFlag = 'low' | 'normal' | 'high' | 'critical' | 'unknown';

export interface SampleLabTest {
  orderItemId: string;
  labTestId: string;
  code: string;
  name: string;
  category: string;
  unit: string | null;
  normalMin: number | null;
  normalMax: number | null;
  referenceRange: string | null;
  resultValue: number | null;
  resultText: string | null;
  flag: LabResultFlag;
  resultedAt: string | null;
}

export interface SampleCollectionReport {
  id: string;
  reportCode: string | null;
  reportDate: string | null;
  verified: boolean;
  approvalStatus: string | null;
  approvalStage: string | null;
  createdAt: string;
}

export interface AdminSampleCollectionUpdate {
  priority?: string;
  pincode?: string | null;
  sampleType?: string | null;
  tubesCount?: number | null;
  containerType?: string | null;
  fastingStatus?: string | null;
  collectionRemarks?: string | null;
  labPartnerId?: string | null;
}

export interface SampleCollection {
  id: string;
  sampleCode: string;
  appointmentId: string;
  appointmentCode?: string | null;
  appointmentStatus?: string | null;
  patientId: string;
  patientName: string | null;
  patientCode: string | null;
  patientMobile?: string | null;
  line1?: string | null;
  line2?: string | null;
  cityName?: string | null;
  chiefComplaint?: string | null;
  status: SampleCollectionStatus;
  collectionType: 'home' | 'hospital' | 'center';
  technicianId: string | null;
  technicianName: string | null;
  labPartnerId: string | null;
  labOrderId: string | null;
  qrVerificationCode: string | null;
  pincode: string | null;
  priority: string;
  sampleType: string | null;
  tubesCount: number | null;
  containerType: string | null;
  fastingStatus: string | null;
  collectionRemarks: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  typeName: string | null;
  assignedAt: string | null;
  collectedAt: string | null;
  handedOverAt: string | null;
  receivedAt: string | null;
  reportPublishedAt: string | null;
  timeline?: SampleCollectionTimelineEntry[];
  photos?: SamplePhoto[];
  reports?: SampleCollectionReport[];
  requestedTests?: SampleLabTest[];
  requestedTestCount?: number;
  canViewPhoto?: boolean;
}

export interface SampleCollectionConfig {
  collection_duration_minutes: number;
  travel_buffer_minutes: number;
  max_daily_appointments_per_technician: number;
}

export interface SampleCollectionAnalyticsSummary {
  total_samples: number;
  collected: number;
  in_lab_pipeline: number;
  reports_published: number;
  rejected: number;
}

export interface SampleCollectionAnalytics {
  period: string;
  summary: SampleCollectionAnalyticsSummary;
  collectionsOverTime: Array<{ bucket: string; collected: number }>;
  reportsOverTime: Array<{ bucket: string; reports: number }>;
  byStatus: Array<{ status: string; total: number }>;
}

export interface StaffTechnicianProfile {
  id: string;
  userId: string;
  badgeId?: string | null;
  fullName: string;
  email: string | null;
  mobile: string | null;
  employeeCode: string;
  technicianType: string | null;
  status: string;
  rating: number | null;
  maxAppointmentsPerDay: number | null;
  serviceZone: string | null;
  samplesCollected: number;
  samplesCompleted: number;
  samplesHandedOver: number;
}

export interface StaffLabPartnerProfile {
  id: string;
  name: string;
  contactUserId: string | null;
  contactName: string | null;
  email: string | null;
  mobile: string | null;
  registrationNumber: string | null;
  status: string;
  samplesReceived: number;
  reportsUploaded: number;
  reportsPublished: number;
}
