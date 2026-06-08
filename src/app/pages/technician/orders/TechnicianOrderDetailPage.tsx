import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { liverCareOrderService, packageService, technicianOrderService } from '@/services/liverCare';
import { LiverFibrosisScanCapturePanel } from '@/app/pages/technician/orders/components/LiverFibrosisScanCapturePanel';
import { SampleDispatchPanel } from '@/app/pages/technician/orders/components/SampleDispatchPanel';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import type { TechnicianOrderVisit, TechnicianVisitStep } from '@/types/fibrosisScan';
import { cn } from '@/utils';

const STEP_ORDER: TechnicianVisitStep[] = [
  'assigned',
  'visit_started',
  'reached_location',
  'scan_in_progress',
  'scan_completed',
];

const STEP_LABELS: Record<TechnicianVisitStep, string> = {
  assigned: 'Assigned',
  visit_started: 'Visit started',
  reached_location: 'Reached location',
  scan_in_progress: 'Scan in progress',
  scan_completed: 'Scan completed',
  unable_to_complete: 'Unable to complete',
};

function stepIndex(step: TechnicianVisitStep): number {
  if (step === 'unable_to_complete') return -1;
  return STEP_ORDER.indexOf(step);
}

export function TechnicianOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<LiverCareOrder | null>(null);
  const [visit, setVisit] = useState<TechnicianOrderVisit | null>(null);
  const [unableReason, setUnableReason] = useState('');
  const [pathologyRequired, setPathologyRequired] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [o, v] = await Promise.all([
      liverCareOrderService.getById(id),
      technicianOrderService.getVisit(id),
    ]);
    setOrder(o);
    setVisit(v);
    if (o) {
      const pkgs = await packageService.listAdmin();
      setPathologyRequired(pkgs.find((p) => p.id === o.packageId)?.pathologyIncluded ?? false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setActing(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  if (!order) {
    return <p className="text-muted-foreground">Loading order…</p>;
  }

  const currentStep = visit?.visitStep ?? 'assigned';
  const currentIdx = stepIndex(currentStep);
  const address = [visit?.address, visit?.city, visit?.pincode].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.patientName}
        description={`${order.orderNumber} · ${order.packageName}`}
        actions={
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link to="/technician/orders">
              <FiArrowLeft className="h-4 w-4" />
              Assigned orders
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Badge>{order.packageCode}</Badge>
        <Badge variant="outline">{ORDER_STATUS_LABELS[order.orderStatus]}</Badge>
        <Badge variant="secondary">{STEP_LABELS[currentStep]}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Patient & location</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium">{order.patientPhone}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Scan scheduled</p>
            <p className="font-medium">
              {order.scanScheduledAt
                ? new Date(order.scanScheduledAt).toLocaleString()
                : 'Not scheduled'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Address</p>
            <p>{address || 'Address on file — contact operations'}</p>
          </div>
        </CardContent>
      </Card>

      {currentStep !== 'unable_to_complete' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Visit progress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {STEP_ORDER.map((step, i) => (
                <div
                  key={step}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs',
                    i < currentIdx ? 'bg-green-100 text-green-800' : i === currentIdx ? 'bg-livotale-pink/15 text-livotale-pink font-medium' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {STEP_LABELS[step]}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {currentStep === 'assigned' && (
                <Button size="sm" disabled={acting} onClick={() => run(() => technicianOrderService.markVisitStarted(id!))}>
                  Start visit
                </Button>
              )}
              {(currentStep === 'visit_started' || currentStep === 'assigned') && (
                <Button size="sm" disabled={acting} onClick={() => run(() => technicianOrderService.markReached(id!))}>
                  Mark reached location
                </Button>
              )}
              {(currentStep === 'reached_location' || currentStep === 'scan_in_progress') && (
                <Button
                  size="sm"
                  disabled={acting || currentStep === 'scan_completed'}
                  onClick={() => run(() => technicianOrderService.completeScan(id!))}
                >
                  Mark scan completed
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep !== 'scan_completed' && currentStep !== 'unable_to_complete' && (
        <LiverFibrosisScanCapturePanel orderId={id!} onUpdated={load} />
      )}

      {currentStep === 'scan_completed' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 text-sm text-green-800">
            Scan completed for this order. Operations will review data and generate the report.
          </CardContent>
        </Card>
      )}

      <SampleDispatchPanel order={order} pathologyRequired={pathologyRequired} onUpdated={load} />

      {currentStep !== 'scan_completed' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Unable to complete</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Reason — patient not home, device issue, fasting not met…"
              value={unableReason}
              onChange={(e) => setUnableReason(e.target.value)}
              rows={2}
            />
            <Button
              variant="destructive"
              size="sm"
              disabled={acting || unableReason.trim().length < 5}
              onClick={() => run(() => technicianOrderService.markUnable(id!, unableReason.trim()))}
            >
              Mark unable to complete
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 'unable_to_complete' && visit?.unableReason && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 text-sm">
            Marked unable to complete: {visit.unableReason}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
