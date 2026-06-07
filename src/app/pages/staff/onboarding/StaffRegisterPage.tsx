import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/app/pages/auth/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { staffOnboardingService } from '@/services/staff/StaffOnboardingService';
import { useAuthStore } from '@/store';
import type { StaffOnboardingInvite } from '@/types/staffOnboarding';

export function StaffRegisterPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [invite, setInvite] = useState<StaffOnboardingInvite | null>(null);
  const [form, setForm] = useState({ username: '', fullName: '', email: '', mobile: '', password: '' });

  useEffect(() => {
    if (!inviteToken) return;
    void staffOnboardingService.getInvite(inviteToken).then((inv) => {
      setInvite(inv);
      setForm((f) => ({
        ...f,
        fullName: inv.fullName,
        email: inv.email ?? '',
        mobile: inv.mobile,
        username: inv.username ?? f.username,
      }));
    });
  }, [inviteToken]);

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
      if (inviteToken) {
        const userId = useAuthStore.getState().user?.id;
        await staffOnboardingService.attachUser(inviteToken, userId);
        navigate(`/staff/onboarding?invite=${inviteToken}`, { replace: true });
      } else {
        navigate('/staff/onboarding', { replace: true });
      }
    } catch {
      // store handles error
    }
  };

  if (!inviteToken) {
    return (
      <AuthLayout title="Staff registration" subtitle="Use the onboarding link shared by your administrator.">
        <p className="text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">Sign in</Link> if you already have an account.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create staff account"
      subtitle={invite ? `Register as ${invite.roleKey.replace(/_/g, ' ')} — then complete your profile.` : 'Loading…'}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile</Label>
          <Input id="mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          Register &amp; continue onboarding
        </Button>
      </form>
    </AuthLayout>
  );
}
