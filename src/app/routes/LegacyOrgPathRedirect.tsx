import { Navigate, useLocation } from 'react-router-dom';
import { orgPath, resolveMissingOrgCityPath } from '@/app/config/orgRoutes';
import { NotFoundPage } from '@/app/pages/not-found/NotFoundPage';

/** Redirects pre-/org staff app URLs to their /org equivalents. */
export function LegacyOrgPathRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={`${orgPath(pathname)}${search}`} replace />;
}

/**
 * Redirects bare `/org/...` URLs (missing the city segment) to the canonical
 * city-scoped path, e.g. `/org/dashboard` → `/org/kolkata/dashboard`.
 * Renders nothing (lets the global 404 handle it) when no redirect applies.
 */
export function OrgCityRedirect() {
  const { pathname, search } = useLocation();
  const target = resolveMissingOrgCityPath(pathname);
  // Already city-scoped (or unscoped) but unmatched → genuine 404.
  if (!target) return <NotFoundPage />;
  return <Navigate to={`${target}${search}`} replace />;
}
