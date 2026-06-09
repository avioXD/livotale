import { Link, Outlet } from 'react-router-dom';
import { WHATSAPP_MESSAGES } from '@/app/config/whatsappMessages';
import { CONTACT } from '@/app/pages/public/landingContent';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { Button } from '@/components/ui/button';
import { getDefaultHomePath } from '@/app/config/navigation';
import { useAuthStore, useUserRole } from '@/store';

export function PublicLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRole = useUserRole();
  const dashboardPath = userRole ? getDefaultHomePath(userRole) : '/dashboard';

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-livotale-pink to-livotale-teal text-sm font-bold text-white">
              L
            </span>
            <span className="text-xl font-bold text-slate-900">
              Livo<span className="text-livotale-pink">tale</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm sm:gap-3">
            <a
              href="/#packages"
              className="hidden rounded-md px-3 py-1.5 font-medium text-livotale-pink hover:bg-livotale-pink/5 sm:inline"
            >
              Packages
            </a>
            <a
              href="/#how-it-works"
              className="hidden text-slate-500 hover:text-livotale-teal md:inline"
            >
              How it works
            </a>
            <Link to="/patient/login" className="hidden text-slate-500 hover:text-livotale-teal sm:inline">
              Patient login
            </Link>
            {isAuthenticated ? (
              <Button
                asChild
                size="sm"
                className="bg-livotale-teal text-white hover:bg-livotale-teal/90"
              >
                <Link to={dashboardPath}>Dashboard</Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-livotale-pink/30 text-livotale-pink hover:bg-livotale-pink/5"
              >
                <Link to="/login">Staff login</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-100 bg-slate-50 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-start">
            <div className="text-center sm:text-left">
              <p className="text-lg font-bold text-slate-900">
                Livo<span className="text-livotale-pink">tale</span>
              </p>
              <p className="mt-1 text-sm text-slate-500">Professional liver screening delivered to your door.</p>
            </div>
            <div className="text-center text-sm text-slate-500 sm:text-right">
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
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Livotale. All rights reserved.
          </p>
        </div>
      </footer>
      <div className="fixed bottom-6 right-6 z-50">
        <WhatsAppButton variant="icon" message={WHATSAPP_MESSAGES.general} />
      </div>
    </div>
  );
}
