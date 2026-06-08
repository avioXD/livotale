import type { CareAppointmentDetail, CareAppointmentSummary } from '@/types/appointments';

const MOCK_SESSIONS: CareAppointmentDetail[] = [
  {
    id: 'care-1',
    appointmentCode: 'CARE-2026-001',
    typeCode: 'health_coaching',
    typeName: 'Health coaching',
    visitMode: 'tele',
    status: 'booked',
    scheduledStart: new Date(Date.now() + 86400000).toISOString(),
    scheduledEnd: new Date(Date.now() + 86400000 + 3600000).toISOString(),
    patientId: '00000000-0000-4000-8000-000000000201',
    patientName: 'Rohan Mehta',
    patientCode: 'PT-001',
    chiefComplaint: 'Liver diet planning',
    sessionNotes: [],
    timeline: [],
  },
];

export function listCareAppointments(filter: 'upcoming' | 'today' | 'completed'): CareAppointmentSummary[] {
  const now = new Date();
  return MOCK_SESSIONS.filter((s) => {
    const start = new Date(s.scheduledStart);
    if (filter === 'today') return start.toDateString() === now.toDateString();
    if (filter === 'completed') return s.status === 'completed';
    return start >= now && s.status !== 'completed';
  });
}

export function getCareAppointmentById(id: string): CareAppointmentDetail | null {
  return MOCK_SESSIONS.find((s) => s.id === id) ?? null;
}

export function addCareAppointmentNote(id: string, note: string): CareAppointmentDetail {
  const row = MOCK_SESSIONS.find((s) => s.id === id);
  if (!row) throw new Error('Care appointment not found');
  row.sessionNotes.push({
    id: `note-${Date.now()}`,
    note,
    created_at: new Date().toISOString(),
    author_name: 'Coach',
  });
  return row;
}

export function recommendCareFollowUp(
  id: string,
  reason: string,
  followUpDays = 14,
): CareAppointmentDetail {
  const row = MOCK_SESSIONS.find((s) => s.id === id);
  if (!row) throw new Error('Care appointment not found');
  row.timeline.push({ event: 'follow_up_recommended', reason, followUpDays, at: new Date().toISOString() });
  return row;
}
