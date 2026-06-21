import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ORG_LOGIN_PATH } from '@/app/config/orgRoutes';
import { FiPhone } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { applyOtpSendMeta, useOtpResendCooldown } from '@/hooks/useOtpResendCooldown';
import { patientPortalService } from '@/services/liverCare';
import { usePatientPortalStore } from '@/store';
import { APP_TAGLINE } from '@/utils/constants';

function LoginFormPanel({
  error,
  otpStep,
  phone,
  setPhone,
  otp,
  setOtp,
  demoOtpHint,
  loading,
  remaining,
  canResend,
  onSendOtp,
  onVerifyOtp,
  onOtpStepBack,
}: {
  error: string | null;
  otpStep: 'phone' | 'otp';
  phone: string;
  setPhone: (v: string) => void;
  otp: string;
  setOtp: (v: string) => void;
  demoOtpHint: string | null;
  loading: boolean;
  remaining: number;
  canResend: boolean;
  onSendOtp: (e: React.FormEvent) => void;
  onVerifyOtp: (e: React.FormEvent) => void;
  onOtpStepBack: () => void;
}) {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="lg:hidden text-center">
        <img src="/assets/livotale-logo.png" alt="Livotale" className="mx-auto mb-4 h-10 w-auto object-contain" />
        <h1 className="text-2xl font-bold">Patient portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to view orders, reports, and payments</p>
      </div>

      <div className="hidden lg:block">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Access your orders, reports, and prescriptions</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {otpStep === 'phone' ? (
        <form onSubmit={onSendOtp} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="10-digit mobile"
                className="pl-10"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !canResend}>
            {loading ? 'Sending…' : canResend ? 'Send OTP' : `Resend in ${remaining}s`}
          </Button>
        </form>
      ) : (
        <form onSubmit={onVerifyOtp} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="otp">Enter OTP</Label>
            <Input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            {demoOtpHint && (
              <p className="text-xs text-muted-foreground">Demo code: {demoOtpHint}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verifying…' : 'Login'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={loading || !canResend}
            onClick={() => void onSendOtp({ preventDefault: () => {} } as React.FormEvent)}
          >
            {canResend ? 'Resend OTP' : `Resend in ${remaining}s`}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onOtpStepBack}>
            Change phone number
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/packages" className="text-livotale-pink hover:underline">View packages</Link>
        {' · '}
        <Link to={ORG_LOGIN_PATH} className="hover:underline">Staff login</Link>
      </p>
    </div>
  );
}

export function PatientLoginPage() {
  const navigate = useNavigate();
  const session = usePatientPortalStore((s) => s.session);
  const hydrated = usePatientPortalStore((s) => s.hydrated);
  const hydrate = usePatientPortalStore((s) => s.hydrate);
  const setSession = usePatientPortalStore((s) => s.setSession);
  const { remaining, canResend, startCooldown } = useOtpResendCooldown();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || !session) return;
    navigate(session.needsOnboarding ? '/patient/onboarding' : '/patient', { replace: true });
  }, [hydrated, session, navigate]);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'otp'>('phone');
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeLogin = (session: Awaited<ReturnType<typeof patientPortalService.verifyOtp>>) => {
    setSession(session);
    navigate(session.needsOnboarding ? '/patient/onboarding' : '/patient', { replace: true });
  };

  const sendOtp = async () => {
    if (!phone.trim() || !canResend) return;
    setLoading(true);
    setError(null);
    try {
      const result = await patientPortalService.sendOtp(phone.trim());
      const demoFromApi = applyOtpSendMeta(result, startCooldown);
      if (demoFromApi) setDemoOtpHint(demoFromApi);
      setOtpStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendOtp();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const session = await patientPortalService.verifyOtp(phone.trim(), otp.trim());
      completeLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <div className="hidden w-[45%] max-w-xl flex-col justify-between bg-gradient-to-br from-livotale-pink/10 via-white to-livotale-teal/10 p-10 lg:flex">
        <img src="/assets/livotale-logo.png" alt="Livotale" className="h-10 w-auto object-contain" />
        <div className="space-y-4">
          <h2 className="text-3xl font-bold leading-tight">Your liver care journey, in one place</h2>
          <p className="text-muted-foreground">{APP_TAGLINE}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Track scan and consultation schedules</li>
            <li>View reports and prescriptions</li>
            <li>Secure payments and downloads</li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">Need help? care@livotale.test</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8">
        <LoginFormPanel
          error={error}
          otpStep={otpStep}
          phone={phone}
          setPhone={setPhone}
          otp={otp}
          setOtp={setOtp}
          demoOtpHint={demoOtpHint}
          loading={loading}
          remaining={remaining}
          canResend={canResend}
          onSendOtp={handleSendOtp}
          onVerifyOtp={handleVerifyOtp}
          onOtpStepBack={() => setOtpStep('phone')}
        />
      </div>
    </div>
  );
}
