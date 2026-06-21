import {
  ageFromDateOfBirth,
  enquiryPrefillFromPatient,
} from '@/utils/patientEnquiryPrefill';
import type { PatientPortalSession, PatientProfile } from '@/types/patientPortal';

const session: PatientPortalSession = {
  phone: '9876543210',
  patientId: 'p-1',
  patientName: 'Jane Doe',
};

const profile: PatientProfile = {
  patientId: 'p-1',
  phone: '9876543210',
  name: 'Jane Doe',
  email: 'jane@example.com',
  city: 'Mumbai',
  dateOfBirth: '1990-06-15',
  gender: 'female',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('ageFromDateOfBirth', () => {
  it('returns whole years for a valid date', () => {
    const age = ageFromDateOfBirth('1990-01-01');
    expect(age).toBeGreaterThanOrEqual(35);
    expect(age).toBeLessThanOrEqual(37);
  });

  it('returns 0 for invalid input', () => {
    expect(ageFromDateOfBirth('not-a-date')).toBe(0);
  });
});

describe('enquiryPrefillFromPatient', () => {
  it('uses session name and phone when profile is missing', () => {
    expect(enquiryPrefillFromPatient(session, null)).toEqual({
      patientName: 'Jane Doe',
      phone: '9876543210',
    });
  });

  it('merges profile fields when available', () => {
    const prefill = enquiryPrefillFromPatient(session, profile);
    expect(prefill.patientName).toBe('Jane Doe');
    expect(prefill.phone).toBe('9876543210');
    expect(prefill.email).toBe('jane@example.com');
    expect(prefill.city).toBe('Mumbai');
    expect(prefill.gender).toBe('female');
    expect(Number(prefill.age)).toBeGreaterThanOrEqual(35);
  });

  it('skips undisclosed gender', () => {
    const prefill = enquiryPrefillFromPatient(session, { ...profile, gender: 'undisclosed' });
    expect(prefill.gender).toBeUndefined();
  });
});
