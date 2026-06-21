import { Link, useLocation } from 'react-router-dom';
import { PATIENT_PORTAL_BOTTOM_NAV, isPatientPortalNavActive } from '@/app/config/patientPortalNav';
import { cn } from '@/utils';

export function PatientPortalBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {PATIENT_PORTAL_BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const active = isPatientPortalNavActive(pathname, item);
          return (
            <li key={item.id} className="flex-1">
              <Link
                to={item.to}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors',
                  active ? 'text-livotale-pink' : 'text-muted-foreground',
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'text-livotale-pink')} />
                <span>{item.id === 'dashboard' ? 'Home' : item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
