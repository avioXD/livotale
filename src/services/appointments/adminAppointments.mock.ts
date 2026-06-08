import { MOCK_SEED_PATIENT_ID } from '@/services/auth/auth.mock';
import type {
  AdminAppointmentDetail,
  AdminAppointmentSummary,
  AdminAppointmentsDashboard,
  AdminRouteLiveItem,
  AdminWalkInBookPayload,
  AdminWalkInBookResult,
  AppointmentAnalytics,
  AppointmentReminderLog,
  AppointmentTypeOption,
  AppointmentVisitMode,
  DoctorAvailabilityCalendar,
  DoctorOption,
  TimeSlotOption,
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

function baseAdminAppt(
  partial: Partial<AdminAppointmentSummary> & Pick<AdminAppointmentSummary, 'id' | 'status' | 'scheduledStart'>,
): AdminAppointmentSummary {
  const end = new Date(new Date(partial.scheduledStart).getTime() + 30 * 60000).toISOString();
  return {
    appointmentCode: partial.appointmentCode ?? `APT-ADM-${partial.id.slice(-4)}`,
    typeCode: partial.typeCode ?? 'doctor_consult',
    typeName: partial.typeName ?? 'Doctor Consultation',
    visitMode: partial.visitMode ?? 'clinic',
    scheduledEnd: partial.scheduledEnd ?? end,
    patientId: partial.patientId ?? MOCK_SEED_PATIENT_ID,
    patientName: partial.patientName ?? 'Rohan Mehta',
    patientCode: partial.patientCode ?? 'MR-21847',
    doctorId: partial.doctorId ?? '00000000-0000-4000-8000-000000000102',
    doctorName: partial.doctorName ?? 'Dr. Anuradha Iyer',
    technicianId: partial.technicianId ?? null,
    technicianName: partial.technicianName ?? null,
    paymentStatus: partial.paymentStatus ?? 'paid',
    paymentAmount: partial.paymentAmount ?? 800,
    line1: partial.line1 ?? 'Livotale Clinic, Lower Parel',
    pincode: partial.pincode ?? '400013',
    cityName: partial.cityName ?? 'Mumbai',
    chiefComplaint: partial.chiefComplaint ?? null,
    ...partial,
  };
}

let mockAdminAppointments: AdminAppointmentSummary[] = [
  baseAdminAppt({
    id: 'adm-appt-001',
    status: 'confirmed',
    scheduledStart: daysFromNow(0, 9, 0),
  }),
  baseAdminAppt({
    id: 'adm-appt-002',
    status: 'pending_payment',
    scheduledStart: daysFromNow(0, 11, 0),
    patientName: 'Priya Nair',
    patientCode: 'MR-21848',
    paymentStatus: 'pending',
  }),
  baseAdminAppt({
    id: 'adm-appt-003',
    status: 'technician_assigned',
    scheduledStart: daysFromNow(0, 14, 0),
    visitMode: 'home',
    typeName: 'Home Liver Fibrosis Scan',
    technicianId: '00000000-0000-4000-8000-000000000103',
    technicianName: 'Vinod K.',
    paymentAmount: 2500,
    line1: 'A-1402, Lodha Park',
  }),
  baseAdminAppt({
    id: 'adm-appt-004',
    status: 'completed',
    scheduledStart: daysAgo(1, 10, 0),
  }),
  baseAdminAppt({
    id: 'adm-appt-005',
    status: 'missed',
    scheduledStart: daysAgo(2, 15, 0),
    patientName: 'Amit Shah',
    patientCode: 'MR-21849',
  }),
];

const MOCK_ADMIN_TYPES: AppointmentTypeOption[] = [
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
];

const MOCK_ADMIN_DOCTORS: DoctorOption[] = [
  {
    id: 'doc-1',
    fullName: 'Dr. Meera Iyer',
    specialization: 'Hepatology',
    qualification: 'MD, DM (Gastroenterology)',
    registrationNumber: 'MCI-90112',
    clinicName: 'Livotale Liver Clinic — Lower Parel',
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    fullName: 'Dr. Anuradha Iyer',
    specialization: 'Hepatology',
    qualification: 'MD, DM',
    registrationNumber: 'MCI-88421',
    clinicName: 'Livotale Liver Clinic — Bandra',
  },
  {
    id: 'doc-rajesh',
    fullName: 'Dr. Rajesh Kumar',
    specialization: 'Internal Medicine',
    qualification: 'MD (Medicine)',
    registrationNumber: 'MCI-77210',
    clinicName: 'Livotale Liver Clinic — Andheri',
  },
];

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function findAdminAppt(id: string): AdminAppointmentDetail {
  const summary = mockAdminAppointments.find((a) => a.id === id);
  if (!summary) throw new Error(`Appointment not found: ${id}`);
  return {
    ...summary,
    timeline: [
      {
        fromStatus: null,
        toStatus: 'booked',
        actorRole: 'patient',
        reason: null,
        notes: null,
        isSystemGenerated: false,
        occurredAt: daysAgo(3),
      },
    ],
  };
}

export function mockGetAdminDashboard(): AdminAppointmentsDashboard {
  const today = new Date().toISOString().slice(0, 10);
  const todayAppts = mockAdminAppointments.filter((a) => a.scheduledStart.startsWith(today));
  return {
    kpis: {
      today_total: todayAppts.length,
      completed_today: todayAppts.filter((a) => a.status === 'completed').length,
      cancelled_today: todayAppts.filter((a) => String(a.status).includes('cancelled')).length,
      missed_today: todayAppts.filter((a) => a.status === 'missed').length,
      pending_assignments: mockAdminAppointments.filter((a) => a.status === 'booked').length,
      delayed_technicians: 1,
    },
    upcoming: mockAdminAppointments.filter((a) => new Date(a.scheduledStart) >= new Date()).slice(0, 5),
  };
}

export function mockListAdminAppointments(params: Record<string, string | undefined> = {}): AdminAppointmentSummary[] {
  let rows = [...mockAdminAppointments];
  if (params.status) rows = rows.filter((a) => a.status === params.status);
  if (params.search) {
    const q = params.search.toLowerCase();
    rows = rows.filter(
      (a) => a.patientName.toLowerCase().includes(q) || a.appointmentCode.toLowerCase().includes(q),
    );
  }
  return rows;
}

export function mockGetAdminAppointment(id: string): AdminAppointmentDetail {
  return findAdminAppt(id);
}

export function mockUpdateAdminAppointment(id: string, payload: Record<string, unknown>): AdminAppointmentDetail {
  const idx = mockAdminAppointments.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Appointment not found');
  mockAdminAppointments[idx] = { ...mockAdminAppointments[idx], ...payload } as AdminAppointmentSummary;
  return findAdminAppt(id);
}

export function mockCancelAdminAppointment(id: string, _payload: { reason?: string; notes?: string } = {}) {
  const idx = mockAdminAppointments.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Appointment not found');
  mockAdminAppointments.splice(idx, 1);
  return { deleted: true, id };
}

export function mockAssignAdminAppointment(
  id: string,
  payload: { doctorId?: string; technicianId?: string; notify?: boolean },
): AdminAppointmentSummary {
  const idx = mockAdminAppointments.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Appointment not found');
  mockAdminAppointments[idx] = {
    ...mockAdminAppointments[idx],
    doctorId: payload.doctorId ?? mockAdminAppointments[idx].doctorId,
    technicianId: payload.technicianId ?? mockAdminAppointments[idx].technicianId,
    technicianName: payload.technicianId ? 'Vinod K.' : mockAdminAppointments[idx].technicianName,
    status: payload.technicianId ? 'technician_assigned' : 'doctor_assigned',
  };
  return { ...mockAdminAppointments[idx] };
}

export function mockOverrideAdminStatus(
  id: string,
  payload: { status: string; reason: string; notes?: string },
): AdminAppointmentSummary {
  const idx = mockAdminAppointments.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Appointment not found');
  mockAdminAppointments[idx] = { ...mockAdminAppointments[idx], status: payload.status };
  return { ...mockAdminAppointments[idx] };
}

export function mockSendAdminReminder(id: string, payload: { reminderType?: string } = {}): AppointmentReminderLog {
  const appt = mockAdminAppointments.find((a) => a.id === id);
  return {
    id: `rem-${Date.now()}`,
    appointmentId: id,
    reminderType: payload.reminderType ?? 'sms',
    channel: 'sms',
    templateCode: 'appointment_reminder',
    status: 'sent',
    sentAt: new Date().toISOString(),
    appointmentCode: appt?.appointmentCode,
    patientName: appt?.patientName,
    createdAt: new Date().toISOString(),
  };
}

export function mockListMissedAdminAppointments(): AdminAppointmentSummary[] {
  return mockAdminAppointments.filter((a) => a.status === 'missed' || a.status === 'no_show');
}

export function mockHandleMissedAdminAppointment(
  id: string,
  payload: { action: 'follow_up' | 'closed'; reason?: string },
): AdminAppointmentSummary {
  const idx = mockAdminAppointments.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Appointment not found');
  mockAdminAppointments[idx] = {
    ...mockAdminAppointments[idx],
    status: payload.action === 'follow_up' ? 'follow_up_required' : 'closed',
  };
  return { ...mockAdminAppointments[idx] };
}

export function mockGetAdminRouteLive(_date?: string): AdminRouteLiveItem[] {
  return [
    {
      appointmentId: 'adm-appt-003',
      appointmentCode: 'APT-ADM-0003',
      status: 'technician_on_the_way',
      scheduledStart: daysFromNow(0, 14, 0),
      patientName: 'Rohan Mehta',
      technicianName: 'Vinod K.',
      lastLocation: {
        latitude: 19.0176,
        longitude: 72.8562,
        accuracyM: 12,
        recordedAt: new Date().toISOString(),
      },
    },
  ];
}

export function mockListAdminReminderLogs(limit = 100): AppointmentReminderLog[] {
  return mockAdminAppointments.slice(0, limit).map((a, i) => ({
    id: `rem-log-${i}`,
    appointmentId: a.id,
    reminderType: 'sms',
    channel: 'sms',
    templateCode: 'appointment_reminder',
    status: 'sent',
    sentAt: daysAgo(i + 1),
    appointmentCode: a.appointmentCode,
    patientName: a.patientName,
    createdAt: daysAgo(i + 1),
  }));
}

export function mockListAdminAppointmentTypes(): AppointmentTypeOption[] {
  return [...MOCK_ADMIN_TYPES];
}

export function mockGetAdminAnalytics(): AppointmentAnalytics {
  return {
    byType: [
      { type_code: 'doctor_consult', type_name: 'Doctor Consultation', total: 42 },
      { type_code: 'home_fibroscan', type_name: 'Home Liver Fibrosis Scan', total: 28 },
    ],
    byStatus: [
      { status: 'completed', total: 38 },
      { status: 'booked', total: 12 },
      { status: 'cancelled_by_patient', total: 4 },
    ],
    dailyVolume: [
      { day: daysAgo(6).slice(0, 10), total: 8 },
      { day: daysAgo(5).slice(0, 10), total: 11 },
      { day: daysAgo(4).slice(0, 10), total: 9 },
      { day: daysAgo(3).slice(0, 10), total: 14 },
      { day: daysAgo(2).slice(0, 10), total: 10 },
      { day: daysAgo(1).slice(0, 10), total: 12 },
      { day: new Date().toISOString().slice(0, 10), total: 14 },
    ],
    completionRate: 0.86,
  };
}

export function mockListAdminDoctors(): DoctorOption[] {
  return [...MOCK_ADMIN_DOCTORS];
}

export function mockGetAdminDoctorAvailability(
  doctorId: string,
  params?: { fromDate?: string; toDate?: string },
): DoctorAvailabilityCalendar {
  const fromDate = params?.fromDate ?? new Date().toISOString().slice(0, 10);
  const toDate = params?.toDate ?? addDaysIso(fromDate, 13);
  const days: DoctorAvailabilityCalendar['days'] = [];
  let cursor = fromDate;
  while (cursor <= toDate) {
    const dow = new Date(`${cursor}T12:00:00`).getDay();
    const total = dow === 0 ? 0 : dow === 6 ? 6 : 12;
    const available = total === 0 ? 0 : Math.max(0, total - (dow % 4));
    days.push({ date: cursor, total_slots: total, available_slots: available });
    cursor = addDaysIso(cursor, 1);
  }
  return {
    doctorId,
    fromDate,
    toDate,
    weeklyRules: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, visitModes: ['clinic', 'tele'] },
      { dayOfWeek: 3, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30, visitModes: ['clinic', 'tele'] },
      { dayOfWeek: 5, startTime: '10:00', endTime: '16:00', slotDurationMinutes: 30, visitModes: ['tele'] },
    ],
    days,
    appointments: mockAdminAppointments
      .filter((a) => a.scheduledStart.startsWith(fromDate.slice(0, 7)))
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        appointmentCode: a.appointmentCode,
        scheduledStart: a.scheduledStart,
        scheduledEnd: a.scheduledEnd,
        status: a.status,
        patientName: a.patientName,
        typeName: a.typeName,
      })),
  };
}

export function mockListAdminDoctorSlots(
  _doctorId: string,
  date: string,
  visitMode: AppointmentVisitMode = 'tele',
): TimeSlotOption[] {
  return [
    { code: '09:00', label: '09:00 AM', available: true, scheduledAt: `${date}T09:00:00` },
    { code: '09:30', label: '09:30 AM', available: true, scheduledAt: `${date}T09:30:00` },
    { code: '10:00', label: '10:00 AM', available: false, booked: true },
    { code: '14:00', label: '02:00 PM', available: visitMode !== 'home', scheduledAt: `${date}T14:00:00` },
    { code: '15:00', label: '03:00 PM', available: true, scheduledAt: `${date}T15:00:00` },
    { code: '16:00', label: '04:00 PM', available: true, scheduledAt: `${date}T16:00:00` },
  ];
}

export function mockWalkInBook(payload: AdminWalkInBookPayload): AdminWalkInBookResult {
  const id = `adm-appt-walkin-${Date.now()}`;
  const scheduledAt = `${payload.slotId.includes('T') ? payload.slotId : new Date().toISOString().slice(0, 10) + 'T' + payload.slotId}`;
  const appt = baseAdminAppt({
    id,
    status: 'booked',
    scheduledStart: scheduledAt,
    patientName: payload.fullName,
    visitMode: payload.visitMode,
    chiefComplaint: payload.chiefComplaint ?? null,
    line1: payload.addressLine1 ?? 'Walk-in clinic',
    pincode: payload.pincode ?? '400013',
    paymentStatus: 'pending',
  });
  mockAdminAppointments = [appt, ...mockAdminAppointments];
  return {
    patient: {
      patientId: `walkin-patient-${Date.now()}`,
      userId: `walkin-user-${Date.now()}`,
      patientCode: `MR-WK${String(Date.now()).slice(-4)}`,
      fullName: payload.fullName,
      created: true,
      temporaryPassword: 'WalkIn@123',
    },
    appointment: {
      id,
      appointmentCode: appt.appointmentCode,
      scheduledAt,
      status: 'booked',
      doctorId: MOCK_ADMIN_DOCTORS[0].id,
      typeName: MOCK_ADMIN_TYPES.find((t) => t.code === payload.typeCode)?.name ?? 'Consultation',
      visitMode: payload.visitMode,
    },
  };
}
