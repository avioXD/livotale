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

export function AdminAiConfigPage() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const [settings, setSettings] = useState<Partial<PlatformSettings>>({});
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role !== AppRole.SUPER_ADMIN) return;
    void integrationsAdminService.getSettings().then((loaded) => {
      setSettings(loaded);
      setApiKeyDraft('');
      setIsEditingApiKey(false);
    }).catch((err: Error) => setMessage(err.message || 'Could not load AI settings.'));
  }, [role]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const source = settings.aiConfigSource ?? 'database';
      const payload: Partial<PlatformSettings> = { aiConfigSource: source };
      if (source === 'database') {
        payload.aiProvider = settings.aiProvider?.trim() || 'openai';
        payload.aiModel = settings.aiModel?.trim() || undefined;
        payload.aiApiKey = apiKeyDraft.trim() || undefined;
        payload.aiBaseUrl = settings.aiBaseUrl?.trim() || undefined;
      }
      const updated = await integrationsAdminService.updateSettings(payload);
      setSettings(updated);
      setApiKeyDraft('');
      setIsEditingApiKey(false);
      setMessage('AI settings saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save AI settings.');
    } finally {
      setSaving(false);
    }
  };

  const source = settings.aiConfigSource ?? 'database';
  const managedByEnv = source === 'env';
  const apiKeyConfigured = Boolean(settings.aiApiKey);
  const apiKeyDisplay = isEditingApiKey || !settings.aiApiKey ? apiKeyDraft : settings.aiApiKey;

  return (
    <AdminIntegrationsPageShell
      role={role}
      title="AI extraction"
      description="Configure the provider key and model used by live pathology extraction."
      badge={settings.aiConfigured ? 'Configured' : 'Not configured'}
      source={source}
    >
      {role !== AppRole.SUPER_ADMIN ? <SuperAdminOnlyNotice /> : (
        <>
          {message ? <div className="rounded-md border bg-muted/40 px-4 py-2 text-sm">{message}</div> : null}
          <MissingFieldsNotice fields={settings.aiMissingFields} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI provider settings</CardTitle>
              <CardDescription>Supports OpenAI-compatible APIs with optional custom base URL overrides.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ai-source">Configuration source</Label>
                <ConfigSourceSelect
                  id="ai-source"
                  value={source}
                  onChange={(value) => setSettings((s) => ({ ...s, aiConfigSource: value }))}
                  disabled={saving}
                />
              </div>
              {managedByEnv ? <div className="md:col-span-2"><ManagedByEnvNotice provider="AI" /></div> : null}
              <div className="space-y-2">
                <Label htmlFor="ai-provider">Provider</Label>
                <Input id="ai-provider" value={settings.aiProvider ?? 'openai'} disabled={managedByEnv} onChange={(e) => setSettings((s) => ({ ...s, aiProvider: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-model">Model</Label>
                <Input id="ai-model" value={settings.aiModel ?? ''} disabled={managedByEnv} onChange={(e) => setSettings((s) => ({ ...s, aiModel: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ai-api-key">API Key</Label>
                <Input
                  id="ai-api-key"
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ai-base-url">Base URL (optional)</Label>
                <Input id="ai-base-url" value={settings.aiBaseUrl ?? ''} disabled={managedByEnv} onChange={(e) => setSettings((s) => ({ ...s, aiBaseUrl: e.target.value }))} />
              </div>
              <div className="md:col-span-2"><Button onClick={() => void saveSettings()} disabled={saving}>{saving ? 'Saving…' : 'Save AI settings'}</Button></div>
            </CardContent>
          </Card>
        </>
      )}
    </AdminIntegrationsPageShell>
  );
}
