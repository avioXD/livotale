import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth/authStore';
import { AppRole } from '@/types';
import { integrationsAdminService, type PlatformSettings } from '@/services/admin/IntegrationsAdminService';
import { AdminIntegrationsPageShell, SuperAdminOnlyNotice } from './shared';

export function AdminAiConfigPage() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const [settings, setSettings] = useState<Partial<PlatformSettings>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (role !== AppRole.SUPER_ADMIN) return;
    void integrationsAdminService.getSettings().then(setSettings);
  }, [role]);

  const saveSettings = async () => {
    const updated = await integrationsAdminService.updateSettings(settings);
    setSettings(updated);
    setMessage('AI settings saved.');
  };

  return (
    <AdminIntegrationsPageShell role={role} title="AI extraction" description="Configure the provider key and model used by live pathology extraction." badge={settings.aiConfigured ? 'Configured' : 'Not configured'}>
      {role !== AppRole.SUPER_ADMIN ? <SuperAdminOnlyNotice /> : (
        <>
          {message ? <div className="rounded-md border bg-muted/40 px-4 py-2 text-sm">{message}</div> : null}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI provider settings</CardTitle>
              <CardDescription>Supports OpenAI-compatible APIs with optional custom base URL overrides.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Input value={settings.aiProvider ?? 'openai'} onChange={(e) => setSettings((s) => ({ ...s, aiProvider: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input value={settings.aiModel ?? ''} onChange={(e) => setSettings((s) => ({ ...s, aiModel: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>API Key</Label>
                <Input type="password" placeholder="Leave blank to keep existing" onChange={(e) => setSettings((s) => ({ ...s, aiApiKey: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Base URL (optional)</Label>
                <Input value={settings.aiBaseUrl ?? ''} onChange={(e) => setSettings((s) => ({ ...s, aiBaseUrl: e.target.value }))} />
              </div>
              <div className="md:col-span-2"><Button onClick={() => void saveSettings()}>Save AI settings</Button></div>
            </CardContent>
          </Card>
        </>
      )}
    </AdminIntegrationsPageShell>
  );
}
