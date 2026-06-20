export const ORG_ROUTE_PREFIX = '/org';

/**
 * Authenticated app routes under `/org` are scoped to a city, e.g. `/org/kolkata/dashboard`.
 * For now there is a single, always-present default city.
 */
export const DEFAULT_ORG_CITY = 'kolkata';

/**
 * Sub-paths under `/org` that are NOT city-scoped — auth and onboarding entry points
 * stay at `/org/login`, `/org/staff/onboard/:token`, etc.
 */
const ORG_UNSCOPED_SUBPATHS = [
  '/login',
  '/register',
  '/reset-password',
  '/staff/onboard',
  '/staff/register',
] as const;

function isUnscopedOrgSubPath(subPath: string): boolean {
  return ORG_UNSCOPED_SUBPATHS.some(
    (prefix) =>
      subPath === prefix ||
      subPath.startsWith(`${prefix}/`) ||
      subPath.startsWith(`${prefix}?`),
  );
}

/**
 * Build a staff/admin app path under `/org`.
 * City-scoped sub-paths get the city segment injected (default: `kolkata`);
 * auth/onboarding sub-paths are returned without a city.
 * Already-built `/org/...` paths are returned unchanged (idempotent).
 */
export function orgPath(path: string, city: string = DEFAULT_ORG_CITY): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === ORG_ROUTE_PREFIX || normalized.startsWith(`${ORG_ROUTE_PREFIX}/`)) {
    return normalized;
  }
  if (isUnscopedOrgSubPath(normalized)) {
    return `${ORG_ROUTE_PREFIX}${normalized}`;
  }
  return `${ORG_ROUTE_PREFIX}/${city}${normalized}`;
}

export const ORG_LOGIN_PATH = orgPath('/login');
export const ORG_REGISTER_PATH = orgPath('/register');
export const ORG_RESET_PASSWORD_PATH = orgPath('/reset-password');

/** Legacy staff app paths that now live under `/org`. */
const LEGACY_ORG_ROUTE_PREFIXES = [
  '/login',
  '/register',
  '/reset-password',
  '/dashboard',
  '/notifications',
  '/patients',
  '/appointments',
  '/doctor',
  '/admin',
  '/technician',
  '/treatment-plans',
  '/prescriptions',
  '/delivery',
  '/coaching',
  '/settings',
  '/staff/onboarding',
  '/staff/profile',
  '/staff/register',
  '/staff/onboard/',
] as const;

export function isLegacyOrgPath(pathname: string): boolean {
  if (pathname.startsWith(ORG_ROUTE_PREFIX)) return false;

  return LEGACY_ORG_ROUTE_PREFIXES.some((prefix) => {
    if (prefix.endsWith('/')) return pathname.startsWith(prefix);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

/**
 * For a bare `/org/...` path missing the city segment, return the canonical
 * city-scoped path. Returns null when the path is already city-scoped or is an
 * unscoped (auth/onboarding) sub-path — i.e. no redirect needed.
 */
export function resolveMissingOrgCityPath(pathname: string): string | null {
  if (!pathname.startsWith(ORG_ROUTE_PREFIX)) return null;
  const subPath = pathname.slice(ORG_ROUTE_PREFIX.length) || '/';
  const firstSegment = subPath.split('/')[1] ?? '';
  if (firstSegment === DEFAULT_ORG_CITY) return null;
  if (isUnscopedOrgSubPath(subPath)) return null;
  return orgPath(subPath);
}

const PATIENT_APP_PREFIXES = ['/patient', '/patient-journey'] as const;

/** Where to send unauthenticated users who hit a protected route. */
export function resolveUnauthenticatedRedirect(pathname: string, search = ''): string {
  const returnTo = encodeURIComponent(`${pathname}${search}`);

  if (PATIENT_APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return `/patient/login?next=${returnTo}`;
  }

  return `${ORG_LOGIN_PATH}?next=${returnTo}`;
}
