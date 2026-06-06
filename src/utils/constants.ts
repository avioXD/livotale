import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BRAND = {
  pink: '#D7316C',
  teal: '#1EABB3',
} as const;

export const APP_NAME = 'Livotel';

export const APP_TAGLINE =
  'Tech-enabled liver care ecosystem — FibroScan, AI treatment plans, and home delivery.';
