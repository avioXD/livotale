import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth/authStore';
import { integrationsAdminService, type MessageTemplate } from '@/services/admin/IntegrationsAdminService';
import { AdminIntegrationsPageShell } from './shared';

const CATEGORIES = ['otp', 'enquiry', 'order', 'scan', 'lab', 'report', 'appointment', 'system'] as const;
const PINNED_TEMPLATE_CODES = ['otp_sent', 'payment_link_sent'] as const;

function renderTemplatePreview(template: MessageTemplate | null): string {
  if (!template) return '';
  return template.variables.reduce((output, variable) => {
    const token = new RegExp(String.raw`{{\s*${variable}\s*}}`, 'g');
    return output.replace(token, `[${variable}]`);
  }, template.bodyTemplate);
}

function variableChip(variable: string) {
  return `{{${variable}}}`;
}

export function AdminMessageTemplatesPage() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    integrationsAdminService.listMessageTemplates().then((rows) => {
      setTemplates(rows);
      const firstPinned = rows.find((row) => row.code === 'otp_sent' && row.channel === 'sms')
        ?? rows.find((row) => PINNED_TEMPLATE_CODES.includes(row.code as (typeof PINNED_TEMPLATE_CODES)[number]))
        ?? rows[0]
        ?? null;
      setSelectedTemplate(firstPinned);
    });
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || [template.name, template.code, template.channel].some((value) => value.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, search, templates]);

  const pinnedTemplates = useMemo(
    () => templates.filter((template) => PINNED_TEMPLATE_CODES.includes(template.code as (typeof PINNED_TEMPLATE_CODES)[number]) && template.channel === 'sms'),
    [templates],
  );

  const preview = useMemo(() => renderTemplatePreview(selectedTemplate), [selectedTemplate]);

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    const updated = await integrationsAdminService.updateMessageTemplate(selectedTemplate.code, selectedTemplate.channel, {
      name: selectedTemplate.name,
      subjectTemplate: selectedTemplate.subjectTemplate,
      bodyTemplate: selectedTemplate.bodyTemplate,
      isActive: selectedTemplate.isActive,
    });
    setTemplates((current) => current.map((template) => template.id === updated.id ? updated : template));
    setSelectedTemplate(updated);
    setMessage(`Template ${updated.code} (${updated.channel}) saved.`);
  };

  const insertVariable = (variable: string) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      bodyTemplate: `${selectedTemplate.bodyTemplate}{{${variable}}}`,
    });
  };

  return (
    <AdminIntegrationsPageShell
      role={role}
      title="Message templates"
      description="Edit SMS and notification templates. Use {{variableName}} placeholders — the backend binds values at send time."
    >
      {message ? <div className="rounded-md border bg-muted/40 px-4 py-2 text-sm">{message}</div> : null}

      {pinnedTemplates.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test templates</CardTitle>
            <CardDescription>Start with OTP and payment link SMS templates used by the Twilio test panel.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {pinnedTemplates.map((template) => (
              <Button
                key={template.id}
                variant={selectedTemplate?.id === template.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTemplate(template)}
              >
                {template.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template library</CardTitle>
            <CardDescription>Search and filter all templates by category and channel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search templates" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All categories</option>
              {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <div className="max-h-[460px] space-y-2 overflow-y-auto">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/50"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{template.name}</span>
                    {PINNED_TEMPLATE_CODES.includes(template.code as (typeof PINNED_TEMPLATE_CODES)[number]) ? (
                      <Badge variant="outline">Test</Badge>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">{template.code} · {template.channel}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Editor</CardTitle>
            <CardDescription>Wrap dynamic fields in double curly braces, e.g. `{'{{patientName}}'}`.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTemplate ? (
              <>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={selectedTemplate.name} onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })} />
                </div>
                {selectedTemplate.channel === 'email' ? (
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input value={selectedTemplate.subjectTemplate} onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subjectTemplate: e.target.value })} />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label>Body</Label>
                  <Textarea rows={10} value={selectedTemplate.bodyTemplate} onChange={(e) => setSelectedTemplate({ ...selectedTemplate, bodyTemplate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variables.map((variable) => (
                      <Button key={variable} type="button" variant="outline" size="sm" onClick={() => insertVariable(variable)}>
                        {variableChip(variable)}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Backend binds these at runtime. OTP uses `otpCode`; payment links use `orderNumber`, `amount`, and `paymentLink`.
                  </p>
                </div>
                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                  <div className="text-sm font-medium">Preview (sample data)</div>
                  {selectedTemplate.channel === 'email' ? <p className="text-xs text-muted-foreground">Subject: {selectedTemplate.subjectTemplate || '(empty)'}</p> : null}
                  <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{preview || '(empty body)'}</pre>
                </div>
                <Button onClick={() => { void saveTemplate(); }}>Save template</Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a template to edit.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminIntegrationsPageShell>
  );
}
