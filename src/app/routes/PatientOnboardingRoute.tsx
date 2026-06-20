import { useEffect } from 'react';
import { orgPath } from '@/app/config/orgRoutes';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, useJourneyStore, useUserRole } from '@/store';
import { AppRole } from '@/types';

interface PatientOnboardingRouteProps {
  /** Block app shell until onboarding is finished */
  requireComplete?: boolean;
}

export function PatientOnboardingRoute({ requireComplete = false }: PatientOnboardingRouteProps) {
  const userRole = useUserRole();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const onboardingComplete = useJourneyStore((state) => state.onboardingComplete);
  const onboardingLoaded = useJourneyStore((state) => state.onboardingLoaded);
  const loadOnboardingStatus = useJourneyStore((state) => state.loadOnboardingStatus);

  useEffect(() => {
    if (isAuthenticated && userRole === AppRole.PATIENT) {
      void loadOnboardingStatus();
    }
  }, [isAuthenticated, userRole, loadOnboardingStatus]);

  if (userRole !== AppRole.PATIENT) {
    return <Outlet />;
  }

  if (!onboardingLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading your onboarding status...
      </div>
    );
  }

  if (requireComplete && !onboardingComplete) {
    return <Navigate to="/patient-journey" replace />;
  }

  if (!requireComplete && onboardingComplete) {
    return <Navigate to={orgPath('/dashboard')} replace />;
  }

  return <Outlet />;
}
