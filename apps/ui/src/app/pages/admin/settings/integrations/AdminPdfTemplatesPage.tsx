import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth/authStore';
import { AppRole } from '@/types';
import { integrationsAdminService, type LetterheadTemplate } from '@/services/admin/IntegrationsAdminService';
import { AdminIntegrationsPageShell, SuperAdminOnlyNotice } from './shared';

const RUNTIME_TEMPLATE_HINTS: Record<string, string> = {
  'default-letterhead': 'Used when generating final liver care reports.',
  'default-rx': 'Used when publishing consultation prescriptions.',
};

export function AdminPdfTemplatesPage() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const [templates, setTemplates] = useState<LetterheadTemplate[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('default-letterhead');
  const [htmlBody, setHtmlBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (role !== AppRole.SUPER_ADMIN) return;
    void integrationsAdminService.listPdfTemplates().then((rows) => {
      setTemplates(rows);
      const preferred = rows.find((row) => row.code === 'default-letterhead') ?? rows[0];
      if (preferred) {
        setSelectedCode(preferred.code);
        setHtmlBody(preferred.htmlBody ?? '');
      }
    });
  }, [role]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.code === selectedCode) ?? null,
    [selectedCode, templates],
  );

  const selectTemplate = (code: string) => {
    const template = templates.find((row) => row.code === code);
    setSelectedCode(code);
    setHtmlBody(template?.htmlBody ?? '');
  };

  const saveTemplate = async () => {
    const updated = await integrationsAdminService.updatePdfTemplate(selectedCode, { htmlBody });
    setTemplates((current) => current.map((template) => (template.code === updated.code ? updated : template)));
    setMessage(`PDF template "${updated.code}" saved.`);
  };

  return (
    <AdminIntegrationsPageShell role={role} title="PDF templates" description="Manage the HTML letterheads used by WeasyPrint for reports and prescriptions.">
      {role !== AppRole.SUPER_ADMIN ? <SuperAdminOnlyNotice /> : (
        <>
          {message ? <div className="rounded-md border bg-muted/40 px-4 py-2 text-sm">{message}</div> : null}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Letterhead templates</CardTitle>
              <CardDescription>Select a template code that matches runtime PDF generation. Jinja2 placeholders are rendered on the API before WeasyPrint builds the PDF.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Template</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={selectedCode} onChange={(e) => selectTemplate(e.target.value)}>
                  {templates.map((template) => (
                    <option key={template.code} value={template.code}>{template.name} ({template.code})</option>
                  ))}
                </select>
                {RUNTIME_TEMPLATE_HINTS[selectedCode] ? (
                  <p className="text-xs text-muted-foreground">{RUNTIME_TEMPLATE_HINTS[selectedCode]}</p>
                ) : null}
              </div>
              {selectedTemplate ? (
                <>
                  <Textarea rows={18} value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} />
                  <Button onClick={() => void saveTemplate()}>Save PDF template</Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No PDF templates found. Run migration 042 to seed letterhead templates.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AdminIntegrationsPageShell>
  );
}
