import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiExternalLink } from 'react-icons/fi';
import { KpiCard, KpiGrid, kpiAccentAt } from '@/components/common';
import { PageHeader } from '@/components/common/PageHeader';
import { isAdminRole } from '@/app/config/productRoles';
import { PartnerLabFormPanel } from '@/app/pages/admin/labs/components/PartnerLabFormPanel';
import { StaffArchivePanel } from '@/app/pages/admin/staff/components/StaffArchivePanel';
import { findLabPartnerStaffMember } from '@/app/pages/admin/staff/staffMemberUtils';
import {
  draftFromPartnerLab,
  emptyPartnerLabDraft,
  normalizePartnerLabDraft,
} from '@/app/pages/admin/labs/partnerLabFormUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { partnerLabService } from '@/services/liverCare';
import { staffDirectoryService } from '@/services/staff/StaffDirectoryService';
import { useUserRole } from '@/store';
import type { PartnerLabDetail, PartnerLabDocument, PartnerLabDraft } from '@/types/partnerLab';
import type { StaffMemberRow } from '@/types/staffHub';
import { orgPath } from '@/app/config/orgRoutes';
import { useUrlTabState } from '@/hooks/useUrlTabState';

const LIST_PATH = orgPath('/admin/staff/lab-partners');
const VIEW_TABS = ['profile', 'legal', 'reports', 'billing'] as const;

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function DocumentRow({ doc }: { doc: PartnerLabDocument }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
      <div>
        <p className="font-medium">{doc.label}</p>
        <p className="text-xs text-muted-foreground">{doc.fileName}</p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="gap-1">
          View <FiExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
    </div>
  );
}

export function AdminPartnerLabDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewTab, setViewTab] = useUrlTabState({
    defaultValue: 'profile',
    validValues: VIEW_TABS,
    omitDefault: true,
  });
  const userRole = useUserRole();
  const canEdit = isAdminRole(userRole);
  const isCreate = id === 'new';
  const isEditMode = isCreate || searchParams.get('tab') === 'edit';

  const [lab, setLab] = useState<PartnerLabDetail | null>(null);
  const [archiveMember, setArchiveMember] = useState<StaffMemberRow | null>(null);
  const [draft, setDraft] = useState<PartnerLabDraft>(emptyPartnerLabDraft());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isCreate);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || isCreate) return;
    setLoading(true);
    const [detail, staffRows] = await Promise.all([
      partnerLabService.getDetail(id),
      staffDirectoryService.listUsers('lab_partner'),
    ]);
    setLab(detail);
    if (detail) {
      setDraft(draftFromPartnerLab(detail));
      setArchiveMember(findLabPartnerStaffMember(id, staffRows, { email: detail.email }));
    } else {
      setArchiveMember(null);
    }
    setLoading(false);
  }, [id, isCreate]);

  useEffect(() => {
    if (isCreate) {
      setDraft(emptyPartnerLabDraft());
      setLoading(false);
      return;
    }
    void load();
  }, [isCreate, load]);

  const patchDraft = useMemo(
    () => (patch: Partial<PartnerLabDraft>) => setDraft((prev) => ({ ...prev, ...patch })),
    [],
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const payload = normalizePartnerLabDraft(draft);
    try {
      if (isCreate) {
        const created = await partnerLabService.create(payload);
        navigate(`${LIST_PATH}/${created.id}`, { replace: true });
      } else if (lab) {
        await partnerLabService.update(lab.id, payload);
        const params = new URLSearchParams(searchParams);
        params.delete('tab');
        setSearchParams(params, { replace: true });
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const enterEdit = () => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'edit');
    setSearchParams(params, { replace: true });
  };
  const cancelEdit = () => {
    if (isCreate) {
      navigate(LIST_PATH);
      return;
    }
    if (lab) setDraft(draftFromPartnerLab(lab));
    const params = new URLSearchParams(searchParams);
    params.delete('tab');
    setSearchParams(params, { replace: true });
  };

  if (!id) return <Navigate to={LIST_PATH} replace />;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading lab profile…</p>;
  }

  if (!isCreate && !lab) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Lab partner profile not found.</p>
        <Button variant="outline" asChild>
          <Link to={LIST_PATH}>Back to lab partners</Link>
        </Button>
      </div>
    );
  }

  if (isEditMode && canEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={cancelEdit} aria-label="Back">
            <FiArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader
            title={isCreate ? 'Add lab partner' : `Edit — ${lab!.name}`}
            description="Profile, POC contacts, test pricing, legal documents, and commercial terms."
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <PartnerLabFormPanel
          draft={draft}
          onChange={patchDraft}
          onSave={() => void handleSave()}
          onCancel={cancelEdit}
          saving={saving}
          isCreate={isCreate}
        />
      </div>
    );
  }

  const viewLab = lab!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={LIST_PATH} aria-label="Back to lab partners">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <PageHeader
          title={viewLab.name}
          description={`${viewLab.city}, ${viewLab.state} · Lab partner profile`}
        />
        <Badge variant={viewLab.active ? 'default' : 'outline'}>{viewLab.active ? 'Active' : 'Inactive'}</Badge>
        {canEdit && (
          <Button size="sm" variant="outline" className="ml-auto gap-1" onClick={enterEdit}>
            <FiEdit2 className="h-4 w-4" /> Edit profile
          </Button>
        )}
      </div>

      {archiveMember && (
        <StaffArchivePanel
          roleKey="lab_partner"
          member={archiveMember}
          onArchived={() => void load()}
        />
      )}

      <Tabs value={viewTab} onValueChange={setViewTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="legal">Legal</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Primary POC</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="font-medium">{viewLab.contactPerson}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Designation</span>
                <p className="font-medium">{viewLab.contactDesignation ?? '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone</span>
                <p className="font-medium">{viewLab.phone}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium">{viewLab.email}</p>
              </div>
            </CardContent>
          </Card>

          {viewLab.pocContacts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Additional POCs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {viewLab.pocContacts.map((poc) => (
                  <div key={poc.id} className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Name</span>
                      <p className="font-medium">{poc.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Designation</span>
                      <p className="font-medium">{poc.designation || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone</span>
                      <p className="font-medium">{poc.phone}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email</span>
                      <p className="font-medium">{poc.email}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Address & registration</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Address</span>
                <p className="font-medium">
                  {viewLab.address}, {viewLab.city} {viewLab.pincode}, {viewLab.state}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">GST</span>
                <p className="font-medium">{viewLab.gstNumber ?? '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Registration</span>
                <p className="font-medium">{viewLab.registrationNumber ?? '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Contract</span>
                <p className="font-medium">
                  {viewLab.contractStart ?? '—'} → {viewLab.contractEnd ?? '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Billing cycle</span>
                <p className="font-medium capitalize">{viewLab.billingCycle}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Supported tests</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {viewLab.supportedTests.map((test) => (
                <Badge key={test} variant="secondary">
                  {test}
                </Badge>
              ))}
            </CardContent>
          </Card>

          {viewLab.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{viewLab.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="legal" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Agreement & compliance</CardTitle>
              <CardDescription>Legal documents for this lab partner profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {viewLab.agreementDoc && <DocumentRow doc={viewLab.agreementDoc} />}
              {viewLab.legalDocuments.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
              {viewLab.reportFormatSample && (
                <div className="pt-2">
                  <p className="mb-2 text-sm font-medium">Report format reference</p>
                  <DocumentRow doc={viewLab.reportFormatSample} />
                </div>
              )}
              {!viewLab.agreementDoc && viewLab.legalDocuments.length === 0 && !viewLab.reportFormatSample && (
                <p className="text-sm text-muted-foreground">No legal documents uploaded.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Report volume</CardTitle>
              <CardDescription>
                Pathology activity for this associated lab. Ops uploads PDFs from lab email on each order.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KpiGrid cols="default" className="lg:grid-cols-4">
                {[
                  { label: 'Orders assigned', value: viewLab.stats.ordersAssigned },
                  { label: 'Samples dispatched', value: viewLab.stats.samplesDispatched },
                  { label: 'Samples at lab', value: viewLab.stats.samplesReceived },
                  { label: 'In pipeline', value: viewLab.stats.inPipeline },
                  { label: 'PDFs uploaded', value: viewLab.stats.reportsUploaded },
                  { label: 'AI verified', value: viewLab.stats.reportsVerified },
                  { label: 'Letterhead published', value: viewLab.stats.letterheadPublished },
                ].map((kpi, i) => (
                  <KpiCard key={kpi.label} {...kpi} accent={kpiAccentAt(i)} />
                ))}
              </KpiGrid>
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link to={orgPath(`/admin/operations?tab=partner-lab&labId=${viewLab.id}`)}>
                    Open lab reports queue
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Costing & billing</CardTitle>
              <CardDescription>Commercial terms for this pathology partner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <KpiGrid cols="three" className="xl:grid-cols-3">
                <KpiCard label="Billing cycle" value={viewLab.billingCycle} accent="teal" />
                <KpiCard
                  label="Package charge (per report)"
                  value={viewLab.packageCharges ? formatInr(viewLab.packageCharges) : '—'}
                  accent="indigo"
                />
                <KpiCard
                  label="Annual tie-up"
                  value={viewLab.annualTieupCharges ? formatInr(viewLab.annualTieupCharges) : '—'}
                  accent="amber"
                />
              </KpiGrid>

              <div>
                <p className="mb-2 font-medium">Per-test charges</p>
                {viewLab.chargesPerTest.length === 0 ? (
                  <p className="text-muted-foreground">No per-test pricing configured.</p>
                ) : (
                  <table className="w-full border text-left text-sm">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="px-3 py-2">Test</th>
                        <th className="px-3 py-2">Charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewLab.chargesPerTest.map((row) => (
                        <tr key={row.testName} className="border-t">
                          <td className="px-3 py-2">{row.testName}</td>
                          <td className="px-3 py-2">{formatInr(row.chargeInr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="rounded-md border border-livotale-pink/30 bg-livotale-pink/5 px-4 py-3">
                <p className="text-xs text-muted-foreground">Estimated billing (verified reports)</p>
                <p className="text-xl font-semibold">{formatInr(viewLab.estimatedBillingInr)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
