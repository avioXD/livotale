import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiClock } from 'react-icons/fi';
import { useOrderRealtime } from '@/hooks/useRealtimeNotifications';
import { ConfirmModal, PageHeader, StatusBadge } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { liverCareOrderService, packageService } from '@/services/liverCare';
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
import { orgPath } from '@/app/config/orgRoutes';
import type { OrderWorkflowEvent } from '@/services/liverCare';

const LIST_PATH = orgPath('/admin/operations?tab=orders');

export function LiverCareOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [order, setOrder] = useState<LiverCareOrder | null>(null);
  const [pkg, setPkg] = useState<LiverCarePackage | null>(null);
  const [timeline, setTimeline] = useState<OrderTimelineEvent[]>([]);
  const [workflowEvents, setWorkflowEvents] = useState<OrderWorkflowEvent[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const o = await liverCareOrderService.getById(id);
    if (!o) return;
    setOrder(o);
    const p = await packageService.listAdmin().then((rows) => rows.find((r) => r.id === o.packageId) ?? null);
    setPkg(p);
    const [tl, auditAll, events] = await Promise.all([
      liverCareOrderService.getTimeline(id),
      auditLogService.list(),
      liverCareOrderService.getWorkflowEvents(id),
    ]);
    setTimeline(tl);
    setWorkflowEvents(events);
    setAuditEntries(
      auditAll.filter(
        (a) =>
          a.entityId === o.id ||
          a.entityId.includes(o.id) ||
          (o.enquiryId != null && a.entityId === o.enquiryId),
      ),
    );
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useOrderRealtime(id, 'operations', () => {
    void load();
  });

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

  const handleTransition = async (event: OrderWorkflowEvent): Promise<boolean> => {
    if (!id) return false;
    setActing(true);
    setError(null);
    try {
      await liverCareOrderService.transition(id, event);
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      return false;
    } finally {
      setActing(false);
    }
  };

  const handleCancelConfirm = async () => {
    const ok = await handleTransition('cancel');
    if (ok) setCancelModalOpen(false);
  };

  if (!order) {
    return <p className="text-muted-foreground">Loading order…</p>;
  }

  const selectedMeta = businessSteps.find((s) => s.id === selectedStepId);
  const stepState = getStepUiState(selectedStepId, order, pkg);
  const isEditable = stepState === 'active';
  const isReadOnlyCompleted = stepState === 'completed';
  const isUpcoming = stepState === 'upcoming';
  const canComplete = workflowEvents.includes('complete');
  const canCancel = workflowEvents.includes('cancel');

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
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Complete order</CardTitle>
                <CardDescription>
                  Mark the order complete once all package steps are finished and the patient has received deliverables.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.orderStatus === 'completed' ? (
                  <p className="text-sm text-muted-foreground">This order is complete. No further actions required.</p>
                ) : canComplete && !readOnly ? (
                  <Button
                    size="sm"
                    disabled={acting}
                    onClick={() => {
                      if (!globalThis.confirm('Mark this order as complete?')) return;
                      void handleTransition('complete');
                    }}
                  >
                    Mark order complete
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Finish the previous workflow steps before completing this order.
                  </p>
                )}
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
            <StatusBadge status={order.paymentStatus} domain="payment" />
            <StatusBadge status={order.orderStatus} domain="order" label={ORDER_STATUS_LABELS[order.orderStatus]} />
            <span className="text-muted-foreground">
              Created {createdByLabel(order.createdBy)} · {assignedToLabel(order)}
            </span>
            <Link to={orgPath(`/patients/${order.patientId}`)} className="text-livotale-pink hover:underline">
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

        {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && canCancel && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cancel order</CardTitle>
              <CardDescription>
                Permanently cancel this order if the patient withdrew or payment cannot be collected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                disabled={acting}
                onClick={() => setCancelModalOpen(true)}
              >
                Cancel order
              </Button>
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

      <ConfirmModal
        open={cancelModalOpen}
        title="Cancel order"
        description={`Cancel order ${order.orderNumber} for ${order.patientName}? This cannot be undone.`}
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        confirmVariant="destructive"
        isConfirming={acting}
        onConfirm={() => void handleCancelConfirm()}
        onCancel={() => setCancelModalOpen(false)}
      />
    </div>
  );
}
