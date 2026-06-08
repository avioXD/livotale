import { MOCK_SEED_PATIENT_ID } from '@/services/auth/auth.mock';
import type {
  AppointmentDetail,
  AppointmentSummary,
  AppointmentTypeOption,
  AppointmentVisitMode,
  BookAppointmentPayload,
  CancelAppointmentPayload,
  DoctorAvailabilityCalendar,
  DoctorOption,
  AppointmentPrescription,
  PrescriptionPdfInfo,
  RescheduleAppointmentPayload,
  TeleconsultationJoinPayload,
  TimeSlotOption,
} from '@/types';

function daysFromNow(days: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysAgo(days: number, hour = 11, minute = 0): string {
  return daysFromNow(-days, hour, minute);
}

const MOCK_TYPES: AppointmentTypeOption[] = [
  {
    id: 'type-1',
    code: 'doctor_consult',
    name: 'Doctor Consultation',
    durationMinutes: 30,
    basePrice: 800,
    requiresDoctor: true,
    requiresTechnician: false,
    requiresEquipment: [],
    allowsHome: false,
    allowsClinic: true,
    allowsTele: true,
    cancellationWindowHours: 24,
    rescheduleWindowHours: 12,
    maxReschedules: 2,
    reminderSchedule: [24, 2],
    defaultFollowUpDays: 30,
  },
  {
    id: 'type-2',
    code: 'home_fibroscan',
    name: 'Home Liver Fibrosis Scan',
    durationMinutes: 90,
    basePrice: 2500,
    requiresDoctor: false,
    requiresTechnician: true,
    requiresEquipment: ['fibroscan'],
    allowsHome: true,
    allowsClinic: false,
    allowsTele: false,
    cancellationWindowHours: 48,
    rescheduleWindowHours: 24,
    maxReschedules: 1,
    reminderSchedule: [48, 24],
    defaultFollowUpDays: 90,
  },
  {
    id: 'type-3',
    code: 'tele_followup',
    name: 'Teleconsultation Follow-up',
    durationMinutes: 20,
    basePrice: 500,
    requiresDoctor: true,
    requiresTechnician: false,
    requiresEquipment: [],
    allowsHome: false,
    allowsClinic: false,
    allowsTele: true,
    cancellationWindowHours: 12,
    rescheduleWindowHours: 6,
    maxReschedules: 3,
    reminderSchedule: [24, 1],
    defaultFollowUpDays: 14,
  },
];

const MOCK_DOCTORS: DoctorOption[] = [
  {
    id: '00000000-0000-4000-8000-000000000102',
    fullName: 'Dr. Anuradha Iyer',
    specialization: 'Hepatology',
    qualification: 'MD, DM (Gastroenterology)',
    registrationNumber: 'MCI-88421',
    clinicName: 'Livotale Liver Clinic — Lower Parel',
  },
  {
    id: 'doc-rajesh',
    fullName: 'Dr. Rajesh Kumar',
    specialization: 'Internal Medicine',
    qualification: 'MD (Medicine)',
    registrationNumber: 'MCI-77210',
    clinicName: 'Livotale Liver Clinic — Bandra',
  },
];

function baseSummary(partial: Partial<AppointmentSummary> & Pick<AppointmentSummary, 'id' | 'visitType' | 'status' | 'scheduledAt'>): AppointmentSummary {
  const now = new Date().toISOString();
  return {
    scheduledAt: partial.scheduledAt,
    startedAt: partial.startedAt ?? null,
    completedAt: partial.completedAt ?? null,
    status: partial.status,
    patientNotes: partial.patientNotes ?? null,
    preferredTimeSlot: partial.preferredTimeSlot ?? 'morning',
    line1: partial.line1 ?? 'A-1402, Lodha Park',
    line2: partial.line2 ?? 'Lower Parel',
    pincode: partial.pincode ?? '400013',
    cityName: partial.cityName ?? 'Mumbai',
    technicianName: partial.technicianName ?? null,
    technicianId: partial.technicianId ?? null,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    checklist: partial.checklist ?? [],
    progressSteps: partial.progressSteps ?? [
      { code: 'booked', label: 'Booked', state: 'completed', occurredAt: daysAgo(3) },
      { code: 'confirmed', label: 'Confirmed', state: 'current', occurredAt: null },
    ],
    currentStepLabel: partial.currentStepLabel ?? 'Confirmed',
    visitType: partial.visitType,
    typeName: partial.typeName,
    visitMode: partial.visitMode,
    patientCode: partial.patientCode ?? 'MR-21847',
    patientName: partial.patientName ?? 'Rohan Mehta',
    canCancel: partial.canCancel ?? true,
    canReschedule: partial.canReschedule ?? true,
    paymentAmount: partial.paymentAmount ?? 800,
    paymentStatus: partial.paymentStatus ?? 'paid',
    id: partial.id,
  };
}

let mockAppointments: AppointmentSummary[] = [
  baseSummary({
    id: 'appt-mock-001',
    visitType: 'doctor_consult',
    typeName: 'Doctor Consultation',
    visitMode: 'clinic',
    status: 'booked',
    scheduledAt: daysFromNow(2, 9, 0),
    currentStepLabel: 'Doctor assigned',
  }),
  baseSummary({
    id: 'appt-mock-002',
    visitType: 'tele_followup',
    typeName: 'Teleconsultation Follow-up',
    visitMode: 'tele',
    status: 'booked',
    scheduledAt: daysFromNow(5, 14, 0),
    paymentAmount: 500,
  }),
  baseSummary({
    id: 'appt-mock-003',
    visitType: 'home_fibroscan',
    typeName: 'Home Liver Fibrosis Scan',
    visitMode: 'home',
    status: 'completed',
    scheduledAt: daysAgo(12, 10, 0),
    completedAt: daysAgo(12, 11, 30),
    technicianName: 'Vinod K.',
    technicianId: '00000000-0000-4000-8000-000000000103',
    paymentAmount: 2500,
    canCancel: false,
    canReschedule: false,
  }),
];

function findAppointment(id: string): AppointmentSummary {
  const appt = mockAppointments.find((a) => a.id === id);
  if (!appt) throw new Error(`Appointment not found: ${id}`);
  return appt;
}

export function mockListAppointmentTypes(): AppointmentTypeOption[] {
  return [...MOCK_TYPES];
}

export function mockListAppointments(): AppointmentSummary[] {
  return mockAppointments.map((a) => ({ ...a }));
}

export function mockGetAppointment(id: string): AppointmentDetail {
  const summary = findAppointment(id);
  return {
    ...summary,
    timeline: [
      {
        step_code: 'booked',
        title: 'Appointment booked',
        description: 'Patient booked via portal',
        status: 'completed',
        occurred_at: summary.createdAt,
        actor_role: 'patient',
      },
    ],
    chiefComplaint: 'Elevated liver enzymes, fatigue',
    symptoms: 'Fatigue, mild abdominal discomfort',
    sampleCollection: summary.visitMode === 'home'
      ? { id: 'demo-sc-08', sampleCode: 'LGSC-DEMO-000008', status: 'handed_over_to_lab' }
      : null,
  };
}

export function mockGetSlots(
  date: string,
  params?: { typeCode?: string; visitMode?: AppointmentVisitMode },
): TimeSlotOption[] {
  const visitMode = params?.visitMode ?? 'clinic';
  const slots: TimeSlotOption[] = [
    { code: '09:00', label: '09:00 AM', available: true, scheduledAt: `${date}T09:00:00` },
    { code: '09:30', label: '09:30 AM', available: true, scheduledAt: `${date}T09:30:00` },
    { code: '10:00', label: '10:00 AM', available: false, booked: true },
    { code: '14:00', label: '02:00 PM', available: visitMode !== 'home', scheduledAt: `${date}T14:00:00` },
    { code: '15:00', label: '03:00 PM', available: true, scheduledAt: `${date}T15:00:00` },
  ];
  return slots;
}

export function mockListDoctors(): DoctorOption[] {
  return [...MOCK_DOCTORS];
}

export function mockListDoctorSlots(
  _doctorId: string,
  date: string,
  visitMode: AppointmentVisitMode = 'clinic',
): TimeSlotOption[] {
  return mockGetSlots(date, { visitMode });
}

export function mockGetDoctorAvailability(
  doctorId: string,
  params?: { fromDate?: string; toDate?: string },
): DoctorAvailabilityCalendar {
  const fromDate = params?.fromDate ?? new Date().toISOString().slice(0, 10);
  const toDate = params?.toDate ?? fromDate;
  return {
    doctorId,
    fromDate,
    toDate,
    weeklyRules: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, visitModes: ['clinic', 'tele'] },
      { dayOfWeek: 3, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30, visitModes: ['clinic'] },
    ],
    days: [{ date: fromDate, total_slots: 12, available_slots: 8 }],
    appointments: mockAppointments
      .filter((a) => a.scheduledAt.startsWith(fromDate))
      .map((a) => ({
        id: a.id,
        appointmentCode: `APT-${a.id.slice(-4)}`,
        scheduledStart: a.scheduledAt,
        scheduledEnd: new Date(new Date(a.scheduledAt).getTime() + 30 * 60000).toISOString(),
        status: a.status,
        patientName: a.patientName ?? 'Rohan Mehta',
        typeName: a.typeName ?? a.visitType,
      })),
  };
}

export function mockBookAppointment(payload: BookAppointmentPayload): AppointmentSummary {
  const type = MOCK_TYPES.find((t) => t.code === payload.typeCode) ?? MOCK_TYPES[0];
  const scheduledAt = payload.timeSlot
    ? `${payload.scheduledDate}T${payload.timeSlot}:00`
    : daysFromNow(3, 10, 0);
  const appt = baseSummary({
    id: `appt-mock-${Date.now()}`,
    visitType: type.code,
    typeName: type.name,
    visitMode: payload.visitMode ?? 'clinic',
    status: 'booked',
    scheduledAt,
    paymentAmount: type.basePrice,
    paymentStatus: 'pending',
    currentStepLabel: 'Booked',
  });
  mockAppointments = [appt, ...mockAppointments];
  return { ...appt };
}

export function mockRescheduleAppointment(id: string, payload: RescheduleAppointmentPayload): AppointmentSummary {
  const idx = mockAppointments.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Appointment not found');
  const scheduledAt = `${payload.scheduledDate}T${payload.timeSlot}:00`;
  mockAppointments[idx] = {
    ...mockAppointments[idx],
    scheduledAt,
    status: 'rescheduled',
    updatedAt: new Date().toISOString(),
  };
  return { ...mockAppointments[idx] };
}

export function mockCancelAppointment(id: string, _payload: CancelAppointmentPayload = {}): AppointmentSummary {
  const idx = mockAppointments.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Appointment not found');
  mockAppointments[idx] = {
    ...mockAppointments[idx],
    status: 'cancelled',
    canCancel: false,
    canReschedule: false,
    updatedAt: new Date().toISOString(),
  };
  return { ...mockAppointments[idx] };
}

export function mockGetPrescription(appointmentId: string): AppointmentPrescription {
  findAppointment(appointmentId);
  return {
    id: 'rx-mock-1',
    appointmentId,
    patientId: MOCK_SEED_PATIENT_ID,
    doctorId: MOCK_DOCTORS[0].id,
    prescriptionType: 'consultation',
    status: 'approved',
    prescriptionNumber: 'RX-2026-0142',
    chiefComplaint: 'Elevated ALT, MASLD',
    diagnosis: 'MASLD with F2 fibrosis',
    dietPlan: 'Mediterranean-style diet, reduce refined carbs',
    exercisePlan: '150 min/week moderate aerobic activity',
    monitoringPlan: 'Repeat LFT in 6 weeks, FibroScan in 3 months',
    doctorNotes: 'Continue metformin. Add vitamin E trial.',
    supplements: [],
    recommendedTests: [],
    lifestyleAdvice: {},
    followUpDays: 30,
    approvedAt: daysAgo(8),
    items: [
      { name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily', durationDays: 90 },
      { name: 'Vitamin E', dosage: '400 IU', frequency: 'Once daily', durationDays: 90 },
    ],
  };
}

export function mockGetPrescriptionPdf(appointmentId: string): PrescriptionPdfInfo {
  findAppointment(appointmentId);
  return {
    prescriptionNumber: 'RX-2026-0142',
    qrVerificationCode: 'MOCK-QR-88421',
    downloadUrl: '#mock-prescription-pdf',
    fileName: 'prescription.pdf',
  };
}

export function mockGetTeleJoin(appointmentId: string): TeleconsultationJoinPayload {
  const appt = findAppointment(appointmentId);
  return {
    appointmentId,
    appointmentCode: `APT-${appointmentId.slice(-4)}`,
    meetingUrl: 'https://meet.livotale.test/mock-tele-session',
    scheduledStart: appt.scheduledAt,
    scheduledEnd: new Date(new Date(appt.scheduledAt).getTime() + 30 * 60000).toISOString(),
    doctorName: MOCK_DOCTORS[0].fullName,
    patientName: 'Rohan Mehta',
    typeName: appt.typeName ?? 'Teleconsultation',
    role: 'patient',
  };
}
