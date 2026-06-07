export type DoctorSection = 'appointments' | 'availability' | 'leave';

export const DOCTOR_SECTIONS: { key: DoctorSection; label: string; description: string }[] = [
  { key: 'appointments', label: 'Appointments', description: 'Consultations, prescriptions, and patient records per visit' },
  { key: 'availability', label: 'Availability', description: 'Weekly clinic hours and slot rules' },
  { key: 'leave', label: 'Leave requests', description: 'Holidays and time-off blocks' },
];

export const APPOINTMENT_LIST_FILTERS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'completed', label: 'Completed' },
  { value: 'missed', label: 'Missed / no-show' },
] as const;
