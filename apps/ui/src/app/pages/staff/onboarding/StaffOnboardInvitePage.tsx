import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { orgPath, ORG_LOGIN_PATH } from '@/app/config/orgRoutes';
import { AuthLayout } from '@/app/pages/auth/components/AuthLayout';
import { STAFF_ROLE_CONFIGS } from '@/app/pages/admin/staff/staffHubConfig';
import { Button } from '@/components/ui/button';
import { staffOnboardingService } from '@/services/staff/StaffOnboardingService';
import { useAuthStore } from '@/store';
import type { StaffOnboardingInvite } from '@/types/staffOnboarding';

export function StaffOnboardInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const [invite, setInvite] = useState<StaffOnboardingInvite | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        setInvite(await staffOnboardingService.getInvite(token));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid onboarding link');
      }
    })();
  }, [token]);

  const continueFlow = async () => {
    if (!token) return;
    if (isAuthenticated) {
      try {
        await staffOnboardingService.attachUser(token, userId);
      } catch {
        // demo attach may noop
      }
      navigate(orgPath(`/staff/onboarding?invite=${token}`), { replace: true });
      return;
    }
    navigate(`${orgPath('/staff/register')}?invite=${token}`, { replace: true });
  };

  const handleRoleSelected = async () => {
    await continueFlow();
  };

  const roleLabel = invite
    ? STAFF_ROLE_CONFIGS.find((r) => r.key === invite.roleKey)?.label ?? invite.roleKey
    : 'Staff';

  return (
    <AuthLayout
      title="Staff onboarding"
      subtitle={invite ? `${invite.fullName}, complete your ${roleLabel} profile to get started.` : 'Loading invite…'}
      onRoleSelected={handleRoleSelected}
    >
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {invite && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Mobile: <span className="font-medium text-foreground">{invite.mobile}</span>
          </p>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200">
            Your account stays inactive until profile and document verification are complete.
          </p>
          <Button className="w-full" onClick={() => void continueFlow()}>
            {isAuthenticated ? 'Continue onboarding' : 'Register & continue'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link to={`${ORG_LOGIN_PATH}?next=${orgPath(`/staff/onboard/${token}`)}`} className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}
    </AuthLayout>
  );
}
