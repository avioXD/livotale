export type OrderStatus =
  | 'draft'
  | 'created'
  | 'payment_pending'
  | 'payment_completed'
  | 'technician_assigned'
  | 'scan_scheduled'
  | 'scan_in_progress'
  | 'scan_completed'
  | 'pathology_pending'
  | 'lab_report_uploaded'
  | 'ai_extraction_pending'
  | 'ai_extraction_completed'
  | 'report_review_pending'
  | 'final_report_generated'
  | 'doctor_assignment_pending'
  | 'doctor_assigned'
  | 'consultation_pending'
  | 'prescription_pending'
  | 'prescription_generated'
  | 'completed'
  | 'cancelled';

export type ScanVisitMode = 'clinic' | 'home';

export type PaymentMode = 'offline' | 'online_link' | 'patient_portal' | null;

export type LiverCarePaymentStatus =
  | 'pending'
  | 'link_sent'
  | 'processing'
  | 'success'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export interface LiverCareOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  enquiryId?: string | null;
  packageId: string;
  packageCode: string;
  packageName: string;
  packagePrice: number;
  discount: number;
  finalAmount: number;
  paymentMode: PaymentMode;
  paymentStatus: LiverCarePaymentStatus;
  orderStatus: OrderStatus;
  technicianId?: string | null;
  technicianName?: string | null;
  partnerLabId?: string | null;
  partnerLabName?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  scanVisitMode?: ScanVisitMode | null;
  scanTimeSlot?: string | null;
  scanClinicLocation?: string | null;
  /** Patient-selected preferred date/time before operations confirms the schedule. */
  scanPatientPreferredAt?: string | null;
  scanScheduledAt?: string | null;
  consultationScheduledAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  patientId: string;
  enquiryId?: string;
  /** When true, patient record already exists (repeat order from converted enquiry). */
  skipPatientCreation?: boolean;
  packageId: string;
  discount?: number;
  paymentMode?: PaymentMode;
  scanScheduledAt?: string;
  scanVisitMode?: ScanVisitMode;
}

export interface ScheduleScanInput {
  scheduledAt: string;
  visitMode: ScanVisitMode;
  timeSlot: string;
  clinicLocation?: string;
}

export interface PatientScanDateRequest {
  preferredAt: string;
  visitMode: ScanVisitMode;
  timeSlot: string;
}

export type OrderTimelineCategory =
  | 'order'
  | 'payment'
  | 'scan'
  | 'pathology'
  | 'ai'
  | 'report'
  | 'consultation'
  | 'prescription'
  | 'system';

export interface OrderTimelineEvent {
  id: string;
  orderId: string;
  eventType: string;
  label: string;
  occurredAt: string;
  performedBy?: string | null;
  /** Secondary line — amounts, assignee names, file names, status changes */
  detail?: string | null;
  category?: OrderTimelineCategory;
  metadata?: Record<string, string>;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Draft',
  created: 'Created',
  payment_pending: 'Payment Pending',
  payment_completed: 'Payment Completed',
  technician_assigned: 'Technician Assigned',
  scan_scheduled: 'Scan Scheduled',
  scan_in_progress: 'Scan In Progress',
  scan_completed: 'Scan Completed',
  pathology_pending: 'Pathology Pending',
  lab_report_uploaded: 'Lab Report Uploaded',
  ai_extraction_pending: 'AI Extraction Pending',
  ai_extraction_completed: 'AI Extraction Completed',
  report_review_pending: 'Report Review Pending',
  final_report_generated: 'Final Report Generated',
  doctor_assignment_pending: 'Doctor Assignment Pending',
  doctor_assigned: 'Doctor Assigned',
  consultation_pending: 'Consultation Pending',
  prescription_pending: 'Prescription Pending',
  prescription_generated: 'Prescription Generated',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
