/** Languages hepatologists may speak — used for profile tags and assignment filtering. */
export const DOCTOR_LANGUAGES = [
  'English',
  'Hindi',
  'Bengali',
  'Tamil',
  'Telugu',
  'Marathi',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Punjabi',
  'Odia',
  'Urdu',
] as const;

export type DoctorLanguage = (typeof DOCTOR_LANGUAGES)[number];

export function doctorSpeaksLanguage(
  languagesKnown: string[] | null | undefined,
  language: string | null | undefined,
): boolean {
  if (!language) return true;
  const needle = language.trim().toLowerCase();
  if (!needle) return true;
  return (languagesKnown ?? []).some((lang) => lang.trim().toLowerCase() === needle);
}

export function formatDoctorLanguages(languagesKnown: string[] | null | undefined): string {
  if (!languagesKnown?.length) return '—';
  return languagesKnown.join(', ');
}
