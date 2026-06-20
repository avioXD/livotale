import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getDefaultHomePath } from '@/app/config/navigation';
import { resolveUnauthenticatedRedirect } from '@/app/config/orgRoutes';
import { canAccessRoute } from '@/rbac';
import { PostAuthRedirect } from '@/app/routes/PostAuthRedirect';
import { useAuthStore, useUserRole } from '@/store';
import { AppRole } from '@/types';

interface ProtectedRouteProps {
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ allowedRoles = [] }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userRole = useUserRole();

  if (!isAuthenticated) {
    return (
      <Navigate
        to={resolveUnauthenticatedRedirect(location.pathname, location.search)}
        replace
      />
    );
  }

  if (allowedRoles.length > 0 && !canAccessRoute(userRole, allowedRoles)) {
    return <Navigate to={getDefaultHomePath(userRole)} replace />;
  }

  return <Outlet />;
}

export function PublicRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <PostAuthRedirect />;
  }

  return <Outlet />;
}
