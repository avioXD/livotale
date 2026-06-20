import { mapJourneyToListStatus, mapListItemToPatient, type PatientListItem } from './patients';

describe('mapListItemToPatient', () => {
  const row: PatientListItem = {
    patientId: 'p-1',
    patientCode: 'MR-001',
    fullName: 'Test Patient',
    journeyStatus: 'registered',
    primaryDoctorName: 'Dr Smith',
    bmi: 24.5,
    riskScore: 35,
    liverScore: 72,
    scoreCalculatedAt: '2026-06-01T00:00:00Z',
  };

  it('maps camelCase API fields to Patient list row', () => {
    const patient = mapListItemToPatient(row);
    expect(patient.id).toBe('p-1');
    expect(patient.patientCode).toBe('MR-001');
    expect(patient.fullName).toBe('Test Patient');
    expect(patient.assignedDoctor).toBe('Dr Smith');
    expect(patient.bmi).toBe(24.5);
    expect(patient.riskScore).toBe(35);
    expect(patient.liverScore).toBe(72);
    expect(patient.lastVisit).toBe('2026-06-01T00:00:00Z');
  });

  it('maps journey status to list status', () => {
    expect(mapJourneyToListStatus('registered')).toBe('pending');
    expect(mapJourneyToListStatus('inactive')).toBe('inactive');
    expect(mapJourneyToListStatus('visit_booked')).toBe('active');
    expect(mapJourneyToListStatus(undefined)).toBe('pending');
  });
});
