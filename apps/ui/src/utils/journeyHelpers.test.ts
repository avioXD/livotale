import { isPatientOnboardingComplete, resolvePatientHomePath } from '@/utils/journeyHelpers';
import type { JourneyState } from '@/types';

describe('journeyHelpers', () => {
  const baseJourney = (overrides: Partial<JourneyState['patient']> = {}): JourneyState => ({
    onboardingComplete: false,
    patient: {
      id: 'p1',
      journey_status: 'registered',
      journey_timestamps: {},
      full_name: 'Test',
      email: null,
      mobile: null,
      gender: 'undisclosed',
      dob: null,
      diabetes: false,
      hypertension: false,
      dyslipidemia: false,
      viral_hepatitis: false,
      alcohol_status: 'unknown',
      ...overrides,
    },
    assessment: null,
    visits: [],
    addresses: [],
    draftPrescription: null,
  });

  it('detects incomplete onboarding for registered patient', () => {
    expect(isPatientOnboardingComplete(baseJourney())).toBe(false);
  });

  it('detects complete onboarding after visit booked', () => {
    expect(
      isPatientOnboardingComplete(
        baseJourney({ journey_status: 'visit_booked', journey_timestamps: { appointmentBooking: '2026-01-01' } }),
      ),
    ).toBe(true);
  });

  it('resolves patient home path', () => {
    expect(resolvePatientHomePath(false)).toBe('/patient-journey');
    expect(resolvePatientHomePath(true)).toBe('/org/kolkata/dashboard');
  });
});
