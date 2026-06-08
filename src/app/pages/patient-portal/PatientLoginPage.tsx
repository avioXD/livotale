import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiPhone, FiUser } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { patientPortalService } from '@/services/liverCare';
import { usePatientPortalStore } from '@/store';
import { isMockMode } from '@/services/mock/mockConfig';

export function PatientLoginPage() {
  const navigate = useNavigate();
  const setSession = usePatientPortalStore((s) => s.setSession);
  const demoPatients = patientPortalService.getDemoPatients();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'otp'>('phone');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoPhone = patientPortalService.getDemoPhoneHint();

  const completeLogin = (session: Awaited<ReturnType<typeof patientPortalService.verifyOtp>>) => {
    setSession(session);
    navigate('/patient', { replace: true });
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await patientPortalService.sendOtp(phone.trim());
      setOtpStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
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

  const handleBypassOtp = async (demoPhoneNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await patientPortalService.bypassOtpLogin(demoPhoneNumber);
      completeLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const session = await patientPortalService.loginWithPassword(identifier.trim(), password);
      completeLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const applyDemoPassword = (username: string, demoPassword: string) => {
    setError(null);
    setIdentifier(username);
    setPassword(demoPassword);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Patient portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to view orders, reports, and payments</p>
        </div>

        {isMockMode() && (
          <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
            <p>
              Demo OTP: <strong>123456</strong> · Phone <strong>{demoPhone}</strong> (pending payment) or{' '}
              <strong>9988776655</strong> (published report)
            </p>
            <div className="space-y-1">
              <p className="font-medium">Quick login (OTP bypass)</p>
              <div className="flex flex-wrap gap-2">
                {demoPatients.map((patient) => (
                  <Button
                    key={patient.phone}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto border-amber-300 bg-white py-1 text-xs"
                    disabled={loading}
                    onClick={() => void handleBypassOtp(patient.phone)}
                  >
                    {patient.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Tabs defaultValue="otp" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="otp">Mobile OTP</TabsTrigger>
            <TabsTrigger value="password">Username</TabsTrigger>
          </TabsList>

          <TabsContent value="otp">
            {otpStep === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4 pt-2">
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending…' : 'Send OTP'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
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
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Verifying…' : 'Login'}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setOtpStep('phone')}>
                  Change phone number
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="password">
            <form onSubmit={handlePasswordLogin} className="space-y-4 pt-2">
              {isMockMode() && (
                <div className="space-y-2 rounded-md border border-dashed border-muted-foreground/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Demo patient account</p>
                  {demoPatients
                    .filter((patient): patient is typeof patient & { username: string; password: string } =>
                      'username' in patient && 'password' in patient,
                    )
                    .map((patient) => (
                      <Button
                        key={patient.username}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => applyDemoPassword(patient.username, patient.password)}
                      >
                        {patient.label}
                      </Button>
                    ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="identifier">Username or mobile</Label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="patient.rohan"
                    className="pl-10"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/packages" className="text-livotale-pink hover:underline">View packages</Link>
          {' · '}
          <Link to="/login" className="hover:underline">Staff login</Link>
        </p>
      </div>
    </div>
  );
}
