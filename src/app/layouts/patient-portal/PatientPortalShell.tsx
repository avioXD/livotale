import { Outlet, useLocation } from 'react-router-dom';
import { PatientPortalSidebar } from '@/app/layouts/patient-portal/PatientPortalSidebar';
import { PatientPortalTopBar } from '@/app/layouts/patient-portal/PatientPortalTopBar';
import { PatientPortalBottomNav } from '@/app/layouts/patient-portal/PatientPortalBottomNav';
import { cn } from '@/utils';

interface PatientPortalShellProps {
  patientName: string;
  patientPhone: string;
  needsOnboarding: boolean;
  onLogout: () => void;
}

export function PatientPortalShell({
  patientName,
  patientPhone,
  needsOnboarding,
  onLogout,
}: PatientPortalShellProps) {
  const { pathname } = useLocation();
  const isOnboarding = pathname.startsWith('/patient/onboarding');
  const showNav = !isOnboarding && !needsOnboarding;

  return (
    <div className="flex min-h-[100dvh] bg-slate-50 lg:h-screen lg:overflow-hidden">
      {showNav && (
        <div className="hidden shrink-0 lg:block">
          <PatientPortalSidebar patientName={patientName} onLogout={onLogout} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {isOnboarding ? (
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
            <img src="/assets/livotale-logo.png" alt="Livotale" className="h-7 w-auto object-contain" />
            <span className="text-sm text-muted-foreground">Complete your profile</span>
          </header>
        ) : (
          <PatientPortalTopBar
            patientName={patientName}
            patientPhone={patientPhone}
            showNotifications={showNav}
            showMobileMenu={showNav}
            onLogout={onLogout}
          />
        )}

        <main
          className={cn(
            'flex-1 overflow-y-auto',
            showNav && 'pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0',
          )}
        >
          <div className="mx-auto w-full max-w-5xl px-4 py-4 md:px-6 md:py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {showNav && <PatientPortalBottomNav />}
    </div>
  );
}
