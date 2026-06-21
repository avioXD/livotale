import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth/authStore';
import { AppRole } from '@/types';
import { integrationsAdminService, type PlatformSettings } from '@/services/admin/IntegrationsAdminService';
import { AdminIntegrationsPageShell, SuperAdminOnlyNotice } from './shared';

export function AdminEmailConfigPage() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const [settings, setSettings] = useState<Partial<PlatformSettings>>({});
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (role !== AppRole.SUPER_ADMIN) return;
    void integrationsAdminService.getSettings().then(setSettings);
  }, [role]);

  const saveSettings = async () => {
    const updated = await integrationsAdminService.updateSettings(settings);
    setSettings(updated);
    setMessage('Email settings saved.');
  };

  const sendTest = async () => {
    await integrationsAdminService.testEmail(testEmail, 'payment_link_sent');
    setMessage(`Test email sent to ${testEmail}.`);
  };

  return (
    <AdminIntegrationsPageShell role={role} title="SendGrid email" description="Configure sender identity and transactional email delivery." badge={settings.sendgridConfigured ? 'Configured' : 'Not configured'}>
      {role !== AppRole.SUPER_ADMIN ? <SuperAdminOnlyNotice /> : (
        <>
          {message ? <div className="rounded-md border bg-muted/40 px-4 py-2 text-sm">{message}</div> : null}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SendGrid configuration</CardTitle>
              <CardDescription>Store your SendGrid API key and sender profile here. Use an authenticated domain in production.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>API Key</Label>
                <Input type="password" placeholder="Leave blank to keep existing" onChange={(e) => setSettings((s) => ({ ...s, sendgridApiKey: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>From email</Label>
                <Input value={settings.sendgridFromEmail ?? ''} onChange={(e) => setSettings((s) => ({ ...s, sendgridFromEmail: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>From name</Label>
                <Input value={settings.sendgridFromName ?? ''} onChange={(e) => setSettings((s) => ({ ...s, sendgridFromName: e.target.value }))} />
              </div>
              <div className="md:col-span-2"><Button onClick={() => void saveSettings()}>Save email settings</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test email</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Input className="max-w-sm" placeholder="you@example.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
              <Button variant="secondary" onClick={() => void sendTest()} disabled={!testEmail}>Send test email</Button>
            </CardContent>
          </Card>
        </>
      )}
    </AdminIntegrationsPageShell>
  );
}
