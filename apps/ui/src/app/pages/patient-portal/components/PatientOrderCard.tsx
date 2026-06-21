import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatientOrderProgressStepper } from '@/app/pages/patient-portal/components/PatientOrderProgressStepper';
import { formatScanVisitSummary } from '@/services/liverCare/scanSchedule';
import {
  getPatientNextAction,
  getPatientOrderProgressSteps,
} from '@/services/liverCare/patientOrderProgress';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';

interface PatientOrderCardProps {
  order: LiverCareOrder;
}

export function PatientOrderCard({ order }: PatientOrderCardProps) {
  const steps = getPatientOrderProgressSteps(order);
  const nextAction = getPatientNextAction(order);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{order.orderNumber}</CardTitle>
            <p className="text-sm text-muted-foreground">{order.packageName}</p>
          </div>
          <StatusBadge status={order.paymentStatus} domain="payment" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <PatientOrderProgressStepper steps={steps} compact />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="text-sm">
            <p className="font-medium">₹{order.finalAmount.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground">{ORDER_STATUS_LABELS[order.orderStatus]}</p>
            {(order.scanScheduledAt || order.scanPatientPreferredAt) && (
              <p className="text-xs text-muted-foreground">Scan: {formatScanVisitSummary(order)}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {nextAction.type !== 'none' && (
              <Button size="sm" asChild>
                <Link to={nextAction.href}>{nextAction.label}</Link>
              </Button>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link to={`/patient/orders/${order.id}`}>Details</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
