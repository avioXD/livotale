import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiLock, FiMail, FiPhone, FiUser } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthLayout } from '@/app/pages/auth/components/AuthLayout';
import { authService } from '@/services';
import { useAuthStore } from '@/store';
import { APP_NAME, DEV_LOGIN } from '@/utils/constants';

const DEV_QUICK_USERS = [
  { label: 'Doctor', username: 'doctor.iyer', password: 'Doctor@123' },
  { label: 'Admin', username: 'admin.ops', password: 'Admin@123' },
  { label: 'Patient', username: 'patient.rohan', password: 'Patient@123' },
  { label: 'Technician', username: 'tech.vinod', password: 'Tech@123' },
  { label: 'Lab', username: 'lab.ops', password: 'Lab@123' },
] as const;

function devLoginDefaults() {
  if (!import.meta.env.DEV) return { identifier: '', password: '' };
  return { identifier: DEV_LOGIN.username, password: DEV_LOGIN.password };
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next');
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const defaults = devLoginDefaults();
  const [identifier, setIdentifier] = useState(defaults.identifier);
  const [password, setPassword] = useState(defaults.password);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login({ identifier, password });
      navigate(nextPath && nextPath.startsWith('/') ? nextPath : '/', { replace: true });
    } catch {
      // Error handled in store
    }
  };

  const handleRequestOtp = async () => {
    clearError();
    setOtpLoading(true);
    try {
      const result = await authService.requestOtp({ mobile });
      setOtpSent(true);
      if (result.devOtp) setDevOtpHint(result.devOtp);
    } catch (err) {
      useAuthStore.setState({
        error: err instanceof Error ? err.message : 'Failed to send OTP',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpLogin = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setOtpLoading(true);
    try {
      const response = await authService.verifyOtp({ mobile, otp });
      useAuthStore.setState({
        user: response.user,
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken ?? null,
        isAuthenticated: true,
        error: null,
      });
      navigate(nextPath && nextPath.startsWith('/') ? nextPath : '/', { replace: true });
    } catch (err) {
      useAuthStore.setState({
        error: err instanceof Error ? err.message : 'OTP verification failed',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const applyDevUser = (user: (typeof DEV_QUICK_USERS)[number]) => {
    clearError();
    setIdentifier(user.username);
    setPassword(user.password);
  };

  return (
    <AuthLayout title="Sign in" subtitle={`Access your ${APP_NAME} account`}>
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs defaultValue="password" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">Email / Username</TabsTrigger>
          <TabsTrigger value="otp">Mobile OTP</TabsTrigger>
        </TabsList>

        <TabsContent value="password">
          <form onSubmit={(e) => void handlePasswordLogin(e)} className="space-y-4 pt-2">
            {import.meta.env.DEV && (
              <div className="space-y-2 rounded-md border border-dashed border-muted-foreground/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">Dev quick login</p>
                <div className="flex flex-wrap gap-2">
                  {DEV_QUICK_USERS.map((user) => (
                    <Button
                      key={user.username}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyDevUser(user)}
                    >
                      {user.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="identifier">Email, username, or mobile</Label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="identifier"
                  type="text"
                  placeholder="doctor.iyer or email@example.com"
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
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="otp">
          <form onSubmit={(e) => void handleOtpLogin(e)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile number</Label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="+919900000001"
                  className="pl-10"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                />
              </div>
            </div>

            {!otpSent ? (
              <Button
                type="button"
                className="w-full"
                disabled={otpLoading || !mobile}
                onClick={() => void handleRequestOtp()}
              >
                {otpLoading ? 'Sending...' : 'Send OTP'}
              </Button>
            ) : (
              <>
                {devOtpHint && import.meta.env.DEV && (
                  <p className="text-xs text-muted-foreground">Dev OTP: {devOtpHint}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="otp">One-time password</Label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="6-digit code"
                      className="pl-10"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={otpLoading}>
                  {otpLoading ? 'Verifying...' : 'Verify & sign in'}
                </Button>
              </>
            )}
          </form>
        </TabsContent>
      </Tabs>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-primary hover:underline">
          Register as patient
        </Link>
      </p>
    </AuthLayout>
  );
}
