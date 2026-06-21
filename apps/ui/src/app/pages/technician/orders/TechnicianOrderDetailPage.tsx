import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';
import { useOrderRealtime } from '@/hooks/useRealtimeNotifications';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { packageService, technicianOrderService } from '@/services/liverCare';
import { LiverFibrosisScanCapturePanel } from '@/app/pages/technician/orders/components/LiverFibrosisScanCapturePanel';
import { TechnicianOrderIdBanner } from '@/app/pages/technician/orders/components/TechnicianOrderIdBanner';
import { TechnicianPatientInfoCard } from '@/app/pages/technician/orders/components/TechnicianPatientInfoCard';
import { TechnicianPatientIntakePanel } from '@/app/pages/technician/orders/components/TechnicianPatientIntakePanel';
import { TechnicianFibroScanIntakePanel } from '@/app/pages/technician/orders/components/TechnicianFibroScanIntakePanel';
import { TechnicianScanResultsPanel } from '@/app/pages/technician/orders/components/TechnicianScanResultsPanel';
import { TechnicianVisitProgressCard } from '@/app/pages/technician/orders/components/TechnicianVisitProgressCard';
import { TechnicianVisitCompletionPanel } from '@/app/pages/technician/orders/components/TechnicianVisitCompletionPanel';
import type { FibrosisScanRecord, TechnicianOrderDetail, TechnicianOrderVisit, TechnicianVisitStep } from '@/types/fibrosisScan';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import { isScanCaptureComplete } from '@/app/pages/shared/components/fibroScanKpiConfig';
import type { ScanPatientIntake } from '@/types/scanPatientIntake';
import { orgPath } from '@/app/config/orgRoutes';

const LIST_PATH = orgPath('/technician/orders');

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
  const [order, setOrder] = useState<TechnicianOrderDetail | null>(null);
  const [visit, setVisit] = useState<TechnicianOrderVisit | null>(null);
  const [scan, setScan] = useState<FibrosisScanRecord | null>(null);
  const [intake, setIntake] = useState<ScanPatientIntake | null>(null);
  const [patientEmail, setPatientEmail] = useState<string | null>(null);
  const [fibrosisScanIncluded, setFibrosisScanIncluded] = useState(true);
  const [showCapture, setShowCapture] = useState(false);
  const [unableReason, setUnableReason] = useState('');
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [o, v, s, intakeRow] = await Promise.all([
      technicianOrderService.getOrderDetail(id),
      technicianOrderService.getVisit(id),
      technicianOrderService.getScan(id),
      technicianOrderService.getPatientIntake(id),
    ]);
    setOrder(o);
    setVisit(v);
    setScan(s);
    setIntake(intakeRow);
    setShowCapture(false);
    setPatientEmail(o?.patientEmail ?? v?.patientEmail ?? null);

    if (o?.packageCode) {
      const pkg = await packageService.getByCode(o.packageCode);
      setFibrosisScanIncluded(pkg?.fibrosisScanIncluded ?? true);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useOrderRealtime(id, 'technician', () => {
    void load();
  });

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

  const paymentReady = order?.paymentStatus === 'success';

  const patientIntakeSubmitted = Boolean(intake?.technicianVerifiedAt && intake.phoneOtpVerified);

  const scanReady = useMemo(() => {
    if (!paymentReady) return false;
    if (!patientIntakeSubmitted) return false;
    return Boolean(intake?.fibroscanIntakeSubmittedAt);
  }, [paymentReady, patientIntakeSubmitted, intake]);

  const canCompleteScan = useMemo(() => {
    if (!fibrosisScanIncluded) return true;
    return isScanCaptureComplete(scan);
  }, [scan, fibrosisScanIncluded]);

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
    fibrosisScanIncluded && visitReady && scanReady && currentStep !== 'unable_to_complete';
  const hasScanData = isScanCaptureComplete(scan);

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
        devicePatientCode={intake?.devicePatientCode ?? undefined}
        onUpdated={load}
        onSaved={() => {
          setShowCapture(false);
          void load();
        }}
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
            <StatusBadge
              status={order.orderStatus}
              domain="order"
              label={ORDER_STATUS_LABELS[order.orderStatus]}
            />
            <StatusBadge status={order.paymentStatus} domain="payment" />
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
        <TechnicianPatientInfoCard order={order} visit={visit} patientEmail={patientEmail} intake={intake} />
      </div>

      <div className="space-y-4">
        {currentStep !== 'unable_to_complete' && (
          <TechnicianVisitProgressCard
            currentStep={currentStep}
            acting={acting}
            canCompleteScan={canCompleteScan}
            onStartVisit={() => run(() => technicianOrderService.markVisitStarted(id!))}
            onMarkReached={() => run(() => technicianOrderService.markReached(id!))}
          />
        )}

        <TechnicianPatientIntakePanel
          order={order}
          paymentReady={paymentReady}
          visitReady={visitReady}
          intakeOtpSent={Boolean(visit?.patientIntakeOtpSentAt)}
          onUpdated={load}
        />

        <TechnicianFibroScanIntakePanel
          order={order}
          paymentReady={paymentReady}
          visitReady={visitReady}
          patientIntakeSubmitted={patientIntakeSubmitted}
          onUpdated={load}
        />

        {scanPanel}

        <TechnicianVisitCompletionPanel
            order={order}
            visit={visit}
            currentStep={currentStep}
            canComplete={canCompleteScan}
            acting={acting}
            onOtpSent={() => void load()}
            onComplete={(otp) => run(() => technicianOrderService.completeScan(id!, otp))}
          />

        {currentStep === 'scan_completed' && (
          <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CardContent className="py-4 text-sm text-emerald-800 dark:text-emerald-200">
              Visit completed. Operations will verify patient intake and review scan data for the report.
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
