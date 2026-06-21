import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMenu } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { PatientPortalBreadcrumbs } from '@/app/layouts/patient-portal/PatientPortalBreadcrumbs';
import { PatientPortalMobileMenu } from '@/app/layouts/patient-portal/PatientPortalMobileMenu';

interface PatientPortalTopBarProps {
  patientName: string;
  patientPhone: string;
  showNotifications: boolean;
  showMobileMenu: boolean;
  orderNumber?: string;
  onLogout: () => void;
}

export function PatientPortalTopBar({
  patientName,
  patientPhone,
  showNotifications,
  showMobileMenu,
  orderNumber,
  onLogout,
}: PatientPortalTopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:h-16 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {showMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <FiMenu className="h-5 w-5" />
            </Button>
          )}
          <Link to="/patient" className="shrink-0 lg:hidden" aria-label="Home">
            <img src="/assets/livotale-logo.png" alt="LivoTale" className="h-7 w-auto object-contain" />
          </Link>
          <div className="hidden min-w-0 lg:block">
            <PatientPortalBreadcrumbs orderNumber={orderNumber} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showNotifications && (
            <NotificationBell inboxPath="/patient/notifications" patientPhone={patientPhone} />
          )}
          <span className="hidden max-w-[8rem] truncate text-sm text-muted-foreground md:inline">
            {patientName}
          </span>
        </div>
      </header>

      {showMobileMenu && (
        <PatientPortalMobileMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          patientName={patientName}
          onLogout={onLogout}
        />
      )}
    </>
  );
}
