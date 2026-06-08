import { useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { usePatientPortalStore } from '@/store';
import { cn } from '@/utils';

const NAV = [
  { to: '/patient', label: 'Dashboard', end: true },
  { to: '/patient/profile', label: 'Profile' },
  { to: '/patient/notifications', label: 'Notifications' },
  { to: '/patient/downloads', label: 'Downloads' },
];

export function PatientPortalLayout() {
  const navigate = useNavigate();
  const session = usePatientPortalStore((s) => s.session);
  const hydrated = usePatientPortalStore((s) => s.hydrated);
  const hydrate = usePatientPortalStore((s) => s.hydrate);
  const logout = usePatientPortalStore((s) => s.logout);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!session) {
    navigate('/patient/login', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link to="/patient" className="text-lg font-bold text-livotale-pink">
            Livotale Patient
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 transition-colors',
                    isActive ? 'bg-livotale-pink/10 font-medium text-livotale-pink' : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <NotificationBell inboxPath="/patient/notifications" patientPhone={session.phone} />
            <span className="text-muted-foreground">{session.patientName}</span>
            <Button size="sm" variant="outline" onClick={() => { logout(); navigate('/patient/login'); }}>
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
