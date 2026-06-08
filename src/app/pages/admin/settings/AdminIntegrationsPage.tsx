import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getExternalServicesMode } from '@/services/external/registry';

const TOGGLE_KEY = 'livotale_dummy_service_mode';

const SERVICES = [
  { id: 'payment', label: 'Payment (Razorpay)', description: 'Dummy payment links and checkout' },
  { id: 'whatsapp', label: 'WhatsApp', description: 'Enquiry ingest and order updates' },
  { id: 'notification', label: 'Notifications', description: 'SMS, email, in-app, OTP' },
  { id: 'fibrosisDevice', label: 'Fibrosis scan device', description: 'Device JSON fetch' },
  { id: 'aiExtraction', label: 'AI extraction', description: 'Pathology OCR pipeline' },
  { id: 'pdf', label: 'PDF generation', description: 'Reports, Rx, invoices' },
] as const;

export function AdminIntegrationsPage() {
  const [mockMode, setMockMode] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(TOGGLE_KEY);
    setMockMode(stored !== 'live');
  }, []);

  const handleSave = () => {
    localStorage.setItem(TOGGLE_KEY, mockMode ? 'mock' : 'live');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations & templates"
        description="Dummy service toggles for development. Live APIs swap in via registry when backend is wired."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service mode</CardTitle>
          <CardDescription>
            Current mode: <Badge variant="secondary">{mockMode ? 'Mock / dummy' : getExternalServicesMode()}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mockMode} onChange={(e) => setMockMode(e.target.checked)} />
            Use dummy external services (recommended for local dev)
          </label>
          <Button onClick={handleSave}>Save preference</Button>
          {saved && <p className="text-sm text-green-700">Saved. Restart may be required for live mode.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {SERVICES.map((svc) => (
          <Card key={svc.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{svc.label}</CardTitle>
                <Badge>Dummy</Badge>
              </div>
              <CardDescription>{svc.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Registry key: <code>{svc.id}</code>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Letterhead templates</CardTitle>
          <CardDescription>Report and prescription PDFs use default letterhead from mock data.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Template upload admin (R101) — configure in a future release. Current: <code>DEFAULT_LETTERHEAD</code> in finalReports.mock.ts.
        </CardContent>
      </Card>
    </div>
  );
}
