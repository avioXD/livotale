import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore, useStaffOnboardingStore, useUserRole } from '@/store';
import { AppRole } from '@/types';

const STAFF_ONBOARDING_ROLES: AppRole[] = [
  AppRole.TECHNICIAN,
  AppRole.DOCTOR,
  AppRole.LAB_PARTNER,
  AppRole.DIETICIAN,
  AppRole.HEALTH_COACH,
  AppRole.PHARMACY,
];

const ALLOWED_WHEN_GATED = ['/staff/onboarding', '/staff/profile', '/settings'];

export function StaffOnboardingRoute() {
  const userRole = useUserRole();
  const userId = useAuthStore((s) => s.user?.id);
  const location = useLocation();
  const status = useStaffOnboardingStore((s) => s.status);
  const loaded = useStaffOnboardingStore((s) => s.loaded);
  const loadStatus = useStaffOnboardingStore((s) => s.loadStatus);

  const needsGate = userRole != null && STAFF_ONBOARDING_ROLES.includes(userRole);

  useEffect(() => {
    if (needsGate && userId) {
      void loadStatus(userId);
    }
  }, [needsGate, userId, loadStatus]);

  if (!needsGate) {
    return <Outlet />;
  }

  if (!loaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Checking onboarding status…
      </div>
    );
  }

  const gated = status?.required && !status.canAccessApp;
  const onAllowedPath = ALLOWED_WHEN_GATED.some((p) => location.pathname.startsWith(p));

  if (gated && !onAllowedPath) {
    return <Navigate to="/staff/onboarding" replace />;
  }

  if (!gated && location.pathname === '/staff/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
