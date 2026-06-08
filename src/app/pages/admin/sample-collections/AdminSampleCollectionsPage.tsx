import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sampleCollectionService } from '@/services/sampleCollection';
import type { SampleCollection } from '@/types/sampleCollection';
import { isRouteRequestDemoActive } from '@/data/routeRequestDemoData';
import type { TechnicianRouteRequest } from '@/types/routeRequest';

export function AdminSampleCollectionsPage() {
  const [samples, setSamples] = useState<SampleCollection[]>([]);
  const [selected, setSelected] = useState<SampleCollection | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [routeRequests, setRouteRequests] = useState<TechnicianRouteRequest[]>([]);
  const [routeReviewNotes, setRouteReviewNotes] = useState<Record<string, string>>({});
  const [routeRequestsUsingDemo, setRouteRequestsUsingDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, pendingRoutes] = await Promise.all([
        sampleCollectionService.listAdmin({
          status: statusFilter || undefined,
          limit: 200,
        }),
        sampleCollectionService.listAdminRouteRequests('pending'),
      ]);
      setSamples(data);
      setRouteRequests(pendingRoutes);
      setRouteRequestsUsingDemo(
        isRouteRequestDemoActive() || pendingRoutes.some((r) => r.id.startsWith('demo-route-')),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample collections');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [statusFilter]);

  const openDetail = async (id: string) => {
    setIsSaving(true);
    try {
      setSelected(await sampleCollectionService.getAdminById(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load detail');
    } finally {
      setIsSaving(false);
    }
  };

  const assign = async () => {
    if (!selected || !technicianId.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await sampleCollectionService.assignTechnician(
        selected.id,
        technicianId.trim(),
        assignReason || undefined,
      );
      setSelected(updated);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setIsSaving(false);
    }
  };

  const publish = async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      const updated = await sampleCollectionService.publishToPatient(selected.id);
      setSelected(updated);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setIsSaving(false);
    }
  };

  const approveRoute = async (requestId: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await sampleCollectionService.approveRouteRequest(
        requestId,
        routeReviewNotes[requestId]?.trim() || undefined,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve route request');
    } finally {
      setIsSaving(false);
    }
  };

  const rejectRoute = async (requestId: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await sampleCollectionService.rejectRouteRequest(
        requestId,
        routeReviewNotes[requestId]?.trim() || undefined,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject route request');
    } finally {
      setIsSaving(false);
    }
  };

  const approveReport = async (reportId: string) => {
    if (!selected) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await sampleCollectionService.approveReport(selected.id, reportId, approvalNotes || undefined);
      setSelected(updated);
      setApprovalNotes('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setIsSaving(false);
    }
  };

  const pendingReport = selected?.reports?.find(
    (r) => r.approvalStatus === 'pending' || (selected.status === 'pending_approval' && !r.verified),
  );
  const approvedReport = selected?.reports?.find((r) => r.verified && r.approvalStatus === 'approved');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample collections"
        description="Monitor LGSC workflow, assign technicians, approve and publish reports."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/appointments">Appointments</Link>
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Filter by status (e.g. pending_technician_assignment)"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="max-w-md"
        />
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {(routeRequests.length > 0 || routeRequestsUsingDemo || isRouteRequestDemoActive()) && (
        <Card className="border-livotale-pink/40">
          <CardHeader>
            <CardTitle className="text-base">Pending route requests ({routeRequests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {routeRequestsUsingDemo && (
              <p className="text-sm text-muted-foreground">
                Demo mode — technician route requests are simulated locally until the API route is available.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Technicians have requested these unassigned orders. Approve to route the visit to them, or reject with a note.
            </p>
            {routeRequests.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No pending requests yet. Open Sample collection → Route as a technician and click &quot;Request this route&quot; on a demo order.
              </p>
            )}
            {routeRequests.map((req) => (
              <div key={req.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{req.technicianName} → {req.sampleCode}</p>
                    <p className="text-sm text-muted-foreground">
                      {req.patientName} · {[req.line1, req.pincode].filter(Boolean).join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {req.scheduledStart
                        ? new Date(req.scheduledStart).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                        : '—'}
                    </p>
                    {req.requestNote && (
                      <p className="mt-1 text-sm italic text-muted-foreground">“{req.requestNote}”</p>
                    )}
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
                <Input
                  placeholder="Review note (optional)"
                  value={routeReviewNotes[req.id] ?? ''}
                  onChange={(e) => setRouteReviewNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={isSaving} onClick={() => void approveRoute(req.id)}>
                    Approve & assign
                  </Button>
                  <Button size="sm" variant="outline" disabled={isSaving} onClick={() => void rejectRoute(req.id)}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">All collections</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : samples.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sample collections found.</p>
            ) : (
              <ul className="space-y-2">
                {samples.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-muted/50"
                      onClick={() => void openDetail(row.id)}
                    >
                      <div>
                        <p className="font-mono text-sm">{row.sampleCode}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.patientName} · {row.pincode ?? '—'}
                        </p>
                      </div>
                      <Badge className="capitalize">{row.status.replace(/_/g, ' ')}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Detail & actions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select a collection to manage.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="font-mono">{selected.sampleCode}</Badge>
                  <Badge className="capitalize">{selected.status.replace(/_/g, ' ')}</Badge>
                </div>
                <dl className="grid gap-1 text-sm">
                  <div><dt className="text-muted-foreground">Patient</dt><dd>{selected.patientName}</dd></div>
                  <div><dt className="text-muted-foreground">Technician</dt><dd>{selected.technicianName ?? 'Unassigned'}</dd></div>
                  <div><dt className="text-muted-foreground">Pincode</dt><dd>{selected.pincode ?? '—'}</dd></div>
                  <div><dt className="text-muted-foreground">Photos</dt><dd>{selected.photos?.length ?? 0}</dd></div>
                  {(selected.reports?.length ?? 0) > 0 && (
                    <div>
                      <dt className="text-muted-foreground">Reports</dt>
                      <dd>{selected.reports?.length} on file</dd>
                    </div>
                  )}
                </dl>

                {(selected.reports?.length ?? 0) > 0 && (
                  <div className="space-y-2 rounded-md border p-3">
                    <Label>Lab reports</Label>
                    <ul className="space-y-2 text-sm">
                      {selected.reports?.map((report) => (
                        <li key={report.id} className="flex items-center justify-between gap-2">
                          <span className="font-mono">{report.reportCode ?? report.id.slice(0, 8)}</span>
                          <Badge variant="outline" className="capitalize">
                            {report.approvalStatus ?? (report.verified ? 'approved' : 'pending')}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {pendingReport && selected.status === 'pending_approval' && (
                  <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                    <Label>Report approval</Label>
                    <p className="text-xs text-muted-foreground">
                      Review the uploaded report and sample photo before approving for patient release.
                    </p>
                    <Input
                      placeholder="Approval notes (optional)"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                    />
                    <Button size="sm" disabled={isSaving} onClick={() => void approveReport(pendingReport.id)}>
                      Approve report
                    </Button>
                  </div>
                )}

                {selected.status === 'approved' && approvedReport && (
                  <Button size="sm" disabled={isSaving} onClick={() => void publish()}>
                    Publish to patient
                  </Button>
                )}

                {selected.status === 'published_to_patient' || selected.status === 'completed' ? (
                  <p className="text-sm text-muted-foreground">Report published to patient.</p>
                ) : null}

                <div className="space-y-2 rounded-md border p-3">
                  <Label>Manual technician assignment</Label>
                  <Input
                    placeholder="Technician UUID"
                    value={technicianId}
                    onChange={(e) => setTechnicianId(e.target.value)}
                  />
                  <Input
                    placeholder="Override reason"
                    value={assignReason}
                    onChange={(e) => setAssignReason(e.target.value)}
                  />
                  <Button size="sm" disabled={isSaving || !technicianId.trim()} onClick={() => void assign()}>
                    Assign technician
                  </Button>
                </div>

                {selected.appointmentId && (
                  <Button variant="link" size="sm" asChild className="px-0">
                    <Link to={`/admin/appointments/${selected.appointmentId}`}>Open appointment</Link>
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
