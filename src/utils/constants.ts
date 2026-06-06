export const DEBOUNCE = {
  searchMs: 400,
  paginationMs: 250,
} as const;

export const BRAND = {
  pink: '#D7316C',
  teal: '#1EABB3',
} as const;

export const APP_NAME = 'Livotel';

export const APP_TAGLINE =
  'Tech-enabled liver care ecosystem — FibroScan, AI treatment plans, and home delivery.';

export const DEFAULT_PAGE_SIZE = 10;

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

/** Dev-only login prefill (Vite exposes VITE_* vars). Empty in production builds. */
export const DEV_LOGIN = {
  username: import.meta.env.VITE_DEV_LOGIN_USERNAME ?? '',
  password: import.meta.env.VITE_DEV_LOGIN_PASSWORD ?? '',
} as const;
