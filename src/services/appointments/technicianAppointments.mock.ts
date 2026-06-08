import { MOCK_SEED_PATIENT_ID } from '@/services/auth/auth.mock';
import type { TechnicianRouteResponse, TechnicianScheduleItem, TechnicianTrackingResponse } from '@/types';

function daysFromNow(days: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const scheduleState = new Map<string, { status: string; journeyStarted?: boolean; arrived?: boolean }>();

function getState(id: string) {
  if (!scheduleState.has(id)) {
    scheduleState.set(id, { status: 'technician_assigned' });
  }
  return scheduleState.get(id)!;
}

const MOCK_SCHEDULE: TechnicianScheduleItem[] = [
  {
    appointmentId: 'tech-appt-001',
    appointmentCode: 'APT-TECH-0001',
    visitId: 'visit-mock-002',
    typeCode: 'home_fibroscan',
    typeName: 'Home Liver Fibrosis Scan',
    status: 'technician_assigned',
    scheduledStart: daysFromNow(0, 9, 0),
    scheduledEnd: daysFromNow(0, 10, 30),
    patientId: MOCK_SEED_PATIENT_ID,
    patientName: 'Rohan Mehta',
    patientCode: 'MR-21847',
    line1: 'A-1402, Lodha Park',
    line2: 'Lower Parel',
    pincode: '400013',
    cityName: 'Mumbai',
    preferredTimeSlot: 'morning',
    chiefComplaint: 'Liver Fibrosis Scan + blood draw',
  },
  {
    appointmentId: 'tech-appt-002',
    appointmentCode: 'APT-TECH-0002',
    visitId: null,
    typeCode: 'home_blood',
    typeName: 'Home Blood Collection',
    status: 'technician_assigned',
    scheduledStart: daysFromNow(0, 11, 30),
    scheduledEnd: daysFromNow(0, 12, 15),
    patientId: '00000000-0000-4000-8000-000000000202',
    patientName: 'Priya Nair',
    patientCode: 'MR-21848',
    line1: '44 Turner Road, Bandra',
    line2: null,
    pincode: '400050',
    cityName: 'Mumbai',
    preferredTimeSlot: 'morning',
    chiefComplaint: 'Fasting lipid panel',
  },
  {
    appointmentId: 'tech-appt-003',
    appointmentCode: 'APT-TECH-0003',
    visitId: 'visit-mock-001',
    typeCode: 'home_fibroscan',
    typeName: 'Home Liver Fibrosis Scan',
    status: 'completed',
    scheduledStart: daysFromNow(-1, 10, 0),
    scheduledEnd: daysFromNow(-1, 11, 30),
    patientId: MOCK_SEED_PATIENT_ID,
    patientName: 'Rohan Mehta',
    patientCode: 'MR-21847',
    line1: 'A-1402, Lodha Park',
    line2: 'Lower Parel',
    pincode: '400013',
    cityName: 'Mumbai',
    preferredTimeSlot: 'morning',
    chiefComplaint: 'Follow-up FibroScan',
  },
];

export function mockGetTechnicianSchedule(_date?: string): TechnicianScheduleItem[] {
  return MOCK_SCHEDULE.map((item) => {
    const state = scheduleState.get(item.appointmentId);
    return state ? { ...item, status: state.status as TechnicianScheduleItem['status'] } : { ...item };
  });
}

export function mockGetTechnicianRoute(date: string): TechnicianRouteResponse {
  const active = MOCK_SCHEDULE.filter((s) => s.status !== 'completed');
  return {
    routeDate: date,
    routeId: `route-${date}`,
    totalDistanceKm: 18.4,
    stops: active.map((s, i) => ({
      sortOrder: i + 1,
      visitId: s.visitId,
      appointmentId: s.appointmentId,
      etaAt: s.scheduledStart,
      arrivedAt: getState(s.appointmentId).arrived ? s.scheduledStart : null,
      stopStatus: getState(s.appointmentId).arrived ? 'arrived' : 'pending',
      patientName: s.patientName,
      line1: s.line1,
      pincode: s.pincode,
      scheduledStart: s.scheduledStart,
    })),
  };
}

export function mockGetTechnicianAppointment(id: string): Record<string, unknown> {
  const item = MOCK_SCHEDULE.find((s) => s.appointmentId === id);
  if (!item) throw new Error(`Appointment not found: ${id}`);
  const state = getState(id);
  return { ...item, ...state };
}

export function mockAcceptTechnicianAppointment(id: string) {
  getState(id).status = 'confirmed';
  return { accepted: true, id };
}

export function mockStartTechnicianJourney(id: string) {
  const state = getState(id);
  state.status = 'technician_on_the_way';
  state.journeyStarted = true;
  return { started: true, id };
}

export function mockMarkTechnicianArrived(id: string) {
  const state = getState(id);
  state.status = 'technician_arrived';
  state.arrived = true;
  return { arrived: true, id };
}

export function mockRecordTechnicianGeo(_payload: {
  appointmentId: string;
  latitude: number;
  longitude: number;
  accuracyM?: number;
}) {
  return { recorded: true };
}

export function mockCaptureTechnicianConsent(id: string) {
  return { id, consentCaptured: true };
}

export function mockCaptureTechnicianVitals(id: string, payload: Record<string, unknown>) {
  return { id, vitals: payload };
}

export function mockCaptureTechnicianLiverFibrosisScan(id: string, payload: Record<string, unknown>) {
  return { id, scan: { liver_stiffness_kpa: 8.2, cap_dbm: 268, fibrosis_stage: 'F2', ...payload } };
}

export function mockCollectTechnicianSample(id: string, payload: Record<string, unknown>) {
  getState(id).status = 'sample_collected';
  return { id, sample: payload };
}

export function mockCompleteTechnicianAppointment(id: string) {
  getState(id).status = 'completed';
  return { id, status: 'completed' };
}

export function mockMarkTechnicianFailed(
  id: string,
  _payload: { reasonCode?: string; reasonText?: string; note?: string },
) {
  getState(id).status = 'failed';
  return { id, status: 'failed' };
}

export function mockReportTechnicianIssue(id: string, _payload: { note: string; escalate?: boolean }) {
  return { id, reported: true };
}

export function mockGetPatientTracking(appointmentId: string): TechnicianTrackingResponse {
  const item = MOCK_SCHEDULE.find((s) => s.appointmentId === appointmentId);
  const state = getState(appointmentId);
  return {
    active: state.journeyStarted === true && state.status !== 'completed',
    status: state.status,
    scheduledStart: item?.scheduledStart,
    technicianName: 'Vinod K.',
    message: state.arrived ? 'Technician has arrived' : 'Technician is on the way',
    lastLocation: state.journeyStarted
      ? {
          latitude: 19.0176,
          longitude: 72.8562,
          accuracy_m: 10,
          recorded_at: new Date().toISOString(),
        }
      : null,
  };
}
