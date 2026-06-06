export { cn } from '@/lib/utils';
export { BRAND, APP_NAME, APP_TAGLINE } from './constants';

export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
