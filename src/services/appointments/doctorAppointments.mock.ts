import { MOCK_SEED_PATIENT_ID } from '@/services/auth/auth.mock';
import type {
  AppointmentPrescriptionBundle,
  DoctorAppointmentDetail,
  DoctorAppointmentSummary,
  DoctorAvailabilityPayload,
  DoctorCalendarResponse,
  DoctorCalendarView,
  DoctorHoliday,
  PrescriptionPdfInfo,
  TeleconsultationJoinPayload,
} from '@/types';

function daysFromNow(days: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysAgo(days: number, hour = 9, minute = 0): string {
  return daysFromNow(-days, hour, minute);
}

function baseDoctorAppt(
  partial: Partial<DoctorAppointmentSummary> & Pick<DoctorAppointmentSummary, 'id' | 'status' | 'scheduledStart'>,
): DoctorAppointmentSummary {
  return {
    appointmentCode: partial.appointmentCode ?? `APT-2026-${partial.id.slice(-4)}`,
    typeCode: partial.typeCode ?? 'doctor_consult',
    typeName: partial.typeName ?? 'Doctor Consultation',
    visitMode: partial.visitMode ?? 'clinic',
    scheduledEnd: partial.scheduledEnd ?? new Date(new Date(partial.scheduledStart).getTime() + 30 * 60000).toISOString(),
    patientId: partial.patientId ?? MOCK_SEED_PATIENT_ID,
    patientName: partial.patientName ?? 'Rohan Mehta',
    patientCode: partial.patientCode ?? 'MR-21847',
    chiefComplaint: partial.chiefComplaint ?? 'Elevated liver enzymes',
    symptoms: partial.symptoms ?? 'Fatigue',
    addressSummary: partial.addressSummary ?? 'Livotale Clinic, Lower Parel',
    paymentStatus: partial.paymentStatus ?? 'paid',
    paymentAmount: partial.paymentAmount ?? 800,
    canStartConsultation: partial.canStartConsultation ?? partial.status === 'confirmed',
    canComplete: partial.canComplete ?? false,
    canMarkNoShow: partial.canMarkNoShow ?? false,
    ...partial,
  };
}

let mockDoctorAppointments: DoctorAppointmentSummary[] = [
  baseDoctorAppt({
    id: 'doc-appt-001',
    status: 'confirmed',
    scheduledStart: daysFromNow(0, 9, 30),
    canStartConsultation: true,
  }),
  baseDoctorAppt({
    id: 'doc-appt-002',
    status: 'doctor_assigned',
    scheduledStart: daysFromNow(1, 14, 0),
    visitMode: 'tele',
    typeName: 'Teleconsultation Follow-up',
    paymentAmount: 500,
  }),
  baseDoctorAppt({
    id: 'doc-appt-003',
    status: 'completed',
    scheduledStart: daysAgo(3, 10, 0),
    canStartConsultation: false,
    canComplete: false,
  }),
];

function findDoctorAppt(id: string): DoctorAppointmentDetail {
  const summary = mockDoctorAppointments.find((a) => a.id === id);
  if (!summary) throw new Error(`Appointment not found: ${id}`);
  return {
    ...summary,
    patientNotes: 'Patient reports improved energy levels',
    internalNotes: null,
    timeline: [
      {
        fromStatus: null,
        toStatus: 'booked',
        actorRole: 'patient',
        reason: null,
        notes: null,
        isSystemGenerated: false,
        occurredAt: daysAgo(5),
      },
      {
        fromStatus: 'booked',
        toStatus: 'confirmed',
        actorRole: 'admin',
        reason: null,
        notes: null,
        isSystemGenerated: true,
        occurredAt: daysAgo(4),
      },
    ],
    noteHistory: [],
    patientSummary: {
      risk_score: 48,
      latest_fibroscan_kpa: 8.2,
      latest_sgpt: 68,
      journey_status: 'visit_booked',
    },
    liverFibrosisScanSnippets: [
      {
        id: 'fs-1',
        liver_stiffness_kpa: 8.2,
        cap_dbm: 268,
        fibrosis_stage: 'F2',
        recorded_at: daysAgo(12),
      },
    ],
    labSnippets: [
      { id: 'lab-1', test_name: 'ALT / SGPT', result_value: 68, unit: 'U/L', recorded_at: daysAgo(10), flag: 'high' },
    ],
  };
}

export function mockGetDoctorCalendar(params: {
  view?: DoctorCalendarView;
  date?: string;
  status?: string;
}): DoctorCalendarResponse {
  const date = params.date ?? new Date().toISOString().slice(0, 10);
  let appointments = [...mockDoctorAppointments];
  if (params.status) {
    appointments = appointments.filter((a) => a.status === params.status);
  }
  return {
    view: params.view ?? 'day',
    date,
    rangeStart: date,
    rangeEnd: date,
    appointments,
  };
}

export function mockListDoctorAppointments(
  filter: 'today' | 'upcoming' | 'completed' | 'missed' = 'upcoming',
): DoctorAppointmentSummary[] {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  return mockDoctorAppointments.filter((a) => {
    const day = a.scheduledStart.slice(0, 10);
    if (filter === 'today') return day === today;
    if (filter === 'completed') return a.status === 'completed';
    if (filter === 'missed') return a.status === 'no_show' || a.status === 'missed';
    return new Date(a.scheduledStart) >= now && a.status !== 'completed';
  });
}

export function mockGetDoctorAppointment(id: string): DoctorAppointmentDetail {
  return findDoctorAppt(id);
}

export function mockUpdateDoctorClinicalData(id: string, payload: Record<string, unknown>): DoctorAppointmentDetail {
  const idx = mockDoctorAppointments.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Appointment not found');
  mockDoctorAppointments[idx] = { ...mockDoctorAppointments[idx], ...payload } as DoctorAppointmentSummary;
  return findDoctorAppt(id);
}

export function mockGetDoctorAvailability() {
  return {
    rules: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, visitModes: ['clinic', 'tele'] },
    ],
    exceptions: [],
  };
}

export function mockSaveDoctorAvailability(payload: DoctorAvailabilityPayload) {
  return { rules: payload.rules, exceptions: [] };
}

export function mockListDoctorHolidays(): DoctorHoliday[] {
  return [
    {
      id: 'hol-1',
      title: 'Diwali',
      holiday_type: 'public',
      start_date: '2026-11-08',
      end_date: '2026-11-10',
      reason: 'Festival holiday',
      created_at: daysAgo(30),
    },
  ];
}

export function mockCreateDoctorHoliday(payload: {
  title: string;
  startDate: string;
  endDate: string;
  holidayType?: string;
  reason?: string;
}): DoctorHoliday {
  return {
    id: `hol-${Date.now()}`,
    title: payload.title,
    holiday_type: payload.holidayType ?? 'personal',
    start_date: payload.startDate,
    end_date: payload.endDate,
    reason: payload.reason ?? null,
    created_at: new Date().toISOString(),
  };
}

function mutateDoctorAppt(id: string, patch: Partial<DoctorAppointmentSummary>): DoctorAppointmentDetail {
  const idx = mockDoctorAppointments.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Appointment not found');
  mockDoctorAppointments[idx] = { ...mockDoctorAppointments[idx], ...patch };
  return findDoctorAppt(id);
}

export function mockStartConsultation(id: string): DoctorAppointmentDetail {
  return mutateDoctorAppt(id, { status: 'consultation_started', canStartConsultation: false, canComplete: true });
}

export function mockCompleteConsultation(id: string, _payload: { summary?: string }): DoctorAppointmentDetail {
  return mutateDoctorAppt(id, { status: 'completed', canComplete: false, canMarkNoShow: false });
}

export function mockMarkNoShow(id: string, _payload: { reasonText?: string; reasonCode?: string }): DoctorAppointmentDetail {
  return mutateDoctorAppt(id, { status: 'no_show', canStartConsultation: false, canComplete: false });
}

export function mockRequestReschedule(id: string, _payload: { reason: string }): DoctorAppointmentDetail {
  return mutateDoctorAppt(id, { status: 'follow_up_required' });
}

export function mockAddDoctorNote(id: string, _payload: { note: string }): DoctorAppointmentDetail {
  return findDoctorAppt(id);
}

export function mockGetDoctorPrescription(appointmentId: string): AppointmentPrescriptionBundle {
  findDoctorAppt(appointmentId);
  return {
    prescription: {
      id: 'rx-doc-1',
      appointmentId,
      patientId: MOCK_SEED_PATIENT_ID,
      doctorId: '00000000-0000-4000-8000-000000000102',
      prescriptionType: 'consultation',
      status: 'draft',
      prescriptionNumber: null,
      chiefComplaint: 'Elevated ALT',
      diagnosis: 'MASLD',
      dietPlan: 'Low carb Mediterranean',
      exercisePlan: '150 min/week',
      monitoringPlan: 'Repeat LFT in 6 weeks',
      doctorNotes: null,
      supplements: [],
      recommendedTests: [],
      lifestyleAdvice: {},
      followUpDays: 30,
      approvedAt: null,
      items: [{ name: 'Metformin', dosage: '500 mg', frequency: 'BD' }],
    },
    versions: [],
    isAiDraft: true,
    pdf: null,
  };
}

export function mockSaveDoctorPrescription(appointmentId: string, payload: Record<string, unknown>): AppointmentPrescriptionBundle {
  const bundle = mockGetDoctorPrescription(appointmentId);
  return {
    ...bundle,
    prescription: bundle.prescription ? { ...bundle.prescription, ...payload } as AppointmentPrescriptionBundle['prescription'] : null,
  };
}

export function mockApproveDoctorPrescription(
  appointmentId: string,
  payload: { doctorNotes?: string; signatureFileId?: string },
): { prescription: AppointmentPrescriptionBundle['prescription']; pdf: PrescriptionPdfInfo } {
  const bundle = mockGetDoctorPrescription(appointmentId);
  const prescription = bundle.prescription
    ? { ...bundle.prescription, status: 'approved', doctorNotes: payload.doctorNotes ?? null, approvedAt: new Date().toISOString() }
    : null;
  return {
    prescription,
    pdf: {
      prescriptionNumber: 'RX-2026-0142',
      qrVerificationCode: 'MOCK-QR-DOC',
      downloadUrl: '#mock-pdf',
    },
  };
}

export function mockPreviewDoctorPrescriptionPdf(appointmentId: string): PrescriptionPdfInfo {
  findDoctorAppt(appointmentId);
  return {
    prescriptionNumber: 'RX-2026-0142',
    qrVerificationCode: 'MOCK-QR-DOC',
    downloadUrl: '#mock-pdf',
  };
}

export function mockSaveDoctorSignature(_payload: Record<string, unknown>) {
  return { saved: true };
}

export function mockGetDoctorTeleJoin(appointmentId: string): TeleconsultationJoinPayload {
  const appt = findDoctorAppt(appointmentId);
  return {
    appointmentId,
    appointmentCode: appt.appointmentCode,
    meetingUrl: 'https://meet.livotale.test/mock-doctor-tele',
    scheduledStart: appt.scheduledStart,
    scheduledEnd: appt.scheduledEnd,
    doctorName: 'Dr. Anuradha Iyer',
    patientName: appt.patientName,
    typeName: appt.typeName,
    role: 'doctor',
  };
}
