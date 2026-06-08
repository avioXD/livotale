import { Navigate, Outlet } from 'react-router-dom';
import { getDefaultHomePath } from '@/app/config/navigation';
import { canAccessRoute } from '@/rbac';
import { useAuthStore, useUserRole } from '@/store';
import { PostAuthRedirect } from '@/app/routes/PostAuthRedirect';
import { AppRole } from '@/types';

interface ProtectedRouteProps {
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ allowedRoles = [] }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userRole = useUserRole();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
