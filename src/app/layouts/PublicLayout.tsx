import { Link, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/packages" className="text-xl font-bold text-livotale-pink">
            Livotale
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/packages" className="text-muted-foreground hover:text-foreground">
              Packages
            </Link>
            <Link to="/enquire" className="text-muted-foreground hover:text-foreground">
              Enquire
            </Link>
            <Link to="/patient/login" className="text-muted-foreground hover:text-foreground">
              Patient login
            </Link>
            <Button asChild size="sm" variant="outline">
              <Link to="/login">Staff login</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Livotale — Liver Fibrosis Scan
      </footer>
    </div>
  );
}
