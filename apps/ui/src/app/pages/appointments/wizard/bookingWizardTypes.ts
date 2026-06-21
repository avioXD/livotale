import type { AppointmentTypeOption, AppointmentVisitMode, DoctorOption } from '@/types';

export type BookingWizardStep =
  | 'type'
  | 'mode'
  | 'doctor'
  | 'datetime'
  | 'details'
  | 'address'
  | 'payment'
  | 'confirm';

export interface BookingWizardState {
  type: AppointmentTypeOption | null;
  visitMode: AppointmentVisitMode | null;
  doctor: DoctorOption | null;
  scheduledDate: string;
  timeSlot: string;
  slotId: string;
  chiefComplaint: string;
  symptoms: string;
  notes: string;
  addressId: string;
}

export const INITIAL_WIZARD_STATE: BookingWizardState = {
  type: null,
  visitMode: null,
  doctor: null,
  scheduledDate: '',
  timeSlot: '',
  slotId: '',
  chiefComplaint: '',
  symptoms: '',
  notes: '',
  addressId: '',
};

export function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function availableModes(type: AppointmentTypeOption): AppointmentVisitMode[] {
  const modes: AppointmentVisitMode[] = [];
  if (type.allowsHome) modes.push('home');
  if (type.allowsClinic) modes.push('clinic');
  if (type.allowsTele) modes.push('tele');
  return modes;
}

export function needsDoctorSelection(type: AppointmentTypeOption | null): boolean {
  return Boolean(type?.requiresDoctor);
}

export function wizardSteps(state: BookingWizardState): BookingWizardStep[] {
  const steps: BookingWizardStep[] = ['type', 'mode'];
  if (needsDoctorSelection(state.type)) steps.push('doctor');
  steps.push('datetime', 'details');
  if (state.visitMode === 'home') steps.push('address');
  if (state.type && state.type.basePrice > 0) steps.push('payment');
  steps.push('confirm');
  return steps;
}
