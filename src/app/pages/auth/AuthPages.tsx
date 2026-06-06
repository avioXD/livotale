import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store';
import { APP_NAME, APP_TAGLINE } from '@/utils/constants';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch {
      // Error handled in store
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle={`Access your ${APP_NAME} account`}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/reset-password" className="text-xs text-primary hover:underline">
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
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'PATIENT',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await register({
        ...form,
        role: form.role as import('@/types').AppRole,
      });
      navigate('/dashboard');
    } catch {
      // Error handled in store
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Join the Livotel liver care ecosystem">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-email">Email</Label>
          <Input
            id="reg-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-password">Password</Label>
          <Input
            id="reg-password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="PATIENT">Patient</option>
            <option value="TECHNICIAN">Technician</option>
            <option value="DOCTOR">Doctor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await resetPassword({ email });
      setSubmitted(true);
    } catch {
      // Error handled in store
    }
  };

  return (
    <AuthLayout title="Reset password" subtitle="We'll send you a reset link">
      {submitted ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            If an account exists for <strong>{email}</strong>, you will receive a password reset
            link shortly.
          </p>
          <Link to="/login" className="text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send reset link'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
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
        <p className="text-sm text-white/70">© {new Date().getFullYear()} Livotel. All rights reserved.</p>
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
