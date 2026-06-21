import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth/authStore';
import { AppRole } from '@/types';
import {
  integrationsAdminService,
  type PlatformSettings,
  type S3ConfigTestResult,
} from '@/services/admin/IntegrationsAdminService';
import { toastSuccess, toastError } from '@/store/toast/toastStore';
import {
  AdminIntegrationsPageShell,
  ConfigSourceSelect,
  ManagedByEnvNotice,
  MissingFieldsNotice,
  SuperAdminOnlyNotice,
} from './shared';

export function AdminS3ConfigPage() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const [settings, setSettings] = useState<Partial<PlatformSettings>>({});
  const [secretInput, setSecretInput] = useState('');
  const [testResult, setTestResult] = useState<S3ConfigTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role !== AppRole.SUPER_ADMIN) return;
    void integrationsAdminService.getSettings().then((data) => {
      setSettings(data);
      setSecretInput('');
    });
  }, [role]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload: Partial<PlatformSettings> = {
        s3ConfigSource: settings.s3ConfigSource ?? 'env',
      };
      if ((settings.s3ConfigSource ?? 'env') === 'database') {
        payload.s3Bucket = settings.s3Bucket ?? null;
        payload.s3Region = settings.s3Region ?? null;
        payload.s3KeyPrefix = settings.s3KeyPrefix ?? null;
        payload.s3Endpoint = settings.s3Endpoint ?? null;
        payload.s3PublicEndpoint = settings.s3PublicEndpoint ?? null;
        payload.s3AccessKeyId = settings.s3AccessKeyId ?? null;
        if (secretInput.trim()) {
          payload.s3SecretAccessKey = secretInput.trim();
        }
      }
      const updated = await integrationsAdminService.updateSettings(payload);
      setSettings(updated);
      setSecretInput('');
      toastSuccess('S3 settings saved.');
    } catch {
      toastError('Failed to save S3 settings.');
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await integrationsAdminService.testS3Config();
      setTestResult(result);
      if (result.ok) {
        toastSuccess('S3 connection test passed.');
      } else {
        toastError(result.error ?? 'S3 connection test failed.');
      }
    } catch {
      toastError('S3 connection test failed.');
    } finally {
      setTesting(false);
    }
  };

  const source = settings.s3ConfigSource ?? 'env';
  const managedByEnv = source === 'env';

  return (
    <AdminIntegrationsPageShell
      role={role}
      title="Object storage (S3)"
      description="Configure bucket, region, credentials, and endpoints for file uploads across the platform."
      badge={settings.s3Configured ? 'Configured' : 'Not configured'}
      source={source}
    >
      {role !== AppRole.SUPER_ADMIN ? (
        <SuperAdminOnlyNotice />
      ) : (
        <>
          <MissingFieldsNotice fields={settings.s3MissingFields} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connection intake</CardTitle>
              <CardDescription>
                Bucket and region are required. Endpoints are optional — use them for LocalStack or custom S3-compatible storage.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="s3-source">Configuration source</Label>
                <ConfigSourceSelect
                  id="s3-source"
                  value={source}
                  onChange={(value) => setSettings((s) => ({ ...s, s3ConfigSource: value }))}
                  disabled={saving}
                />
              </div>
              {managedByEnv ? <div className="md:col-span-2"><ManagedByEnvNotice provider="S3" /></div> : null}
              <div className="space-y-2">
                <Label>Bucket</Label>
                <Input
                  value={settings.s3Bucket ?? ''}
                  placeholder="livotale-files"
                  disabled={managedByEnv}
                  onChange={(e) => setSettings((s) => ({ ...s, s3Bucket: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Input
                  value={settings.s3Region ?? ''}
                  placeholder="ap-south-1"
                  disabled={managedByEnv}
                  onChange={(e) => setSettings((s) => ({ ...s, s3Region: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Key prefix</Label>
                <Input
                  value={settings.s3KeyPrefix ?? ''}
                  placeholder="livotale"
                  disabled={managedByEnv}
                  onChange={(e) => setSettings((s) => ({ ...s, s3KeyPrefix: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Internal endpoint (optional)</Label>
                <Input
                  value={settings.s3Endpoint ?? ''}
                  placeholder="http://localstack:4566"
                  disabled={managedByEnv}
                  onChange={(e) => setSettings((s) => ({ ...s, s3Endpoint: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Public endpoint (optional)</Label>
                <Input
                  value={settings.s3PublicEndpoint ?? ''}
                  placeholder="http://localhost:4567"
                  disabled={managedByEnv}
                  onChange={(e) => setSettings((s) => ({ ...s, s3PublicEndpoint: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credentials intake</CardTitle>
              <CardDescription>AWS access key and secret. Secret is encrypted at rest and masked on reload.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Access key ID</Label>
                <Input
                  value={settings.s3AccessKeyId ?? ''}
                  disabled={managedByEnv}
                  onChange={(e) => setSettings((s) => ({ ...s, s3AccessKeyId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Secret access key</Label>
                <Input
                  type="password"
                  value={secretInput}
                  placeholder={settings.s3SecretAccessKey ? 'Configured, click to replace' : 'Enter secret access key'}
                  disabled={managedByEnv}
                  onChange={(e) => setSecretInput(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Button onClick={() => void saveSettings()} disabled={saving}>
                  {saving ? 'Saving…' : 'Save S3 settings'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connection test</CardTitle>
              <CardDescription>Verifies bucket access with a write-and-delete probe object.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="secondary" onClick={() => void runTest()} disabled={testing}>
                {testing ? 'Testing…' : 'Test connection'}
              </Button>
              {testResult ? (
                <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
                  <p>
                    Status: {testResult.ok ? 'Connected' : 'Failed'}
                    {testResult.bucket ? ` · Bucket: ${testResult.bucket}` : ''}
                    {testResult.region ? ` · Region: ${testResult.region}` : ''}
                  </p>
                  {testResult.endpoint ? <p>Endpoint: {testResult.endpoint}</p> : null}
                  {testResult.error ? <p className="text-destructive">{testResult.error}</p> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </AdminIntegrationsPageShell>
  );
}
