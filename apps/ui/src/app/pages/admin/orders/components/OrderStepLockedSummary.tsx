import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FiLock } from 'react-icons/fi';
import type { OrderBusinessStepId } from '@/app/pages/admin/orders/orderBusinessSteps';
import { formatScanVisitSummary } from '@/services/liverCare/scanSchedule';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';

interface OrderStepLockedSummaryProps {
  stepId: OrderBusinessStepId;
  order: LiverCareOrder;
  locked: boolean;
  upcoming?: boolean;
}

export function OrderStepLockedSummary({
  stepId,
  order,
  locked,
  upcoming = false,
}: OrderStepLockedSummaryProps) {
  if (upcoming) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <FiLock className="h-4 w-4 shrink-0" />
          Complete the previous workflow steps to unlock this stage.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200/80 bg-green-50/40">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <FiLock className="h-4 w-4 text-green-700" />
          <CardTitle className="text-base text-green-900">
            {locked ? 'Step completed — read only' : 'Step summary'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-green-900">
        {stepId === 'payment' && (
          <>
            <p>Payment collected: <Badge className="capitalize">{order.paymentStatus}</Badge></p>
            <p>Mode: {order.paymentMode ?? '—'} · ₹{order.finalAmount.toLocaleString('en-IN')}</p>
          </>
        )}
        {stepId === 'scan' && (
          <>
            <p>Technician: {order.technicianName ?? '—'}</p>
            <p>
              Scan: {order.scanScheduledAt || order.scanPatientPreferredAt
                ? formatScanVisitSummary(order)
                : ORDER_STATUS_LABELS[order.orderStatus]}
            </p>
          </>
        )}
        {stepId === 'lab' && (
          <>
            <p>Lab partner: {order.partnerLabName ?? '—'}</p>
            <p>Lab PDF processed, AI parameters verified, and Livotale letterhead report available.</p>
          </>
        )}
        {stepId === 'report' && (
          <p>Letterhead report generated ({ORDER_STATUS_LABELS[order.orderStatus]}).</p>
        )}
        {stepId === 'consultation' && (
          <>
            <p>Doctor: {order.doctorName ?? '—'}</p>
            <p>
              Consultation: {order.consultationScheduledAt
                ? new Date(order.consultationScheduledAt).toLocaleString()
                : '—'}
            </p>
          </>
        )}
        {stepId === 'complete' && (
          <p>Order marked complete.</p>
        )}
      </CardContent>
    </Card>
  );
}
