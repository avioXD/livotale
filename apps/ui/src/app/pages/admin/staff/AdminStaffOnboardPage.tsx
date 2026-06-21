import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCopy, FiSend } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { canManageStaff } from '@/app/config/productRoles';
import { STAFF_ROLE_CONFIGS, staffRoleFromSlug, staffRolePath } from '@/app/pages/admin/staff/staffHubConfig';
import { staffOnboardingLink, staffRegisterLink } from '@/app/pages/staff/onboarding/staffOnboardingUtils';
import { orgPath } from '@/app/config/orgRoutes';
import { useUserRole } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { staffOnboardingService } from '@/services/staff/StaffOnboardingService';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import type { StaffOnboardingInvite } from '@/types/staffOnboarding';
import type { StaffRoleKey } from '@/types/staffHub';

const ONBOARD_TABS = ['send-link', 'admin-complete'] as const;

export function AdminStaffOnboardPage() {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const navigate = useNavigate();
  const userRole = useUserRole();
  const roleKey = staffRoleFromSlug(roleSlug);
  const roleConfig = roleKey ? STAFF_ROLE_CONFIGS.find((r) => r.key === roleKey) : undefined;
  const [activeTab, setActiveTab] = useUrlTabState({
    defaultValue: 'send-link',
    validValues: ONBOARD_TABS,
    omitDefault: true,
  });

  const [form, setForm] = useState({ fullName: '', mobile: '', email: '', username: '' });
  const [invite, setInvite] = useState<StaffOnboardingInvite | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  if (!canManageStaff(userRole)) {
    return <Navigate to={orgPath('/admin/staff/technicians')} replace />;
  }

  if (!roleKey || !roleConfig) {
    return <Navigate to={orgPath('/admin/staff/technicians')} replace />;
  }

  if (roleKey === 'lab_partner') {
    return <Navigate to={orgPath('/admin/staff/lab-partners/new')} replace />;
  }

  const createInvite = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const created = await staffOnboardingService.createInvite(roleKey as StaffRoleKey, {
        fullName: form.fullName.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim() || undefined,
        username: form.username.trim() || undefined,
      });
      setInvite(created);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdminComplete = async (e: FormEvent) => {
    e.preventDefault();
    const created = await createInvite();
    if (!created) return;
    navigate(`${staffRolePath(roleKey)}/${created.memberId ?? created.id}?tab=profile&onboard=admin`);
  };

  const handleSendLink = async (e: FormEvent) => {
    e.preventDefault();
    const created = invite ?? (await createInvite());
    if (!created) return;
    setIsSaving(true);
    try {
      await staffOnboardingService.sendLink(created.token);
      setLinkSent(true);
      setInvite(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send link');
    } finally {
      setIsSaving(false);
    }
  };

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onboardUrl = invite ? staffOnboardingLink(invite.token) : '';
  const registerUrl = invite ? staffRegisterLink(invite.token) : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`${staffRolePath(roleKey)}?section=users`}>
            <FiArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <PageHeader
          title={`Add ${roleConfig.label.replace(/s$/, '')}`}
          description="Provision a new team member with full profile, documents, and employment details. Send an onboarding link or complete the form as admin."
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Full name</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div>
            <Label>Mobile</Label>
            <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="+91…" required />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Username (optional)</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="send-link">Send onboarding link</TabsTrigger>
          <TabsTrigger value="admin-complete">Admin completes form</TabsTrigger>
        </TabsList>

        <TabsContent value="send-link" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Staff stays inactive until they complete the profile and HR verifies all required documents.
          </p>
          <form onSubmit={(e) => void handleSendLink(e)} className="space-y-4">
            <Button type="submit" disabled={isSaving || !form.fullName || !form.mobile} className="gap-2">
              <FiSend className="h-4 w-4" />
              Generate &amp; mark link sent
            </Button>
          </form>

          {invite && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Share with {invite.fullName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {linkSent && (
                  <p className="text-green-700 dark:text-green-300">
                    Link queued for SMS to {invite.mobile} (demo — copy link below in dev).
                  </p>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Onboarding link</Label>
                  <div className="mt-1 flex gap-2">
                    <Input readOnly value={onboardUrl} />
                    <Button type="button" variant="outline" size="icon" onClick={() => void copyLink(onboardUrl)}>
                      <FiCopy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Self-register link</Label>
                  <div className="mt-1 flex gap-2">
                    <Input readOnly value={registerUrl} />
                    <Button type="button" variant="outline" size="icon" onClick={() => void copyLink(registerUrl)}>
                      <FiCopy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {copied && <p className="text-xs text-muted-foreground">Copied to clipboard.</p>}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="admin-complete" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            You will complete the full employee profile now — employment details, address, role fields, and legal documents.
          </p>
          <form onSubmit={(e) => void handleAdminComplete(e)}>
            <Button type="submit" disabled={isSaving || !form.fullName || !form.mobile}>
              Continue to full profile form
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
