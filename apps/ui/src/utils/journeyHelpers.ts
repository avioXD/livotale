import type { JourneyState, JourneyStatus } from '@/types';
import { orgPath } from '@/app/config/orgRoutes';

const ONBOARDING_COMPLETE_STATUSES: JourneyStatus[] = [
  'visit_booked',
  'visit_in_progress',
  'visit_completed',
  'draft_prescription',
  'awaiting_doctor_review',
  'prescription_approved',
];

export function isPatientOnboardingComplete(journey: JourneyState | null): boolean {
  if (!journey) return false;
  if (journey.onboardingComplete) return true;
  const status = journey.patient.journey_status;
  if (ONBOARDING_COMPLETE_STATUSES.includes(status)) return true;
  return Boolean(journey.patient.journey_timestamps?.appointmentBooking);
}

export function resolvePatientHomePath(onboardingComplete: boolean): string {
  return onboardingComplete ? orgPath('/dashboard') : '/patient-journey';
}
