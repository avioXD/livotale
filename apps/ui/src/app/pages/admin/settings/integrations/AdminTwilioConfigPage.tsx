import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PaginationControls,
} from '@/components/common';
import { useAuthStore } from '@/store/auth/authStore';
import {
  DEFAULT_SMS_TEST_LOGS_FILTERS,
  useSmsTestLogsStore,
} from '@/store';
import { AppRole } from '@/types';
import type { TableColumn } from '@/types';
import {
  integrationsAdminService,
  type PlatformSettings,
  type SmsTestLogEntry,
  type TwilioConfigTestResult,
} from '@/services/admin/IntegrationsAdminService';
import { AdminIntegrationsPageShell, SuperAdminOnlyNotice } from './shared';
import { countActiveFilters } from '@/utils/listFilters';
import { useStorePaged } from '@/hooks/useStorePaged';

const TEST_TEMPLATES = [
  { code: 'otp_sent', label: 'OTP SMS' },
  { code: 'payment_link_sent', label: 'Payment link SMS' },
] as const;

type TemplateCode = (typeof TEST_TEMPLATES)[number]['code'];
type PageTab = 'config' | 'test' | 'logs';

const TEMPLATE_LABELS: Record<string, string> = Object.fromEntries(
  TEST_TEMPLATES.map((item) => [item.code, item.label]),
);

type TestSmsResult = {
  phone: string;
  body: string;
  sid?: string;
  status?: string;
  senderMode?: string;
};

function formatSentAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'sent') return 'default';
  if (status === 'failed') return 'destructive';
  return 'secondary';
}

function SmsLogPanel() {
  const {
    searchInput,
    draftFilters,
    appliedFilters,
    appliedSearch,
    pageSize,
    filtersExpanded,
    isLoading,
    error,
    fetchItems,
    setSearchInput,
    setDraftFilter,
    applyFilters,
    resetFilters,
    setPage,
    setPageSize,
    setFiltersExpanded,
  } = useSmsTestLogsStore(
    useShallow((s) => ({
      searchInput: s.searchInput,
      draftFilters: s.draftFilters,
      appliedFilters: s.appliedFilters,
      appliedSearch: s.appliedSearch,
      pageSize: s.pageSize,
      filtersExpanded: s.filtersExpanded,
      isLoading: s.isLoading,
      error: s.error,
      fetchItems: s.fetchItems,
      setSearchInput: s.setSearchInput,
      setDraftFilter: s.setDraftFilter,
      applyFilters: s.applyFilters,
      resetFilters: s.resetFilters,
      setPage: s.setPage,
      setPageSize: s.setPageSize,
      setFiltersExpanded: s.setFiltersExpanded,
    })),
  );

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const paged = useStorePaged(
    useSmsTestLogsStore,
    (s) => ({ items: s.items, page: s.page, pageSize: s.pageSize }),
    (s) => s.setPage,
  );
  const activeFilterCount = countActiveFilters(
    appliedFilters,
    DEFAULT_SMS_TEST_LOGS_FILTERS,
    appliedSearch,
  );

  const columns: TableColumn<SmsTestLogEntry>[] = useMemo(
    () => [
      {
        key: 'sentAt',
        header: 'Sent at',
        render: (log) => (
          <span className="whitespace-nowrap text-muted-foreground">{formatSentAt(log.sentAt)}</span>
        ),
      },
      {
        key: 'template',
        header: 'Template',
        render: (log) => TEMPLATE_LABELS[log.template ?? ''] ?? log.template ?? '—',
      },
      {
        key: 'recipient',
        header: 'To',
        render: (log) => <span className="font-mono text-xs">{log.recipient}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (log) => (
          <div>
            <Badge variant={statusBadgeVariant(log.status)}>{log.providerStatus ?? log.status}</Badge>
            {log.error ? <p className="mt-1 text-xs text-destructive">{log.error}</p> : null}
          </div>
        ),
      },
      {
        key: 'sid',
        header: 'Twilio SID',
        render: (log) => <span className="font-mono text-xs text-muted-foreground">{log.providerSid ?? '—'}</span>,
      },
      {
        key: 'body',
        header: 'Message',
        render: (log) => (
          <p className="max-w-md whitespace-pre-wrap text-xs">{log.body ?? '—'}</p>
        ),
      },
    ],
    [],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">SMS send log</CardTitle>
          <CardDescription>All test SMS sends from this page, newest first.</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => { void fetchItems(); }}
        >
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-muted-foreground">
            Could not load send history ({error}). Ensure the API is running on port 4001 with the latest code.
          </p>
        )}

        <ListToolbar
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search recipient, template, SID…"
          onApplyFilters={applyFilters}
          onResetFilters={resetFilters}
          isLoading={isLoading}
          filtersExpanded={filtersExpanded}
          onFiltersExpandedChange={setFiltersExpanded}
          activeFilterCount={activeFilterCount}
        >
          <FilterField label="Template" htmlFor="sms-log-template">
            <select
              id="sms-log-template"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={draftFilters.template}
              onChange={(e) => setDraftFilter('template', e.target.value)}
            >
              <option value="">All templates</option>
              {TEST_TEMPLATES.map((item) => (
                <option key={item.code} value={item.code}>{item.label}</option>
              ))}
            </select>
          </FilterField>
        </ListToolbar>

        <DataTable
          columns={columns}
          data={paged.items}
          isLoading={isLoading}
          emptyMessage="No test SMS sends recorded yet."
          getRowKey={(log) => log.id}
        />

        <PaginationControls
          page={paged.page}
          pageSize={pageSize}
          total={paged.total}
          totalPages={paged.totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}

export function AdminTwilioConfigPage() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const [pageTab, setPageTab] = useState<PageTab>('config');
  const [settings, setSettings] = useState<Partial<PlatformSettings>>({});
  const [maskedAuthToken, setMaskedAuthToken] = useState<string | null>(null);
  const [authTokenDraft, setAuthTokenDraft] = useState('');
  const [isEditingAuthToken, setIsEditingAuthToken] = useState(false);
  const [configTest, setConfigTest] = useState<TwilioConfigTestResult | null>(null);
  const [smsTest, setSmsTest] = useState<TestSmsResult | null>(null);
  const smsLogCount = useSmsTestLogsStore((s) => s.items.length);
  const fetchSmsLogs = useSmsTestLogsStore((s) => s.fetchItems);
  const [testPhone, setTestPhone] = useState('+917001638349');
  const [testTemplateCode, setTestTemplateCode] = useState<TemplateCode>('otp_sent');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'config' | 'sms' | null>(null);

  useEffect(() => {
    if (role !== AppRole.SUPER_ADMIN) return;
    integrationsAdminService.getSettings().then((loaded) => {
      setSettings({
        twilioAccountSid: loaded.twilioAccountSid ?? '',
        twilioParentAccountSid: loaded.twilioParentAccountSid ?? '',
        twilioFromNumber: loaded.twilioFromNumber ?? '',
        twilioConfigured: loaded.twilioConfigured,
        sendgridConfigured: loaded.sendgridConfigured,
        aiConfigured: loaded.aiConfigured,
        updatedAt: loaded.updatedAt,
      });
      setMaskedAuthToken(loaded.twilioAuthToken ?? null);
      setAuthTokenDraft('');
      setIsEditingAuthToken(false);
    }).catch((err: Error) => {
      setMessage(err.message || 'Could not load Twilio settings.');
    });
  }, [role]);

  const saveSettings = async () => {
    setBusy('save');
    try {
      const updated = await integrationsAdminService.updateSettings({
        twilioAccountSid: settings.twilioAccountSid?.trim() || undefined,
        twilioParentAccountSid: settings.twilioParentAccountSid?.trim() || undefined,
        twilioAuthToken: authTokenDraft.trim() || undefined,
        twilioFromNumber: settings.twilioFromNumber?.trim() || undefined,
      });
      setSettings({
        twilioAccountSid: updated.twilioAccountSid ?? '',
        twilioParentAccountSid: updated.twilioParentAccountSid ?? '',
        twilioFromNumber: updated.twilioFromNumber ?? '',
        twilioConfigured: updated.twilioConfigured,
        sendgridConfigured: updated.sendgridConfigured,
        aiConfigured: updated.aiConfigured,
        updatedAt: updated.updatedAt,
      });
      setMaskedAuthToken(updated.twilioAuthToken ?? null);
      setAuthTokenDraft('');
      setIsEditingAuthToken(false);
      setConfigTest(null);
      setMessage('Twilio settings saved to the platform database.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save Twilio settings.');
    } finally {
      setBusy(null);
    }
  };

  const testConfiguration = async () => {
    setBusy('config');
    setConfigTest(null);
    try {
      const result = await integrationsAdminService.testTwilioConfig();
      setConfigTest(result);
      setMessage(result.ok ? 'Twilio credentials verified.' : result.error ?? 'Twilio configuration check failed.');
    } catch {
      setMessage('Twilio configuration check failed.');
    } finally {
      setBusy(null);
    }
  };

  const sendTestSms = async () => {
    setBusy('sms');
    try {
      const result = await integrationsAdminService.testSms(testPhone, testTemplateCode);
      setSmsTest(result);
      await fetchSmsLogs();
      setMessage(`Test SMS sent to ${result.phone}. Status: ${result.status ?? 'queued'}.`);
    } catch (err) {
      const errorText = err instanceof Error ? err.message : 'Test SMS failed.';
      setMessage(errorText);
      await fetchSmsLogs();
    } finally {
      setBusy(null);
    }
  };

  const authTokenConfigured = Boolean(maskedAuthToken);
  const authTokenDisplay = isEditingAuthToken || !maskedAuthToken ? authTokenDraft : maskedAuthToken;

  return (
    <AdminIntegrationsPageShell
      role={role}
      title="Twilio SMS"
      description="Configure Twilio credentials, send test SMS, and review send history."
      badge={settings.twilioConfigured ? 'Configured' : 'Not configured'}
    >
      {role !== AppRole.SUPER_ADMIN ? (
        <SuperAdminOnlyNotice />
      ) : (
        <>
          {message ? <div className="rounded-md border bg-muted/40 px-4 py-2 text-sm">{message}</div> : null}

          <Tabs value={pageTab} onValueChange={(value) => setPageTab(value as PageTab)} className="space-y-4">
            <TabsList className="inline-flex h-auto w-full justify-start gap-1 bg-muted p-1">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="test">Test</TabsTrigger>
              <TabsTrigger value="logs" className="gap-2">
                Logs
                {smsLogCount > 0 ? <Badge variant="secondary">{smsLogCount}</Badge> : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Global Twilio config</CardTitle>
                    <CardDescription>
                      Save Account SID (AC…) or API Key SID (SK…), Auth Token or API Secret, and your E.164 From number.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="twilio-account-sid">Account SID or API Key SID</Label>
                      <Input
                        id="twilio-account-sid"
                        placeholder="ACxxxxxxxx or SKxxxxxxxx"
                        value={settings.twilioAccountSid ?? ''}
                        onChange={(e) => setSettings((s) => ({ ...s, twilioAccountSid: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="twilio-auth-token">Auth Token or API Secret</Label>
                        {authTokenConfigured ? <Badge variant="secondary">Configured</Badge> : null}
                      </div>
                      <Input
                        id="twilio-auth-token"
                        type={isEditingAuthToken || !authTokenConfigured ? 'password' : 'text'}
                        className={authTokenConfigured && !isEditingAuthToken ? 'font-mono text-muted-foreground' : undefined}
                        placeholder={authTokenConfigured ? 'Click to replace stored secret' : 'Enter token or secret to save'}
                        value={authTokenDisplay ?? ''}
                        onFocus={() => {
                          if (authTokenConfigured && !isEditingAuthToken) {
                            setIsEditingAuthToken(true);
                            setAuthTokenDraft('');
                          }
                        }}
                        onBlur={() => {
                          if (!authTokenDraft.trim()) {
                            setIsEditingAuthToken(false);
                          }
                        }}
                        onChange={(e) => {
                          setIsEditingAuthToken(true);
                          setAuthTokenDraft(e.target.value);
                        }}
                      />
                      {authTokenConfigured && !isEditingAuthToken ? (
                        <p className="text-xs text-muted-foreground">
                          Stored encrypted as {maskedAuthToken}. Click the field to enter a new value.
                        </p>
                      ) : null}
                    </div>
                    {(settings.twilioAccountSid ?? '').startsWith('SK') ? (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="twilio-parent-account-sid">Parent Account SID</Label>
                        <Input
                          id="twilio-parent-account-sid"
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={settings.twilioParentAccountSid ?? ''}
                          onChange={(e) => setSettings((s) => ({ ...s, twilioParentAccountSid: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Required when using an API Key SID (SK…). Find your Account SID on the Twilio Console home page.
                        </p>
                      </div>
                    ) : null}
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="twilio-from-number">From phone number</Label>
                      <Input
                        id="twilio-from-number"
                        placeholder="+12567805633"
                        value={settings.twilioFromNumber ?? ''}
                        onChange={(e) => setSettings((s) => ({ ...s, twilioFromNumber: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        E.164 format. Used as the `from_` parameter when sending SMS via the Twilio Messages API.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:col-span-2">
                      <Button disabled={busy === 'save'} onClick={() => { void saveSettings(); }}>
                        {busy === 'save' ? 'Saving…' : 'Save config'}
                      </Button>
                      <Button variant="secondary" disabled={busy === 'config'} onClick={() => { void testConfiguration(); }}>
                        {busy === 'config' ? 'Checking…' : 'Test configuration'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {configTest ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Configuration check</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={configTest.ok ? 'default' : 'destructive'}>{configTest.ok ? 'OK' : 'Failed'}</Badge>
                        <span className="text-muted-foreground">Mode: {configTest.mode}</span>
                      </div>
                      {configTest.accountName ? <p>Account: {configTest.accountName}</p> : null}
                      {configTest.fromNumber ? <p>From: {configTest.fromNumber}</p> : null}
                      {configTest.senderMode ? <p>Sender: {configTest.senderMode}</p> : null}
                      {configTest.error ? <p className="text-destructive">{configTest.error}</p> : null}
                    </CardContent>
                  </Card>
                ) : null}
              </TabsContent>

              <TabsContent value="test" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Send test SMS</CardTitle>
                    <CardDescription>
                      Renders a saved template with sample data and sends via Twilio. Allowlisted numbers only.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,240px)_minmax(0,220px)_auto]">
                      <div className="space-y-2">
                        <Label htmlFor="test-phone">To number</Label>
                        <Input id="test-phone" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="test-template">Template</Label>
                        <select
                          id="test-template"
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          value={testTemplateCode}
                          onChange={(e) => setTestTemplateCode(e.target.value as TemplateCode)}
                        >
                          {TEST_TEMPLATES.map((item) => (
                            <option key={item.code} value={item.code}>{item.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <Button variant="secondary" disabled={busy === 'sms'} onClick={() => { void sendTestSms(); }}>
                          {busy === 'sms' ? 'Sending…' : 'Send test SMS'}
                        </Button>
                      </div>
                    </div>
                    {smsTest ? (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm">
                        <p className="font-medium">Latest send</p>
                        <p className="mt-1 text-muted-foreground">To: {smsTest.phone}</p>
                        <p className="text-muted-foreground">Status: {smsTest.status ?? 'queued'}</p>
                        {smsTest.sid ? <p className="text-muted-foreground">SID: {smsTest.sid}</p> : null}
                        <pre className="mt-2 whitespace-pre-wrap text-xs">{smsTest.body}</pre>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logs" className="mt-0">
                <SmsLogPanel />
              </TabsContent>
          </Tabs>
        </>
      )}
    </AdminIntegrationsPageShell>
  );
}
