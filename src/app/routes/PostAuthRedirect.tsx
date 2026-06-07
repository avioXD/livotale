import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, useJourneyStore, useStaffOnboardingStore, useUserRole } from '@/store';
import { AppRole } from '@/types';
import { resolvePatientHomePath } from '@/utils/journeyHelpers';
import { getDefaultHomePath } from '@/app/config/navigation';

const STAFF_ONBOARDING_ROLES: AppRole[] = [
  AppRole.TECHNICIAN,
  AppRole.DOCTOR,
  AppRole.LAB_PARTNER,
  AppRole.DIETICIAN,
  AppRole.HEALTH_COACH,
  AppRole.PHARMACY,
];

export function PostAuthRedirect() {
  const userRole = useUserRole();
  const userId = useAuthStore((s) => s.user?.id);
  const onboardingComplete = useJourneyStore((state) => state.onboardingComplete);
  const onboardingLoaded = useJourneyStore((state) => state.onboardingLoaded);
  const loadOnboardingStatus = useJourneyStore((state) => state.loadOnboardingStatus);
  const staffStatus = useStaffOnboardingStore((s) => s.status);
  const staffLoaded = useStaffOnboardingStore((s) => s.loaded);
  const loadStaffOnboarding = useStaffOnboardingStore((s) => s.loadStatus);

  const needsStaffGate = userRole != null && STAFF_ONBOARDING_ROLES.includes(userRole);

  useEffect(() => {
    if (userRole === AppRole.PATIENT) {
      void loadOnboardingStatus();
    }
  }, [userRole, loadOnboardingStatus]);

  useEffect(() => {
    if (needsStaffGate && userId) {
      void loadStaffOnboarding(userId);
    }
  }, [needsStaffGate, userId, loadStaffOnboarding]);

  if (userRole === AppRole.PATIENT && !onboardingLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Preparing your account...
      </div>
    );
  }

  if (needsStaffGate && !staffLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Preparing your account...
      </div>
    );
  }

  if (userRole === AppRole.PATIENT) {
    return <Navigate to={resolvePatientHomePath(onboardingComplete)} replace />;
  }

  if (needsStaffGate && staffStatus?.required && !staffStatus.canAccessApp) {
    return <Navigate to="/staff/onboarding" replace />;
  }

  return <Navigate to={getDefaultHomePath(userRole)} replace />;
}
