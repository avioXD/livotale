import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/app/pages/auth/components/AuthLayout';
import { ORG_LOGIN_PATH } from '@/app/config/orgRoutes';
import { getDefaultHomePath } from '@/app/config/navigation';
import { useAuthStore } from '@/store';

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    mobile: '',
    password: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await register({
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        email: form.email || undefined,
        mobile: form.mobile || undefined,
      });
      if (useAuthStore.getState().requiresRoleSelection) {
        return;
      }
      navigate(getDefaultHomePath(useAuthStore.getState().user?.role ?? null), { replace: true });
    } catch {
      // Error handled in store
    }
  };

  return (
    <AuthLayout
      title="Patient registration"
      subtitle="Create a patient account. Staff accounts are provisioned by your clinic administrator."
      onRoleSelected={() => navigate(getDefaultHomePath(useAuthStore.getState().user?.role ?? null), { replace: true })}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            placeholder="patient.jane"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            autoComplete="username"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-email">Email (optional)</Label>
          <Input
            id="reg-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile (optional if email provided)</Label>
          <Input
            id="mobile"
            type="tel"
            placeholder="+919999999999"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-password">Password</Label>
          <Input
            id="reg-password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create patient account'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to={ORG_LOGIN_PATH} className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
