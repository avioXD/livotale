import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth/authStore';
import { AppRole } from '@/types';
import { integrationsAdminService, type PlatformSettings } from '@/services/admin/IntegrationsAdminService';
import {
  AdminIntegrationsPageShell,
  ConfigSourceSelect,
  ManagedByEnvNotice,
  MissingFieldsNotice,
  SuperAdminOnlyNotice,
} from './shared';

export function AdminEmailConfigPage() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const [settings, setSettings] = useState<Partial<PlatformSettings>>({});
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);

  useEffect(() => {
    if (role !== AppRole.SUPER_ADMIN) return;
    void integrationsAdminService.getSettings().then((loaded) => {
      setSettings(loaded);
      setApiKeyDraft('');
      setIsEditingApiKey(false);
    }).catch((err: Error) => setMessage(err.message || 'Could not load email settings.'));
  }, [role]);

  const saveSettings = async () => {
    setBusy('save');
    try {
      const source = settings.sendgridConfigSource ?? 'database';
      const payload: Partial<PlatformSettings> = { sendgridConfigSource: source };
      if (source === 'database') {
        payload.sendgridApiKey = apiKeyDraft.trim() || undefined;
        payload.sendgridFromEmail = settings.sendgridFromEmail?.trim() || undefined;
        payload.sendgridFromName = settings.sendgridFromName?.trim() || undefined;
      }
      const updated = await integrationsAdminService.updateSettings(payload);
      setSettings(updated);
      setApiKeyDraft('');
      setIsEditingApiKey(false);
      setMessage('Email settings saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save email settings.');
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy('test');
    try {
      const result = await integrationsAdminService.testEmail(testEmail, 'payment_link_sent');
      setMessage(result.ok === false ? result.error ?? 'Test email failed.' : `Test email sent to ${testEmail}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Test email failed.');
    } finally {
      setBusy(null);
    }
  };

  const source = settings.sendgridConfigSource ?? 'database';
  const managedByEnv = source === 'env';
  const apiKeyConfigured = Boolean(settings.sendgridApiKey);
  const apiKeyDisplay = isEditingApiKey || !settings.sendgridApiKey ? apiKeyDraft : settings.sendgridApiKey;

  return (
    <AdminIntegrationsPageShell
      role={role}
      title="SendGrid email"
      description="Configure sender identity and transactional email delivery."
      badge={settings.sendgridConfigured ? 'Configured' : 'Not configured'}
      source={source}
    >
      {role !== AppRole.SUPER_ADMIN ? <SuperAdminOnlyNotice /> : (
        <>
          {message ? <div className="rounded-md border bg-muted/40 px-4 py-2 text-sm">{message}</div> : null}
          <MissingFieldsNotice fields={settings.sendgridMissingFields} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SendGrid configuration</CardTitle>
              <CardDescription>Store your SendGrid API key and sender profile here. Use an authenticated domain in production.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sendgrid-source">Configuration source</Label>
                <ConfigSourceSelect
                  id="sendgrid-source"
                  value={source}
                  onChange={(value) => setSettings((s) => ({ ...s, sendgridConfigSource: value }))}
                  disabled={busy === 'save'}
                />
              </div>
              {managedByEnv ? <div className="md:col-span-2"><ManagedByEnvNotice provider="SendGrid" /></div> : null}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sendgrid-api-key">API Key</Label>
                <Input
                  id="sendgrid-api-key"
                  type={isEditingApiKey || !apiKeyConfigured ? 'password' : 'text'}
                  className={apiKeyConfigured && !isEditingApiKey ? 'font-mono text-muted-foreground' : undefined}
                  value={apiKeyDisplay ?? ''}
                  placeholder={apiKeyConfigured ? 'Click to replace stored secret' : 'Enter API key'}
                  disabled={managedByEnv}
                  onFocus={() => {
                    if (apiKeyConfigured && !isEditingApiKey) {
                      setIsEditingApiKey(true);
                      setApiKeyDraft('');
                    }
                  }}
                  onBlur={() => {
                    if (!apiKeyDraft.trim()) setIsEditingApiKey(false);
                  }}
                  onChange={(e) => {
                    setIsEditingApiKey(true);
                    setApiKeyDraft(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sendgrid-from-email">From email</Label>
                <Input id="sendgrid-from-email" value={settings.sendgridFromEmail ?? ''} disabled={managedByEnv} onChange={(e) => setSettings((s) => ({ ...s, sendgridFromEmail: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sendgrid-from-name">From name</Label>
                <Input id="sendgrid-from-name" value={settings.sendgridFromName ?? ''} disabled={managedByEnv} onChange={(e) => setSettings((s) => ({ ...s, sendgridFromName: e.target.value }))} />
              </div>
              <div className="md:col-span-2"><Button onClick={() => void saveSettings()} disabled={busy === 'save'}>{busy === 'save' ? 'Saving…' : 'Save email settings'}</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test email</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Input className="max-w-sm" placeholder="you@example.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
              <Button variant="secondary" onClick={() => void sendTest()} disabled={!testEmail || busy === 'test'}>{busy === 'test' ? 'Sending…' : 'Send test email'}</Button>
            </CardContent>
          </Card>
        </>
      )}
    </AdminIntegrationsPageShell>
  );
}
