import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth/authStore';
import { AppRole } from '@/types';
import { integrationsAdminService, type PlatformSettings } from '@/services/admin/IntegrationsAdminService';
import { storageService } from '@/services/storage/StorageService';
import { toastSuccess, toastError } from '@/store/toast/toastStore';
import { AdminIntegrationsPageShell, SuperAdminOnlyNotice } from './shared';

const UPI_RE = /^[\w.\-]{2,256}@[\w]{2,64}$/;

const PLATFORM_PAYMENT_QR_ENTITY_ID = '00000000-0000-4000-8000-000000000001';

export function AdminPaymentConfigPage() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<Partial<PlatformSettings>>({});
  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [localQrPreview, setLocalQrPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (role !== AppRole.SUPER_ADMIN) return;
    setLoading(true);
    try {
      const data = await integrationsAdminService.getSettings();
      setSettings(data);
      setUpiId(data.paymentUpiId ?? '');
      setPayeeName(data.paymentPayeeName ?? '');
      setQrPreview(data.paymentQrUrl ?? null);
      setQrFile(null);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!qrFile) {
      setLocalQrPreview(null);
      return;
    }
    const url = URL.createObjectURL(qrFile);
    setLocalQrPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [qrFile]);

  const displayQr = localQrPreview ?? qrPreview;

  const handleSave = async () => {
    const trimmedUpi = upiId.trim();
    if (trimmedUpi && !UPI_RE.test(trimmedUpi)) {
      toastError('Enter a valid UPI ID (e.g. name@bank)');
      return;
    }

    setSaving(true);
    try {
      let paymentQrFileId = settings.paymentQrFileId ?? null;
      if (qrFile) {
        const uploaded = await storageService.uploadFile(qrFile, 'payment_qr', PLATFORM_PAYMENT_QR_ENTITY_ID);
        paymentQrFileId = uploaded.fileId;
      }

      const updated = await integrationsAdminService.updateSettings({
        paymentUpiId: trimmedUpi || null,
        paymentPayeeName: payeeName.trim() || null,
        paymentQrFileId,
      });
      setSettings(updated);
      setQrPreview(updated.paymentQrUrl ?? null);
      setQrFile(null);
      toastSuccess('Payment settings saved.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not save payment settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminIntegrationsPageShell
      role={role}
      title="Payment collection"
      description="Platform-wide UPI ID and QR code shown to patients on the pay page."
      badge={settings.paymentConfigured ? 'Configured' : 'Not configured'}
    >
      {role !== AppRole.SUPER_ADMIN ? (
        <SuperAdminOnlyNotice />
      ) : loading ? (
        <p className="text-muted-foreground">Loading payment settings…</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">UPI details</CardTitle>
            <CardDescription>Patients pay to this UPI ID and upload a screenshot for verification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payee-name">Payee name</Label>
              <Input
                id="payee-name"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="LivoTale Health"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upi-id">UPI ID</Label>
              <Input
                id="upi-id"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="livotale@upi"
              />
            </div>

            <div className="space-y-2">
              <Label>Payment QR code</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setQrFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex flex-wrap items-start gap-4">
                {displayQr && (
                  <img
                    src={displayQr}
                    alt="Payment QR preview"
                    className="h-40 w-40 rounded-md border bg-white object-contain p-2"
                  />
                )}
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                  {displayQr ? 'Replace QR image' : 'Upload QR image'}
                </Button>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save payment settings'}
            </Button>
          </CardContent>
        </Card>
      )}
    </AdminIntegrationsPageShell>
  );
}
