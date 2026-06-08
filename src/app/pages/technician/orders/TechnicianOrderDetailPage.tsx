import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { liverCareOrderService, packageService, pathologyService, technicianOrderService } from '@/services/liverCare';
import { patientsService } from '@/services/patients';
import { LiverFibrosisScanCapturePanel } from '@/app/pages/technician/orders/components/LiverFibrosisScanCapturePanel';
import { TechnicianBloodCollectionPanel } from '@/app/pages/technician/orders/components/TechnicianBloodCollectionPanel';
import { TechnicianOrderIdBanner } from '@/app/pages/technician/orders/components/TechnicianOrderIdBanner';
import { TechnicianPatientInfoCard } from '@/app/pages/technician/orders/components/TechnicianPatientInfoCard';
import { TechnicianScanResultsPanel } from '@/app/pages/technician/orders/components/TechnicianScanResultsPanel';
import { TechnicianVisitProgressCard } from '@/app/pages/technician/orders/components/TechnicianVisitProgressCard';
import type { BloodCollectionTiming } from '@/types/package';
import type { FibrosisScanRecord, TechnicianOrderVisit, TechnicianVisitStep } from '@/types/fibrosisScan';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import type { SampleDispatch } from '@/types/sampleDispatch';

const LIST_PATH = '/technician/orders';

const STEP_LABELS: Record<TechnicianVisitStep, string> = {
  assigned: 'Assigned',
  visit_started: 'En route',
  reached_location: 'At location',
  scan_in_progress: 'Scanning',
  scan_completed: 'Completed',
  unable_to_complete: 'Unable',
};

export function TechnicianOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LiverCareOrder | null>(null);
  const [visit, setVisit] = useState<TechnicianOrderVisit | null>(null);
  const [scan, setScan] = useState<FibrosisScanRecord | null>(null);
  const [dispatch, setDispatch] = useState<SampleDispatch | null>(null);
  const [patientEmail, setPatientEmail] = useState<string | null>(null);
  const [pathologyRequired, setPathologyRequired] = useState(false);
  const [fibrosisScanIncluded, setFibrosisScanIncluded] = useState(true);
  const [bloodCollectionTiming, setBloodCollectionTiming] = useState<BloodCollectionTiming | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [unableReason, setUnableReason] = useState('');
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [o, v, s] = await Promise.all([
      liverCareOrderService.getById(id),
      technicianOrderService.getVisit(id),
      technicianOrderService.getScan(id),
    ]);
    setOrder(o);
    setVisit(v);
    setScan(s);
    setShowCapture(false);

    if (o) {
      const pkgs = await packageService.listAdmin();
      const pkg = pkgs.find((p) => p.id === o.packageId);
      const pathIncluded = pkg?.pathologyIncluded ?? false;
      setPathologyRequired(pathIncluded);
      setFibrosisScanIncluded(pkg?.fibrosisScanIncluded ?? true);
      setBloodCollectionTiming(pkg?.bloodCollectionTiming ?? null);

      if (pathIncluded) {
        const d = await pathologyService.getSampleDispatch(id);
        setDispatch(d);
      } else {
        setDispatch(null);
      }

      try {
        const detail = await patientsService.getById(o.patientId);
        const email = (detail.patient as { email?: string | null }).email;
        setPatientEmail(email ?? null);
      } catch {
        setPatientEmail(v?.patientEmail ?? null);
      }
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

  const canCompleteScan = useMemo(() => {
    if (!fibrosisScanIncluded) {
      if (!pathologyRequired) return true;
      return dispatch != null && dispatch.status !== 'pending_dispatch';
    }
    if (!scan) return false;
    if (!pathologyRequired) return true;
    return dispatch != null && dispatch.status !== 'pending_dispatch';
  }, [scan, pathologyRequired, fibrosisScanIncluded, dispatch]);

  const handleBack = () => {
    if (globalThis.history.length > 1) navigate(-1);
    else navigate(LIST_PATH);
  };

  if (!order) {
    return <p className="text-muted-foreground">Loading order…</p>;
  }

  const currentStep = visit?.visitStep ?? 'assigned';
  const visitReady = ['reached_location', 'scan_in_progress', 'scan_completed'].includes(currentStep);
  const showScanWorkflow =
    fibrosisScanIncluded && visitReady && currentStep !== 'unable_to_complete';
  const hasScanData = Boolean(scan);
  const bloodBeforeScan = bloodCollectionTiming === 'before_scan';

  const bloodPanel = (
    <TechnicianBloodCollectionPanel
      order={order}
      pathologyRequired={pathologyRequired}
      visitReady={visitReady}
      bloodCollectionTiming={bloodCollectionTiming}
      onUpdated={load}
    />
  );

  const scanPanel =
    showScanWorkflow &&
    (hasScanData && !showCapture ? (
      <TechnicianScanResultsPanel
        scan={scan!}
        orderNumber={order.orderNumber}
        acting={acting}
        onEdit={() => setShowCapture(true)}
        onRescan={() =>
          run(async () => {
            await technicianOrderService.requestRescan(id!);
            setShowCapture(true);
          })
        }
      />
    ) : (
      <LiverFibrosisScanCapturePanel
        orderId={id!}
        orderNumber={order.orderNumber}
        onUpdated={load}
        onSaved={() => setShowCapture(false)}
      />
    ));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Back to field orders">
          <FiArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <PageHeader
            title={order.orderNumber}
            description={`${order.patientName} · ${order.packageCode} — ${order.packageName}`}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{ORDER_STATUS_LABELS[order.orderStatus]}</Badge>
            <Badge variant="secondary">{STEP_LABELS[currentStep]}</Badge>
            <span className="text-muted-foreground">{order.patientPhone}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <TechnicianOrderIdBanner order={order} packageCode={order.packageCode} />
        <TechnicianPatientInfoCard order={order} visit={visit} patientEmail={patientEmail} />
      </div>

      <div className="space-y-4">
        {currentStep !== 'unable_to_complete' && (
          <TechnicianVisitProgressCard
            currentStep={currentStep}
            acting={acting}
            canCompleteScan={canCompleteScan}
            onStartVisit={() => run(() => technicianOrderService.markVisitStarted(id!))}
            onMarkReached={() => run(() => technicianOrderService.markReached(id!))}
            onCompleteScan={() => run(() => technicianOrderService.completeScan(id!))}
          />
        )}

        {bloodBeforeScan ? (
          <>
            {bloodPanel}
            {scanPanel}
          </>
        ) : (
          <>
            {scanPanel}
            {bloodPanel}
          </>
        )}

        {!fibrosisScanIncluded && visitReady && pathologyRequired && (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              This package includes pathology only — complete blood sample collection above.
            </CardContent>
          </Card>
        )}

        {currentStep === 'scan_completed' && (
          <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CardContent className="py-4 text-sm text-emerald-800 dark:text-emerald-200">
              Visit completed. Operations will review scan data and generate the report.
            </CardContent>
          </Card>
        )}

        {currentStep !== 'scan_completed' && currentStep !== 'unable_to_complete' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <FiAlertTriangle className="h-4 w-4" aria-hidden />
                Unable to complete
              </CardTitle>
            </CardHeader>
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
                className="w-full sm:w-auto"
                disabled={acting || unableReason.trim().length < 5}
                onClick={() => run(() => technicianOrderService.markUnable(id!, unableReason.trim()))}
              >
                Mark unable to complete
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 'unable_to_complete' && visit?.unableReason && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="py-4 text-sm">
              Marked unable to complete: {visit.unableReason}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
