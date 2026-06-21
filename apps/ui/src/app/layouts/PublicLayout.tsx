import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { WHATSAPP_MESSAGES } from '@/app/config/whatsappMessages';
import { CONTACT, LANDING_ASSETS } from '@/app/pages/public/landingContent';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getDefaultHomePath } from '@/app/config/navigation';
import { orgPath } from '@/app/config/orgRoutes';
import { useAuthStore, usePatientPortalStore, useUserRole } from '@/store';
import { cn, getInitialsFromFullName } from '@/utils';

const LANDING_NAV = [
  { href: '/#why-fibrosis', label: 'Why FibroScan' },
  { href: '/#packages', label: 'Packages' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#doctor', label: 'Doctor' },
] as const;

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRole = useUserRole();
  const dashboardPath = userRole ? getDefaultHomePath(userRole) : orgPath('/dashboard');
  const patientSession = usePatientPortalStore((s) => s.session);
  const hydratePatient = usePatientPortalStore((s) => s.hydrate);
  const patientPortalPath = patientSession?.needsOnboarding ? '/patient/onboarding' : '/patient';

  useEffect(() => {
    hydratePatient();
  }, [hydratePatient]);

  return (
    <div className={`min-h-screen ${isLanding ? 'bg-black' : 'bg-white'}`}>
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md ${
          isLanding
            ? 'border-white/10 bg-black/85'
            : 'border-slate-100 bg-white/90'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link
              to="/"
              aria-label="Go to LivoTale home"
              className="flex shrink-0 items-center"
              onClick={(e) => {
                if (location.pathname !== '/') return;

                e.preventDefault();
                if (location.hash) {
                  navigate('/', { replace: true });
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <img
                src={LANDING_ASSETS.logo}
                alt="LivoTale"
                className="h-9 w-auto object-contain"
              />
            </Link>

          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            {isLanding &&
              LANDING_NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-neutral-300 transition hover:text-white md:inline"
                >
                  {item.label}
                </a>
              ))}

            <Link
              to="/enquire"
              className={cn(
                'hidden rounded-md px-3 py-1.5 text-sm font-medium md:inline',
                isLanding ? 'text-neutral-300 hover:text-white' : 'text-slate-500 hover:text-livotale-teal',
              )}
            >
              Enquire
            </Link>

            {!isLanding && (
              <Link
                to="/packages"
                className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-livotale-pink hover:bg-livotale-pink/5 sm:inline"
              >
                Packages
              </Link>
            )}

            {isAuthenticated ? (
              <Button
                asChild
                size="sm"
                className="bg-livotale-teal text-white hover:bg-livotale-teal/90"
              >
                <Link to={dashboardPath}>Dashboard</Link>
              </Button>
            ) : patientSession ? (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={patientPortalPath}
                      aria-label={`Signed in as ${patientSession.patientName}. Go to patient portal`}
                      className={cn(
                        'flex items-center gap-2 rounded-full border p-0.5 transition-colors',
                        isLanding
                          ? 'border-livotale-teal/40 hover:border-livotale-teal/70'
                          : 'border-livotale-pink/30 hover:border-livotale-pink/50',
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={cn(
                            'text-xs font-semibold',
                            isLanding
                              ? 'bg-livotale-teal/20 text-livotale-teal'
                              : 'bg-livotale-pink/10 text-livotale-pink',
                          )}
                        >
                          {getInitialsFromFullName(patientSession.patientName)}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          'hidden max-w-[7rem] truncate pr-2 text-sm font-medium sm:inline',
                          isLanding ? 'text-neutral-200' : 'text-foreground',
                        )}
                      >
                        {patientSession.patientName.split(' ')[0]}
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="font-medium">{patientSession.patientName}</p>
                    <p className="text-xs text-muted-foreground">Patient portal</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <>
                <Button
                  asChild
                  size="sm"
                  className="hidden bg-gradient-to-r from-livotale-pink to-livotale-teal text-white hover:opacity-90 sm:inline-flex"
                >
                  <a href="/#packages">Book a Scan</a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className={
                    isLanding
                      ? 'border-livotale-teal/40 text-livotale-teal hover:bg-livotale-teal/10'
                      : 'border-livotale-pink/30 text-livotale-pink hover:bg-livotale-pink/5'
                  }
                >
                  <Link to="/patient/login">
                    <LogIn className="mr-1.5 h-4 w-4" />
                    Login
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className={isLanding ? '' : 'mx-auto max-w-6xl px-4 py-8'}>
        <Outlet />
      </main>

      <footer
        className={`border-t py-10 ${
          isLanding ? 'border-white/10 bg-neutral-950' : 'border-slate-100 bg-slate-50'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-start">
            <div className="text-center sm:text-left">
              <img
                src={LANDING_ASSETS.logo}
                alt="LivoTale"
                className="mx-auto h-8 w-auto object-contain sm:mx-0"
              />
              <p className={`mt-2 text-sm ${isLanding ? 'text-neutral-400' : 'text-slate-500'}`}>
                Professional liver fibrosis screening delivered to your door.
              </p>
            </div>
            <div className={`text-center text-sm sm:text-right ${isLanding ? 'text-neutral-400' : 'text-slate-500'}`}>
              <p>
                <a
                  href={`tel:${CONTACT.phone.replace(/\s/g, '')}`}
                  className="font-medium text-livotale-teal hover:underline"
                >
                  {CONTACT.phone}
                </a>
              </p>
              <p>
                <a href={`mailto:${CONTACT.email}`} className="hover:text-livotale-pink hover:underline">
                  {CONTACT.email}
                </a>
              </p>
              {isLanding && (
                <div className="mt-3 flex justify-center gap-4 sm:justify-end">
                  <a href="/#packages" className="hover:text-white">
                    Packages
                  </a>
                  <a href="/#login" className="hover:text-white">
                    Login
                  </a>
                </div>
              )}
            </div>
          </div>
          <p className={`mt-8 text-center text-xs ${isLanding ? 'text-neutral-600' : 'text-slate-400'}`}>
            © {new Date().getFullYear()} LivoTale. All rights reserved.
          </p>
        </div>
      </footer>

      <div className="fixed bottom-6 right-6 z-50">
        <WhatsAppButton variant="icon" message={WHATSAPP_MESSAGES.general} />
      </div>
    </div>
  );
}
