export const DEBOUNCE = {
  searchMs: 400,
  paginationMs: 250,
} as const;

export const BRAND = {
  pink: '#D7316C',
  teal: '#1EABB3',
} as const;

export const APP_NAME = 'Livotale';

/** Product name for liver stiffness elastography — use in all user-facing copy. */
export const LIVER_FIBROSIS_SCAN_LABEL = 'Liver Fibrosis Scan';

export const LIVER_FIBROSIS_SCAN_ROUTE = '/liver-fibrosis-scan';

export const APP_TAGLINE =
  'Non-invasive Liver Fibrosis Scan at your doorstep — hospital-grade FibroScan, interpreted by a specialist.';

export const DEFAULT_PAGE_SIZE = 10;

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

/** Dev-only login prefill (Vite exposes VITE_* vars). Empty in production builds. */
export const DEV_LOGIN = {
  username: import.meta.env.VITE_DEV_LOGIN_USERNAME ?? '',
  password: import.meta.env.VITE_DEV_LOGIN_PASSWORD ?? '',
} as const;
