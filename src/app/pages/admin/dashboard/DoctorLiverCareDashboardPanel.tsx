import { Link } from 'react-router-dom';
import { DashboardErrorState, KpiCard, KpiGrid, kpiAccentAt, StatusBadge } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAsyncData } from '@/hooks/useAsyncData';
import { doctorConsultationService } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import { orgPath } from '@/app/config/orgRoutes';

export function DoctorLiverCareDashboardPanel() {
  const ordersQuery = useAsyncData(() => doctorConsultationService.listAssignedOrders(), []);

  if (ordersQuery.status === 'loading' && !ordersQuery.data) {
    return <p className="text-sm text-muted-foreground">Loading consultation queue…</p>;
  }

  if (ordersQuery.status === 'error') {
    return (
      <DashboardErrorState
        message={ordersQuery.error ?? 'Failed to load consultation queue'}
        onRetry={ordersQuery.retry}
      />
    );
  }

  const orders = ordersQuery.data ?? [];
  const awaitingConsult = orders.filter((o: LiverCareOrder) =>
    ['doctor_assigned', 'consultation_pending'].includes(o.orderStatus),
  ).length;
  const rxPending = orders.filter((o: LiverCareOrder) => o.orderStatus === 'prescription_pending').length;
  const reportReady = orders.filter((o: LiverCareOrder) =>
    ['final_report_generated', 'doctor_assignment_pending', 'doctor_assigned'].includes(o.orderStatus),
  ).length;

  const kpis = [
    { label: 'Assigned liver care orders', value: orders.length, href: orgPath('/doctor/consultations') },
    { label: 'Reports ready for review', value: reportReady, href: orgPath('/doctor/consultations') },
    { label: 'Consultations pending', value: awaitingConsult, href: orgPath('/doctor/consultations') },
    { label: 'Prescriptions to publish', value: rxPending, href: orgPath('/doctor/consultations') },
  ];

  return (
    <div className="space-y-6">
      <KpiGrid cols="default">
        {kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} accent={kpiAccentAt(i)} />
        ))}
      </KpiGrid>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Consultation queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {orders.length === 0 ? (
            <p className="text-muted-foreground">No assigned consultations.</p>
          ) : (
            orders.slice(0, 6).map((o: LiverCareOrder) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
                <div>
                  <p className="font-medium">{o.patientName}</p>
                  <p className="text-xs text-muted-foreground">{o.packageName}</p>
                </div>
                <StatusBadge
                  status={o.orderStatus}
                  domain="order"
                  label={ORDER_STATUS_LABELS[o.orderStatus]}
                />
                <Link to={orgPath(`/doctor/consultations/${o.id}`)} className="text-primary underline">Open</Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
