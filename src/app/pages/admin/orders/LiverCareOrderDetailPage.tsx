import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiClock } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  liverCareOrderService,
  packageService,
  type OrderWorkflowEvent,
} from '@/services/liverCare';
import type { LiverCareOrder, OrderTimelineEvent } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import type { LiverCarePackage } from '@/types/package';
import { OrderPaymentSection } from '@/app/pages/admin/orders/components/OrderPaymentSection';
import { OrderPathologySection } from '@/app/pages/admin/orders/components/OrderPathologySection';
import { OrderConsultationSection } from '@/app/pages/admin/orders/components/OrderConsultationSection';
import { FinalReportSection } from '@/app/pages/admin/orders/components/FinalReportSection';
import { OrderScanReviewPanel } from '@/app/pages/admin/orders/components/OrderScanReviewPanel';
import { OrderWorkflowStepper } from '@/app/pages/admin/orders/components/OrderWorkflowStepper';
import { OrderStepLockedSummary } from '@/app/pages/admin/orders/components/OrderStepLockedSummary';
import { ReadOnlyStepNotice } from '@/app/pages/admin/orders/components/ReadOnlyStepNotice';
import { OrderActivityLogSidebar } from '@/app/pages/admin/orders/components/OrderActivityLogSidebar';
import { OrderPackageWorkflowHint } from '@/app/pages/admin/orders/components/OrderPackageWorkflowHint';
import { auditLogService } from '@/services/admin/AuditLogService';
import type { AuditLogEntry } from '@/types/adminDashboard';
import {
  assignedToLabel,
  createdByLabel,
} from '@/app/pages/admin/orders/orderDetailConfig';
import {
  canOpenStep,
  getActiveBusinessStep,
  getBusinessStepsForPackage,
  getPackageWorkflowSummary,
  getStepUiState,
  isStepInPackage,
  parseOrderStep,
  type OrderBusinessStepId,
} from '@/app/pages/admin/orders/orderBusinessSteps';

const LIST_PATH = '/admin/operations?tab=orders';

const EVENT_LABELS: Record<OrderWorkflowEvent, string> = {
  submit: 'Submit order',
  request_payment: 'Request payment',
  payment_completed: 'Mark payment completed',
  assign_technician: 'Assign technician',
  schedule_scan: 'Schedule scan',
  start_scan: 'Start scan',
  complete_scan: 'Complete scan',
  assign_lab: 'Assign lab partner',
  upload_lab_report: 'Upload lab report',
  trigger_ai: 'Trigger AI extraction',
  verify_ai: 'Verify AI data',
  generate_report: 'Generate final report',
  assign_doctor: 'Assign doctor',
  schedule_consultation: 'Schedule consultation',
  complete_consultation: 'Complete consultation',
  publish_prescription: 'Publish prescription',
  complete: 'Mark completed',
  cancel: 'Cancel order',
};

export function LiverCareOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [order, setOrder] = useState<LiverCareOrder | null>(null);
  const [pkg, setPkg] = useState<LiverCarePackage | null>(null);
  const [timeline, setTimeline] = useState<OrderTimelineEvent[]>([]);
  const [events, setEvents] = useState<OrderWorkflowEvent[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const o = await liverCareOrderService.getById(id);
    if (!o) return;
    setOrder(o);
    const p = await packageService.listAdmin().then((rows) => rows.find((r) => r.id === o.packageId) ?? null);
    setPkg(p);
    const [tl, auditAll] = await Promise.all([
      liverCareOrderService.getTimeline(id),
      auditLogService.list(),
    ]);
    setTimeline(tl);
    setAuditEntries(
      auditAll.filter(
        (a) =>
          a.entityId === o.id ||
          a.entityId.includes(o.id) ||
          (o.enquiryId != null && a.entityId === o.enquiryId),
      ),
    );
    setEvents(await liverCareOrderService.getWorkflowEvents(id));
  };

  useEffect(() => {
    void load();
  }, [id]);

  const businessSteps = useMemo(() => getBusinessStepsForPackage(pkg), [pkg]);
  const packageSummary = useMemo(() => getPackageWorkflowSummary(pkg), [pkg]);
  const activeStepId = order ? getActiveBusinessStep(order, pkg) : 'payment';
  const activityCount = timeline.length + auditEntries.length;

  const urlStep = parseOrderStep(searchParams.get('step'), searchParams.get('tab'));
  const selectedStepId = urlStep ?? activeStepId;

  const setStep = useCallback(
    (step: OrderBusinessStepId) => {
      const next = new URLSearchParams(searchParams);
      next.set('step', step);
      next.delete('tab');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    if (!order || !pkg) return;
    const parsed = parseOrderStep(searchParams.get('step'), searchParams.get('tab'));
    if (!parsed) {
      setStep(activeStepId);
      return;
    }
    const resolved: OrderBusinessStepId =
      parsed === 'report' && pkg.pathologyIncluded ? 'lab' : parsed;
    if (!isStepInPackage(resolved, pkg) || !canOpenStep(resolved, order, pkg)) {
      setStep(activeStepId);
    } else if (searchParams.get('step') !== resolved) {
      setStep(resolved);
    }
  }, [order, pkg, activeStepId, searchParams, setStep]);

  const handleBack = () => {
    if (globalThis.history.length > 1) navigate(-1);
    else navigate(LIST_PATH);
  };

  const handleEvent = async (event: OrderWorkflowEvent) => {
    if (!id) return;
    setActing(true);
    setError(null);
    try {
      const meta: Record<string, string> = {};
      if (event === 'assign_technician') {
        meta.technicianId = 'tech-1';
        meta.technicianName = 'Demo Technician';
      }
      if (event === 'assign_doctor') {
        meta.doctorId = 'doc-1';
        meta.doctorName = 'Dr. Meera Iyer';
      }
      if (event === 'assign_lab') {
        meta.partnerLabId = 'lab-1';
        meta.partnerLabName = 'Metro Diagnostics';
      }
      await liverCareOrderService.transition(id, event, meta);
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

  const selectedMeta = businessSteps.find((s) => s.id === selectedStepId);
  const stepState = getStepUiState(selectedStepId, order, pkg);
  const isEditable = stepState === 'active';
  const isReadOnlyCompleted = stepState === 'completed';
  const isUpcoming = stepState === 'upcoming';

  const readOnly = isReadOnlyCompleted;

  const renderStepWork = () => {
    if (isUpcoming) {
      return <OrderStepLockedSummary stepId={selectedStepId} order={order} locked={false} upcoming />;
    }

    const panel = (() => {
      switch (selectedStepId) {
        case 'payment':
          return <OrderPaymentSection order={order} onUpdated={load} readOnly={readOnly} />;
        case 'scan':
          return <OrderScanReviewPanel order={order} onUpdated={load} readOnly={readOnly} />;
        case 'lab':
          return pkg?.pathologyIncluded ? (
            <OrderPathologySection
              order={order}
              pathologyRequired
              onUpdated={load}
              readOnly={readOnly}
            />
          ) : null;
        case 'report':
          return pkg && !pkg.pathologyIncluded ? (
            <FinalReportSection
              orderId={order.id}
              pathologyRequired={false}
              onUpdated={load}
              readOnly={readOnly}
            />
          ) : null;
        case 'consultation':
          return pkg?.consultationIncluded ? (
            <OrderConsultationSection order={order} onUpdated={load} readOnly={readOnly} />
          ) : null;
        case 'complete':
          return (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                {order.orderStatus === 'completed'
                  ? 'This order is complete. No further actions required.'
                  : 'Finish the previous steps to complete this order.'}
              </CardContent>
            </Card>
          );
        default:
          return null;
      }
    })();

    if (!panel) return null;
    if (!readOnly) return panel;

    return (
      <div className="space-y-3">
        <ReadOnlyStepNotice />
        {panel}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Go back">
          <FiArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <PageHeader
              title={order.orderNumber}
              description={`${order.patientName} · ${order.packageCode} — ${order.packageName}`}
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              onClick={() => setActivityOpen(true)}
              aria-label="Open activity log"
            >
              <FiClock className="h-4 w-4" />
              Activity
              {activityCount > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">
                  {activityCount}
                </Badge>
              )}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">₹{order.finalAmount.toLocaleString('en-IN')}</Badge>
            <Badge className="capitalize">{order.paymentStatus}</Badge>
            <Badge variant="secondary">{ORDER_STATUS_LABELS[order.orderStatus]}</Badge>
            <span className="text-muted-foreground">
              Created {createdByLabel(order.createdBy)} · {assignedToLabel(order)}
            </span>
            <Link to={`/patients/${order.patientId}`} className="text-livotale-pink hover:underline">
              Patient profile
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <OrderPackageWorkflowHint summary={packageSummary} />
        <OrderWorkflowStepper
          steps={businessSteps}
          activeStepId={activeStepId}
          selectedStepId={selectedStepId}
          getUiState={(stepId) => getStepUiState(stepId, order, pkg)}
          canOpen={(stepId) => canOpenStep(stepId, order, pkg)}
          onSelect={setStep}
        />
      </div>

      <div className="space-y-3">
        {selectedMeta && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">{selectedMeta.label}</h2>
              <p className="text-xs text-muted-foreground">
                Owner: {selectedMeta.owner}
                {selectedMeta.packageReason ? ` · ${selectedMeta.packageReason}` : ''}
                {isEditable && ' · Edit mode'}
                {isReadOnlyCompleted && ' · View only (completed)'}
              </p>
            </div>
            {isEditable && (
              <Badge variant="outline" className="text-livotale-pink border-livotale-pink/40">
                Current step
              </Badge>
            )}
          </div>
        )}

        {renderStepWork()}

        {import.meta.env.DEV && isEditable && events.length > 0 && (
          <Card className="border-dashed border-amber-500/40 bg-amber-500/5">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">Advance workflow</CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-amber-700 border-amber-500/50">
                  Dev only
                </Badge>
              </div>
              <CardDescription>
                Not shown to ops in production. Use these shortcuts to simulate order status transitions during local
                development — real steps above are how staff advance orders.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {events.map((ev) => (
                <Button key={ev} size="sm" variant="outline" onClick={() => void handleEvent(ev)} disabled={acting}>
                  {EVENT_LABELS[ev]}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <OrderActivityLogSidebar
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        orderNumber={order.orderNumber}
        timeline={timeline}
        auditEntries={auditEntries}
      />
    </div>
  );
}
