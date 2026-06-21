import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PatientPortalShell } from '@/app/layouts/patient-portal/PatientPortalShell';
import { usePatientPortalStore } from '@/store';

export function PatientPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = usePatientPortalStore((s) => s.session);
  const hydrated = usePatientPortalStore((s) => s.hydrated);
  const hydrate = usePatientPortalStore((s) => s.hydrate);
  const logout = usePatientPortalStore((s) => s.logout);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!session) {
    navigate('/patient/login', { replace: true });
    return null;
  }

  if (session.needsOnboarding && !location.pathname.startsWith('/patient/onboarding')) {
    navigate('/patient/onboarding', { replace: true });
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/patient/login');
  };

  return (
    <PatientPortalShell
      patientName={session.patientName}
      patientPhone={session.phone}
      needsOnboarding={session.needsOnboarding ?? false}
      onLogout={handleLogout}
    />
  );
}
