import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { technicianOrderService } from '@/services/liverCare';
import type { FibrosisScanRecord, TechnicianOrderVisit } from '@/types/fibrosisScan';
import { OrderScanScheduleSection } from '@/app/pages/admin/orders/components/OrderScanScheduleSection';
import { OrderVisitAddressSection } from '@/app/pages/admin/orders/components/OrderVisitAddressSection';
import { OrderPatientIntakePanel } from '@/app/pages/admin/orders/components/OrderPatientIntakePanel';
import { OrderFibroScanIntakePanel } from '@/app/pages/admin/orders/components/OrderFibroScanIntakePanel';
import { OrderVisitTrackerCard } from '@/app/pages/admin/orders/components/OrderVisitTrackerCard';
import { fibroScanReliability } from '@/app/pages/shared/components/fibroScanKpiConfig';
import type { LiverCareOrder } from '@/types/serviceOrder';

interface OrderScanReviewPanelProps {
  order: LiverCareOrder;
  onUpdated: () => void;
  readOnly?: boolean;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{value || '—'}</p>
    </div>
  );
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function OrderScanReviewPanel({ order, onUpdated, readOnly = false }: OrderScanReviewPanelProps) {
  const [scan, setScan] = useState<FibrosisScanRecord | null>(null);
  const [visit, setVisit] = useState<TechnicianOrderVisit | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [reviewDraft, setReviewDraft] = useState({
    liverStiffnessKpa: '',
    capDbm: '',
    fibrosisStage: '',
    steatosisGrade: '',
    interpretation: '',
    remarks: '',
  });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [s, v] = await Promise.all([
      technicianOrderService.getScan(order.id),
      technicianOrderService.getVisit(order.id),
    ]);
    setScan(s);
    setVisit(v);
  };

  useEffect(() => {
    void load();
  }, [order.id, order.technicianId]);

  useEffect(() => {
    if (!scan) return;
    setReviewDraft({
      liverStiffnessKpa: String(scan.liverStiffnessKpa),
      capDbm: String(scan.capDbm),
      fibrosisStage: scan.fibrosisStage,
      steatosisGrade: scan.steatosisGrade,
      interpretation: scan.interpretation,
      remarks: scan.remarks ?? '',
    });
  }, [scan]);

  const canReviewScan = Boolean(scan && !scan.locked && !readOnly);

  const handleSaveReview = async () => {
    if (!scan) return;
    setSavingReview(true);
    setError(null);
    try {
      await technicianOrderService.opsReviewScan(order.id, {
        liverStiffnessKpa: Number(reviewDraft.liverStiffnessKpa),
        capDbm: Number(reviewDraft.capDbm),
        fibrosisStage: reviewDraft.fibrosisStage,
        steatosisGrade: reviewDraft.steatosisGrade,
        interpretation: reviewDraft.interpretation,
        remarks: reviewDraft.remarks || undefined,
      });
      setEditingReview(false);
      await load();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan review failed');
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <div className="space-y-4">
      <OrderPatientIntakePanel order={order} onUpdated={onUpdated} readOnly={readOnly} />
      <OrderVisitAddressSection order={order} onUpdated={onUpdated} />
      <OrderScanScheduleSection order={order} onUpdated={onUpdated} readOnly={readOnly} />
      <OrderFibroScanIntakePanel order={order} onUpdated={onUpdated} readOnly={readOnly} />

      {visit && <OrderVisitTrackerCard visit={visit} />}

      {!scan ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No fibrosis scan data yet. The assigned technician will fetch measurements from the FibroScan device
            during the home visit.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">Fibrosis scan data</CardTitle>
              <Badge variant="outline" className="capitalize">
                {scan.source}
              </Badge>
              {scan.locked && <Badge variant="outline">Locked</Badge>}
            </div>
            <CardDescription>
              Operations can correct values before the report is published. Locked after report publish.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canReviewScan && (
              <div className="flex flex-wrap items-center gap-2">
                {!editingReview ? (
                  <Button size="sm" variant="outline" onClick={() => setEditingReview(true)}>
                    Edit scan values
                  </Button>
                ) : (
                  <>
                    <Button size="sm" disabled={savingReview} onClick={() => void handleSaveReview()}>
                      {savingReview ? 'Saving…' : 'Save corrections'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingReview(false);
                        if (scan) {
                          setReviewDraft({
                            liverStiffnessKpa: String(scan.liverStiffnessKpa),
                            capDbm: String(scan.capDbm),
                            fibrosisStage: scan.fibrosisStage,
                            steatosisGrade: scan.steatosisGrade,
                            interpretation: scan.interpretation,
                            remarks: scan.remarks ?? '',
                          });
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Primary clinical KPIs
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {editingReview ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Liver stiffness E (kPa)</Label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={reviewDraft.liverStiffnessKpa}
                        onChange={(e) => setReviewDraft((d) => ({ ...d, liverStiffnessKpa: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">CAP score (dB/m)</Label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={reviewDraft.capDbm}
                        onChange={(e) => setReviewDraft((d) => ({ ...d, capDbm: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fibrosis stage (METAVIR)</Label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={reviewDraft.fibrosisStage}
                        onChange={(e) => setReviewDraft((d) => ({ ...d, fibrosisStage: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Steatosis grade (S0–S3)</Label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={reviewDraft.steatosisGrade}
                        onChange={(e) => setReviewDraft((d) => ({ ...d, steatosisGrade: e.target.value }))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <ReadOnlyField label="Liver stiffness E (kPa)" value={String(scan.liverStiffnessKpa)} />
                    <ReadOnlyField label="CAP score (dB/m)" value={String(scan.capDbm)} />
                    <ReadOnlyField label="Fibrosis stage (METAVIR)" value={scan.fibrosisStage} />
                    <ReadOnlyField label="Steatosis grade (S0–S3)" value={scan.steatosisGrade} />
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Quality control &amp; reliability
              </p>
              {(() => {
                const rel = fibroScanReliability(scan.iqrMedianPercent);
                return (
                  <p className="mb-2 text-sm">
                    <Badge variant={rel.reliable ? 'default' : 'secondary'}>{rel.label}</Badge>
                  </p>
                );
              })()}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ReadOnlyField label="IQR — median (kPa)" value={String(scan.iqr)} />
                <ReadOnlyField label="IQR / Median %" value={`${scan.iqrMedianPercent}%`} />
                <ReadOnlyField
                  label="Valid / total measurements"
                  value={`${scan.validMeasurements} / ${scan.totalMeasurements}`}
                />
                <ReadOnlyField label="Success rate" value={`${scan.successRatePercent}%`} />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Session &amp; device
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ReadOnlyField label="Scan time" value={formatDateTime(scan.scanAt)} />
                <ReadOnlyField label="Operator" value={scan.operatorName} />
                <ReadOnlyField label="Device serial" value={scan.deviceSerial} />
                <ReadOnlyField label="Probe type" value={scan.probeType} />
                <ReadOnlyField label="Fasting confirmed" value={scan.fastingStatus ? 'Yes' : 'No'} />
                <ReadOnlyField label="BMI" value={String(scan.bmi)} />
              </div>
            </div>

            {editingReview ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Interpretation</Label>
                <textarea
                  className="min-h-[4rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reviewDraft.interpretation}
                  onChange={(e) => setReviewDraft((d) => ({ ...d, interpretation: e.target.value }))}
                />
              </div>
            ) : (
              <ReadOnlyField label="Interpretation" value={scan.interpretation} />
            )}

            {editingReview ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Technician remarks</Label>
                <textarea
                  className="min-h-[3rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reviewDraft.remarks}
                  onChange={(e) => setReviewDraft((d) => ({ ...d, remarks: e.target.value }))}
                />
              </div>
            ) : (
              scan.remarks && <ReadOnlyField label="Technician remarks" value={scan.remarks} />
            )}

            {scan.scanFileUrl && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Machine report proof</Label>
                <a
                  href={scan.scanFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-sm font-medium text-livotale-pink hover:underline"
                >
                  View uploaded report (PDF / image)
                </a>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Last updated {formatDateTime(scan.updatedAt)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
