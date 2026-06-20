import { Link, useLocation } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  PATIENT_PORTAL_SECONDARY_NAV,
  PATIENT_PORTAL_SIDEBAR_NAV,
  isPatientPortalNavActive,
} from '@/app/config/patientPortalNav';
import { cn, getInitialsFromFullName } from '@/utils';

interface PatientPortalSidebarProps {
  patientName: string;
  onLogout: () => void;
}

export function PatientPortalSidebar({ patientName, onLogout }: PatientPortalSidebarProps) {
  const { pathname } = useLocation();

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-card">
      <Link
        to="/patient"
        aria-label="Go to patient dashboard"
        className="flex h-16 items-center border-b px-4 transition hover:bg-accent/50"
      >
        <img src="/assets/livotale-logo.png" alt="Livotale" className="h-9 w-auto object-contain" />
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Patient portal">
        {PATIENT_PORTAL_SIDEBAR_NAV.map((item) => {
          const Icon = item.icon;
          const active = isPatientPortalNavActive(pathname, item);
          return (
            <Link
              key={item.id}
              to={item.to}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-livotale-pink/10 text-livotale-pink'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <Separator className="my-3" />

        {PATIENT_PORTAL_SECONDARY_NAV.filter((item) => item.id !== 'logout').map((item) => {
          const Icon = item.icon;
          const active = 'to' in item && !item.external && pathname === item.to;
          const className = cn(
            'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
            active
              ? 'bg-livotale-pink/10 text-livotale-pink'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          );
          if (item.external) {
            return (
              <a key={item.id} href={item.to} className={className}>
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </a>
            );
          }
          return (
            <Link key={item.id} to={item.to} className={className}>
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-livotale-pink/10 text-xs text-livotale-pink">
              {getInitialsFromFullName(patientName)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm text-muted-foreground">{patientName}</span>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={onLogout}>
          <FiLogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
