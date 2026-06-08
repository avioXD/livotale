import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { liverCareOrderService, technicianOrderService } from '@/services/liverCare';
import type { AssignableTechnician } from '@/services/liverCare/technicianOrder.mock';
import type { FibrosisScanRecord, TechnicianOrderVisit, TechnicianVisitStep } from '@/types/fibrosisScan';
import { OrderScanScheduleSection } from '@/app/pages/admin/orders/components/OrderScanScheduleSection';
import type { LiverCareOrder } from '@/types/serviceOrder';

const VISIT_STEP_LABELS: Record<TechnicianVisitStep, string> = {
  assigned: 'Assigned — visit not started',
  visit_started: 'Technician en route',
  reached_location: 'At patient location',
  scan_in_progress: 'Scan in progress',
  scan_completed: 'Scan completed',
  unable_to_complete: 'Unable to complete',
};

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
  const [technicians, setTechnicians] = useState<AssignableTechnician[]>([]);
  const [selectedTechId, setSelectedTechId] = useState(order.technicianId ?? '');
  const [scan, setScan] = useState<FibrosisScanRecord | null>(null);
  const [visit, setVisit] = useState<TechnicianOrderVisit | null>(null);
  const [assigning, setAssigning] = useState(false);
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
    void liverCareOrderService.listAssignableTechnicians().then(setTechnicians);
  }, []);

  useEffect(() => {
    setSelectedTechId(order.technicianId ?? '');
    void load();
  }, [order.id, order.technicianId]);

  const canAssign = !readOnly && order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed';
  const paymentReady =
    order.paymentStatus === 'success' ||
    !['draft', 'created', 'payment_pending'].includes(order.orderStatus);

  const handleAssign = async () => {
    const tech = technicians.find((t) => t.id === selectedTechId);
    if (!tech) {
      setError('Select a technician.');
      return;
    }
    setAssigning(true);
    setError(null);
    try {
      await liverCareOrderService.assignTechnician(order.id, tech.id, tech.name);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-4">
      <OrderScanScheduleSection order={order} onUpdated={onUpdated} readOnly={readOnly} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Technician assignment</CardTitle>
          <CardDescription>
            Operations assigns or reassigns the field technician. Patients choose the date; technician assignment
            stays with operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {order.technicianName ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Currently assigned:</span>
              <Badge variant="secondary">{order.technicianName}</Badge>
              {order.technicianId && (
                <span className="text-xs text-muted-foreground">({order.technicianId})</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No technician assigned yet.</p>
          )}

          {canAssign && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[14rem] flex-1 space-y-1">
                <Label htmlFor="scan-tech-select">
                  {order.technicianId ? 'Reassign technician' : 'Assign technician'}
                </Label>
                <select
                  id="scan-tech-select"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  disabled={!paymentReady}
                >
                  <option value="">Select technician…</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.zone} ({t.status.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                disabled={assigning || !selectedTechId || !paymentReady}
                onClick={() => void handleAssign()}
              >
                {order.technicianId ? 'Reassign' : 'Assign'}
              </Button>
            </div>
          )}

          {!paymentReady && canAssign && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Complete payment before assigning a technician.
            </p>
          )}

          {visit && (
            <div className="rounded-md border border-dashed px-3 py-2 text-sm">
              <span className="text-muted-foreground">Visit status: </span>
              <span className="font-medium">{VISIT_STEP_LABELS[visit.visitStep]}</span>
              {visit.unableReason && (
                <p className="mt-1 text-xs text-destructive">Reason: {visit.unableReason}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
              Read-only for operations — values are captured on the device and submitted by the technician.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Stiffness &amp; steatosis
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ReadOnlyField label="LSM (kPa)" value={String(scan.liverStiffnessKpa)} />
                <ReadOnlyField label="CAP (dB/m)" value={String(scan.capDbm)} />
                <ReadOnlyField label="Fibrosis stage" value={scan.fibrosisStage} />
                <ReadOnlyField label="Steatosis grade" value={scan.steatosisGrade} />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Measurement quality
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ReadOnlyField label="IQR (kPa)" value={String(scan.iqr)} />
                <ReadOnlyField label="IQR / Median %" value={`${scan.iqrMedianPercent}%`} />
                <ReadOnlyField label="Valid measurements" value={`${scan.validMeasurements} / ${scan.totalMeasurements}`} />
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

            <ReadOnlyField label="Interpretation" value={scan.interpretation} />

            {scan.remarks && <ReadOnlyField label="Technician remarks" value={scan.remarks} />}

            {scan.scanFileUrl && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Scan file</Label>
                <a
                  href={scan.scanFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-livotale-pink hover:underline"
                >
                  Download scan attachment
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
