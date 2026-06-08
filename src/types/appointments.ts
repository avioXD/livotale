export type AppointmentVisitStatus =
  | 'booked'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'no_show';

export type ProgressStepState = 'completed' | 'current' | 'pending' | 'cancelled' | 'skipped';

export interface AppointmentProgressStep {
  code: string;
  label: string;
  state: ProgressStepState;
  occurredAt: string | null;
}

export interface AppointmentChecklistItem {
  code: string;
  title: string;
  status: string;
  sortOrder: number;
}

export interface AppointmentSummary {
  id: string;
  visitType: string;
  typeName?: string;
  visitMode?: AppointmentVisitMode;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  status: AppointmentVisitStatus;
  patientNotes: string | null;
  preferredTimeSlot: string | null;
  line1: string;
  line2: string | null;
  pincode: string | null;
  cityName: string | null;
  technicianName: string | null;
  technicianId: string | null;
  createdAt: string;
  updatedAt: string;
  checklist: AppointmentChecklistItem[];
  progressSteps: AppointmentProgressStep[];
  currentStepLabel: string;
  patientCode?: string;
  patientName?: string;
  unified?: UnifiedAppointmentSummary;
  canCancel?: boolean;
  canReschedule?: boolean;
  paymentAmount?: number;
  paymentStatus?: string;
}

export interface AppointmentTimelineEvent {
  step_code: string | null;
  title: string;
  description: string | null;
  status: string;
  occurred_at: string;
  actor_role: string | null;
}

export interface AppointmentDetail extends AppointmentSummary {
  timeline: AppointmentTimelineEvent[];
  unifiedTimeline?: UnifiedTimelineEntry[];
  chiefComplaint?: string | null;
  symptoms?: string | null;
  sampleCollection?: {
    id: string;
    sampleCode: string;
    status: string;
  } | null;
}

export interface TimeSlotOption {
  code: string;
  label: string;
  available: boolean;
  booked?: boolean;
  scheduledAt?: string;
}

export interface DoctorOption {
  id: string;
  fullName: string;
  specialization: string | null;
  qualification: string | null;
  registrationNumber: string | null;
  clinicName: string | null;
}

export interface DoctorAvailabilityDay {
  date: string;
  total_slots: number;
  available_slots: number;
}

export interface DoctorCalendarAppointment {
  id: string;
  appointmentCode: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  patientName: string;
  typeName: string;
}

export interface DoctorAvailabilityCalendar {
  doctorId: string;
  fromDate: string;
  toDate: string;
  weeklyRules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    visitModes: AppointmentVisitMode[];
  }>;
  days: DoctorAvailabilityDay[];
  appointments: DoctorCalendarAppointment[];
}

export interface AdminWalkInBookPayload {
  fullName: string;
  mobile: string;
  email?: string;
  addressLine1?: string;
  pincode?: string;
  typeCode: string;
  visitMode: AppointmentVisitMode;
  slotId: string;
  chiefComplaint?: string;
  symptoms?: string;
  notes?: string;
}

export interface AdminWalkInBookResult {
  patient: {
    patientId: string;
    userId: string;
    patientCode: string;
    fullName: string;
    created: boolean;
    temporaryPassword?: string;
  };
  appointment: {
    id: string;
    appointmentCode: string;
    scheduledAt: string;
    status: string;
    doctorId: string;
    typeName: string;
    visitMode: AppointmentVisitMode;
  };
}

export interface BookAppointmentPayload {
  typeCode?: string;
  visitMode?: AppointmentVisitMode;
  scheduledDate: string;
  timeSlot?: string;
  slotId?: string;
  doctorId?: string;
  addressId?: string;
  visitType?: string;
  notes?: string;
  chiefComplaint?: string;
  symptoms?: string;
}

export interface RescheduleAppointmentPayload {
  scheduledDate: string;
  timeSlot: string;
  reason?: string;
}

export interface CancelAppointmentPayload {
  reason?: string;
  reasonCode?: string;
}

export type AppointmentVisitMode = 'home' | 'clinic' | 'tele';

export type UnifiedAppointmentStatus =
  | 'draft'
  | 'pending_payment'
  | 'booked'
  | 'confirmed'
  | 'doctor_assigned'
  | 'technician_assigned'
  | 'reminder_sent'
  | 'patient_confirmed'
  | 'technician_on_the_way'
  | 'technician_arrived'
  | 'sample_collected'
  | 'report_pending'
  | 'report_uploaded'
  | 'waiting_for_doctor'
  | 'consultation_started'
  | 'prescription_drafted'
  | 'prescription_approved'
  | 'completed'
  | 'rescheduled'
  | 'cancelled_by_patient'
  | 'cancelled_by_admin'
  | 'cancelled_by_doctor'
  | 'no_show'
  | 'missed'
  | 'follow_up_required'
  | 'closed';

export interface AppointmentTypeOption {
  id: string;
  code: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
  requiresDoctor: boolean;
  requiresTechnician: boolean;
  requiresEquipment: string[];
  allowsHome: boolean;
  allowsClinic: boolean;
  allowsTele: boolean;
  cancellationWindowHours: number;
  rescheduleWindowHours: number;
  maxReschedules: number;
  reminderSchedule: number[];
  defaultFollowUpDays: number | null;
}

export interface UnifiedAppointmentSummary {
  appointmentId: string;
  appointmentCode: string;
  typeCode: string;
  typeName: string;
  visitMode: AppointmentVisitMode;
  status: UnifiedAppointmentStatus;
  scheduledStart: string;
  scheduledEnd: string;
  paymentStatus: string;
  paymentAmount: number;
  rescheduleCount: number;
}

export interface UnifiedTimelineEntry {
  fromStatus: UnifiedAppointmentStatus | null;
  toStatus: UnifiedAppointmentStatus;
  actorRole: string;
  reason: string | null;
  notes: string | null;
  isSystemGenerated: boolean;
  occurredAt: string;
}

export type DoctorCalendarView = 'day' | 'week' | 'month' | 'list';

export interface DoctorAppointmentSummary {
  id: string;
  appointmentCode: string;
  typeCode: string;
  typeName: string;
  visitMode: AppointmentVisitMode;
  status: UnifiedAppointmentStatus;
  scheduledStart: string;
  scheduledEnd: string;
  patientId: string;
  patientName: string;
  patientCode: string | null;
  chiefComplaint: string | null;
  symptoms: string | null;
  addressSummary: string | null;
  paymentStatus: string;
  paymentAmount: number;
  canStartConsultation: boolean;
  canComplete: boolean;
  canMarkNoShow: boolean;
}

export interface DoctorCalendarResponse {
  view: DoctorCalendarView;
  date: string;
  rangeStart: string;
  rangeEnd: string;
  appointments: DoctorAppointmentSummary[];
}

export interface DoctorAvailabilityRule {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
  bufferMinutes?: number;
  maxAppointmentsPerDay?: number | null;
  visitModes?: AppointmentVisitMode[];
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export interface DoctorAvailabilityException {
  id: string;
  exception_date: string;
  is_blocked: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export interface DoctorAvailabilityPayload {
  rules: DoctorAvailabilityRule[];
}

export interface DoctorHoliday {
  id: string;
  title: string;
  holiday_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
}

export interface DoctorAppointmentDetail extends DoctorAppointmentSummary {
  patientNotes: string | null;
  internalNotes: string | null;
  timeline: UnifiedTimelineEntry[];
  noteHistory: Array<{ id: string; note: string; created_at: string; author_name: string | null }>;
  patientSummary: {
    risk_score: number | null;
    latest_Liver Fibrosis Scan_kpa: number | null;
    latest_sgpt: number | null;
    journey_status: string | null;
  } | null;
  Liver Fibrosis ScanSnippets: Array<{
    id: string;
    liver_stiffness_kpa: number;
    cap_dbm: number | null;
    fibrosis_stage: string;
    recorded_at: string;
  }>;
  labSnippets: Array<{
    id: string;
    test_name: string;
    result_value: number | null;
    unit: string | null;
    recorded_at: string;
    flag: string;
  }>;
}

export interface TechnicianScheduleItem {
  appointmentId: string;
  appointmentCode: string;
  visitId: string | null;
  typeCode: string;
  typeName: string;
  status: UnifiedAppointmentStatus;
  scheduledStart: string;
  scheduledEnd: string;
  patientId: string;
  patientName: string;
  patientCode: string | null;
  line1: string | null;
  line2: string | null;
  pincode: string | null;
  cityName: string | null;
  preferredTimeSlot: string | null;
  chiefComplaint: string | null;
}

export interface TechnicianRouteStop {
  sortOrder: number;
  visitId: string | null;
  appointmentId: string | null;
  etaAt: string | null;
  arrivedAt: string | null;
  stopStatus: string;
  patientName?: string;
  line1?: string | null;
  pincode?: string | null;
  scheduledStart?: string;
}

export interface TechnicianRouteResponse {
  routeDate: string;
  routeId: string | null;
  totalDistanceKm: number | null;
  stops: TechnicianRouteStop[];
}

export interface TechnicianTrackingResponse {
  active: boolean;
  status?: UnifiedAppointmentStatus | string;
  scheduledStart?: string;
  technicianName?: string | null;
  message?: string;
  lastLocation?: {
    latitude: number;
    longitude: number;
    accuracy_m: number | null;
    recorded_at: string;
  } | null;
}

export interface PrescriptionItemInput {
  itemType?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  durationDays?: number;
  instructions?: string;
  isSubstitutable?: boolean;
}

export interface AppointmentPrescription {
  id: string;
  appointmentId: string | null;
  patientId: string;
  doctorId: string | null;
  prescriptionType: string;
  status: string;
  prescriptionNumber: string | null;
  chiefComplaint: string | null;
  diagnosis: string | null;
  dietPlan: string | null;
  exercisePlan: string | null;
  monitoringPlan: string | null;
  doctorNotes: string | null;
  supplements: unknown[];
  recommendedTests: unknown[];
  lifestyleAdvice: Record<string, unknown>;
  followUpDays: number | null;
  approvedAt: string | null;
  items: PrescriptionItemInput[];
}

export interface AppointmentPrescriptionBundle {
  prescription: AppointmentPrescription | null;
  versions: Array<{ id: string; version_number: number; edit_reason: string | null; created_at: string }>;
  isAiDraft: boolean;
  pdf: { prescription_number?: string; qr_verification_code?: string } | null;
}

export interface PrescriptionPdfInfo {
  prescriptionNumber: string;
  qrVerificationCode: string;
  downloadUrl: string;
  fileName?: string;
  versionNumber?: number;
}

export interface AdminAppointmentSummary {
  id: string;
  appointmentCode: string;
  typeCode: string;
  typeName: string;
  visitMode: AppointmentVisitMode | string;
  status: UnifiedAppointmentStatus | string;
  scheduledStart: string;
  scheduledEnd: string;
  patientId: string;
  patientName: string;
  patientCode?: string;
  doctorId?: string | null;
  doctorName?: string | null;
  technicianId?: string | null;
  technicianName?: string | null;
  paymentStatus?: string;
  paymentAmount?: number;
  line1?: string | null;
  pincode?: string | null;
  cityName?: string | null;
  teleMeetingUrl?: string | null;
  chiefComplaint?: string | null;
  symptoms?: string | null;
  patientNotes?: string | null;
}

export interface AdminAppointmentDetail extends AdminAppointmentSummary {
  internalNotes?: string | null;
  timeline: UnifiedTimelineEntry[];
}

export interface AdminAppointmentsDashboard {
  kpis: {
    today_total: number;
    completed_today: number;
    cancelled_today: number;
    missed_today: number;
    pending_assignments: number;
    delayed_technicians: number;
  };
  upcoming: AdminAppointmentSummary[];
}

export interface AdminRouteLiveItem {
  appointmentId: string;
  appointmentCode: string;
  status: string;
  scheduledStart: string;
  patientName: string;
  technicianName?: string | null;
  lastLocation?: {
    latitude: number;
    longitude: number;
    accuracyM: number | null;
    recordedAt: string;
  } | null;
}

export interface AppointmentReminderLog {
  id: string;
  appointmentId: string;
  reminderType: string;
  channel: string;
  templateCode: string;
  status: string;
  sentAt?: string | null;
  appointmentCode?: string;
  patientName?: string;
  createdAt: string;
}

export interface TeleconsultationJoinPayload {
  appointmentId: string;
  appointmentCode: string;
  meetingUrl: string;
  joinOpensAt?: string;
  joinClosesAt?: string;
  scheduledStart: string;
  scheduledEnd: string;
  doctorName?: string;
  patientName?: string;
  typeName: string;
  role: 'patient' | 'doctor';
}

export interface CareAppointmentSummary {
  id: string;
  appointmentCode: string;
  typeCode: string;
  typeName: string;
  visitMode: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  patientId: string;
  patientName: string;
  patientCode?: string;
  chiefComplaint?: string | null;
  patientNotes?: string | null;
}

export interface CareAppointmentDetail extends CareAppointmentSummary {
  sessionNotes: Array<{ id: string; note: string; created_at: string; author_name?: string }>;
  timeline: Array<Record<string, unknown>>;
}

export interface AppointmentAnalytics {
  byType: Array<{ type_code: string; type_name: string; total: number }>;
  byStatus: Array<{ status: string; total: number }>;
  dailyVolume: Array<{ day: string; total: number }>;
  completionRate: number;
}
