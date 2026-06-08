import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiExternalLink } from 'react-icons/fi';
import { KpiCard, KpiGrid, kpiAccentAt } from '@/components/common';
import { PageHeader } from '@/components/common/PageHeader';
import { isAdminRole } from '@/app/config/productRoles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { partnerLabService } from '@/services/liverCare';
import { useUserRole } from '@/store';
import type { PartnerLabDetail, PartnerLabDocument } from '@/types/partnerLab';

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
  const userRole = useUserRole();
  const canEdit = isAdminRole(userRole);
  const [lab, setLab] = useState<PartnerLabDetail | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const detail = await partnerLabService.getDetail(id);
    setLab(detail);
    setNotes(detail?.notes ?? '');
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [id]);

  const handleSaveNotes = async () => {
    if (!lab) return;
    setSaving(true);
    try {
      await partnerLabService.update(lab.id, { notes });
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading lab profile…</p>;
  }

  if (!lab) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Lab partner profile not found.</p>
        <Button variant="outline" asChild>
          <Link to="/admin/staff/lab-partners">Back to lab partners</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/staff/lab-partners" aria-label="Back to lab partners">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <PageHeader
          title={lab.name}
          description={`${lab.city}, ${lab.state} · Lab partner profile`}
        />
        <Badge variant={lab.active ? 'default' : 'outline'} className="ml-auto">
          {lab.active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="legal">Legal</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contact & registration</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Contact person</span>
                <p className="font-medium">{lab.contactPerson}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone</span>
                <p className="font-medium">{lab.phone}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium">{lab.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Registration</span>
                <p className="font-medium">{lab.registrationNumber ?? '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Address</span>
                <p className="font-medium">
                  {lab.address}, {lab.city} {lab.pincode}, {lab.state}
                </p>
              </div>
              {lab.gstNumber && (
                <div>
                  <span className="text-muted-foreground">GST</span>
                  <p className="font-medium">{lab.gstNumber}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Contract</span>
                <p className="font-medium">
                  {lab.contractStart ?? '—'} → {lab.contractEnd ?? '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Supported tests</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {lab.supportedTests.map((test) => (
                <Badge key={test} variant="secondary">
                  {test}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notes</CardTitle>
              <CardDescription>Internal ops notes about this lab partnership.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {canEdit ? (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="lab-notes">Notes</Label>
                    <Input id="lab-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                  <Button onClick={() => void handleSaveNotes()} disabled={saving}>
                    {saving ? 'Saving…' : 'Save notes'}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{lab.notes ?? 'No notes.'}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Agreement & compliance</CardTitle>
              <CardDescription>Legal documents for this lab partner profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {lab.agreementDoc && <DocumentRow doc={lab.agreementDoc} />}
              {lab.legalDocuments.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
              {lab.reportFormatSample && (
                <div className="pt-2">
                  <p className="mb-2 text-sm font-medium">Report format reference</p>
                  <DocumentRow doc={lab.reportFormatSample} />
                </div>
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
                  { label: 'Orders assigned', value: lab.stats.ordersAssigned },
                  { label: 'Samples dispatched', value: lab.stats.samplesDispatched },
                  { label: 'Samples at lab', value: lab.stats.samplesReceived },
                  { label: 'In pipeline', value: lab.stats.inPipeline },
                  { label: 'PDFs uploaded', value: lab.stats.reportsUploaded },
                  { label: 'AI verified', value: lab.stats.reportsVerified },
                  { label: 'Letterhead published', value: lab.stats.letterheadPublished },
                ].map((kpi, i) => (
                  <KpiCard key={kpi.label} {...kpi} accent={kpiAccentAt(i)} />
                ))}
              </KpiGrid>
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/admin/operations?tab=partner-lab&labId=${lab.id}`}>
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
                <KpiCard label="Billing cycle" value={lab.billingCycle} accent="teal" />
                <KpiCard
                  label="Package charge (per report)"
                  value={lab.packageCharges ? formatInr(lab.packageCharges) : '—'}
                  accent="indigo"
                />
                <KpiCard
                  label="Annual tie-up"
                  value={lab.annualTieupCharges ? formatInr(lab.annualTieupCharges) : '—'}
                  accent="amber"
                />
              </KpiGrid>

              <div>
                <p className="mb-2 font-medium">Per-test charges</p>
                <table className="w-full border text-left text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-3 py-2">Test</th>
                      <th className="px-3 py-2">Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lab.chargesPerTest.map((row) => (
                      <tr key={row.testName} className="border-t">
                        <td className="px-3 py-2">{row.testName}</td>
                        <td className="px-3 py-2">{formatInr(row.chargeInr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-md border border-livotale-pink/30 bg-livotale-pink/5 px-4 py-3">
                <p className="text-xs text-muted-foreground">Estimated billing (verified reports)</p>
                <p className="text-xl font-semibold">{formatInr(lab.estimatedBillingInr)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
