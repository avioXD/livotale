import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useJourneyStore, useUserRole } from '@/store';
import { AppRole } from '@/types';
import { resolvePatientHomePath } from '@/utils/journeyHelpers';

export function PostAuthRedirect() {
  const userRole = useUserRole();
  const onboardingComplete = useJourneyStore((state) => state.onboardingComplete);
  const onboardingLoaded = useJourneyStore((state) => state.onboardingLoaded);
  const loadOnboardingStatus = useJourneyStore((state) => state.loadOnboardingStatus);

  useEffect(() => {
    if (userRole === AppRole.PATIENT) {
      void loadOnboardingStatus();
    }
  }, [userRole, loadOnboardingStatus]);

  if (userRole === AppRole.PATIENT && !onboardingLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Preparing your account...
      </div>
    );
  }

  if (userRole === AppRole.PATIENT) {
    return <Navigate to={resolvePatientHomePath(onboardingComplete)} replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
