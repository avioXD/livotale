import { Outlet } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store';
import { APP_NAME } from '@/utils/constants';

export function OnboardingShell() {
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center gap-2">
          <img src="/assets/livotale-logo.png" alt="" className="h-8 w-8 object-contain" />
          <div>
            <p className="text-sm font-bold text-livotale-pink">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">Patient onboarding</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Sign out">
          <FiLogOut className="h-5 w-5" />
        </Button>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
