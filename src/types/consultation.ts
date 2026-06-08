export type ConsultationType = 'video' | 'offline';

export type ConsultationStatus =
  | 'doctor_assignment_pending'
  | 'doctor_assigned'
  | 'consultation_scheduled'
  | 'consultation_in_progress'
  | 'consultation_completed'
  | 'prescription_pending'
  | 'prescription_published'
  | 'cancelled'
  | 'rescheduled';

export interface Consultation {
  id: string;
  orderId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  consultationType: ConsultationType;
  scheduledAt?: string | null;
  meetingLink?: string | null;
  status: ConsultationStatus;
  doctorNotes?: string | null;
  /** Patient-reported symptoms recorded during the visit. */
  symptoms?: string | null;
  /** When the doctor marked the consultation complete. */
  visitCompletedAt?: string | null;
  followUpAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorAssignedPatient {
  patientId: string;
  patientName: string;
  patientPhone: string;
  orderCount: number;
  latestOrderId: string;
  latestOrderNumber: string;
  latestOrderStatus: string;
  consultationScheduledAt?: string | null;
}

export type ConsultationVisitType = 'initial' | 'follow_up';

export type ConsultationVisitStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'prescription_draft'
  | 'prescription_published';

/** One consultation encounter — initial or follow-up — stored as an append-only log. */
export interface ConsultationVisitLog {
  id: string;
  orderId: string;
  consultationId: string;
  visitType: ConsultationVisitType;
  visitNumber: number;
  scheduledAt?: string | null;
  visitCompletedAt?: string | null;
  followUpAt?: string | null;
  symptoms?: string | null;
  doctorNotes?: string | null;
  status: ConsultationVisitStatus;
  prescriptionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PrescriptionStatus = 'draft' | 'review' | 'published' | 'cancelled' | 'revised';

export type MedicineForm = 'tablet' | 'capsule' | 'syrup' | 'injection' | 'sachet';

export type MedicineTiming = 'before_food' | 'after_food' | 'empty_stomach';

export interface PrescriptionMedicine {
  id: string;
  name: string;
  strength?: string | null;
  form: MedicineForm;
  dosage: string;
  frequency: string;
  timing: MedicineTiming;
  duration: string;
  instruction?: string | null;
}

export interface LiverCarePrescription {
  id: string;
  orderId: string;
  visitLogId: string;
  patientId: string;
  consultationId: string;
  doctorId: string;
  doctorName: string;
  doctorDegree: string;
  doctorRegistration: string;
  status: PrescriptionStatus;
  diagnosis?: string | null;
  clinicalNotes?: string | null;
  symptoms?: string | null;
  visitDate?: string | null;
  followUpDate?: string | null;
  medicines: PrescriptionMedicine[];
  dietAdvice?: string | null;
  lifestyleAdvice?: string | null;
  followUpAdvice?: string | null;
  warningSigns?: string | null;
  pdfUrl?: string | null;
  fileId?: string | null;
  publishedAt?: string | null;
  revisionOf?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
