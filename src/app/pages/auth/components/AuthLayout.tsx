import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME, APP_TAGLINE } from '@/utils/constants';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-livotel-pink to-livotel-teal p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <img src="/assets/livotale-logo.png" alt="Livotel" className="h-12 w-12 object-contain" />
          <span className="text-2xl font-bold">{APP_NAME}</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Liver care, delivered.</h2>
          <p className="mt-4 text-white/90">{APP_TAGLINE}</p>
        </div>
        <p className="text-sm text-white/70">
          © {new Date().getFullYear()} Livotel. All rights reserved.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center p-6 lg:w-1/2">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <img src="/assets/livotale-logo.png" alt="Livotel" className="h-10 w-10" />
          <span className="text-xl font-bold text-livotel-pink">{APP_NAME}</span>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
