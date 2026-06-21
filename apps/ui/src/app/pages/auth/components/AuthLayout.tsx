import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_TAGLINE } from '@/utils/constants';
import { RoleSelectionGate } from '@/app/pages/auth/components/RoleSelectionGate';
import type { AppRole } from '@/types';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onRoleSelected?: (role: AppRole) => void | Promise<void>;
}

export function AuthLayout({ title, subtitle, children, onRoleSelected }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-livotale-pink to-livotale-teal p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <img src="/assets/livotale-logo.png" alt="LivoTale" className="h-12 w-auto object-contain" />
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Fibrosis screening at your doorstep.</h2>
          <p className="mt-4 text-white/90">{APP_TAGLINE}</p>
        </div>
        <p className="text-sm text-white/70">
          © {new Date().getFullYear()} LivoTale. All rights reserved.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center p-6 lg:w-1/2">
        <div className="mb-8 lg:hidden">
          <img src="/assets/livotale-logo.png" alt="LivoTale" className="h-10 w-auto object-contain" />
        </div>

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
      <RoleSelectionGate onRoleSelected={onRoleSelected} />
    </div>
  );
}
