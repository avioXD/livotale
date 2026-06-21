import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiLock, FiMail } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/app/pages/auth/components/AuthLayout';
import { DevStaffLoginShortcuts } from '@/app/pages/auth/components/DevStaffLoginShortcuts';
import type { DevStaffLoginShortcut } from '@/app/pages/auth/devStaffLoginShortcuts';
import { ORG_REGISTER_PATH, ORG_RESET_PASSWORD_PATH } from '@/app/config/orgRoutes';
import { getDefaultHomePath } from '@/app/config/navigation';
import { useAuthStore } from '@/store';
import { APP_NAME } from '@/utils/constants';

function resolvePostLoginDestination(nextPath: string | null): string {
  if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) {
    return nextPath;
  }
  const role = useAuthStore.getState().user?.role ?? null;
  return getDefaultHomePath(role);
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next');
  const passwordChanged = searchParams.get('reason') === 'password-changed';
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleRoleSelected = async () => {
    navigate(resolvePostLoginDestination(nextPath), { replace: true });
  };

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login({ identifier, password });
      const state = useAuthStore.getState();
      if (state.requiresRoleSelection) {
        return;
      }
      navigate(resolvePostLoginDestination(nextPath), { replace: true });
    } catch {
      // Error handled in store
    }
  };

  const handleDevShortcut = async (shortcut: DevStaffLoginShortcut) => {
    clearError();
    setIdentifier(shortcut.identifier);
    setPassword(shortcut.password);
    try {
      await login({
        identifier: shortcut.identifier,
        password: shortcut.password,
        activeRole: shortcut.activeRole,
      });
      const state = useAuthStore.getState();
      if (state.requiresRoleSelection) {
        return;
      }
      navigate(resolvePostLoginDestination(nextPath), { replace: true });
    } catch {
      // Error handled in store
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle={`Access your ${APP_NAME} account`}
      onRoleSelected={handleRoleSelected}
    >
      {passwordChanged && (
        <div className="mb-4 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          Password updated successfully. Sign in with your new password.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handlePasswordLogin(e)} className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="identifier">Email, username, or mobile</Label>
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="identifier"
              type="text"
              placeholder="you@livotale.com"
              className="pl-10"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to={ORG_RESET_PASSWORD_PATH} className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="pl-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-4">
        <DevStaffLoginShortcuts disabled={isLoading} onSelect={(shortcut) => void handleDevShortcut(shortcut)} />
      </div>

      <div className="mt-6 rounded-lg border border-livotale-teal/30 bg-livotale-teal/5 p-4 text-center">
        <p className="text-sm font-medium text-foreground">Are you a patient?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          View orders, liver health reports, prescriptions, and payments.
        </p>
        <Button variant="outline" className="mt-3 w-full border-livotale-teal text-livotale-teal hover:bg-livotale-teal/10" asChild>
          <Link to="/patient/login">Patient portal login</Link>
        </Button>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link to={ORG_REGISTER_PATH} className="text-primary hover:underline">
          Register as patient
        </Link>
      </p>
    </AuthLayout>
  );
}
