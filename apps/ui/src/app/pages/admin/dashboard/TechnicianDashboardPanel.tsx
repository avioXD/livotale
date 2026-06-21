import { Link } from 'react-router-dom';
import { DashboardErrorState, KpiCard, KpiGrid, kpiAccentAt, StatusBadge } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAsyncData } from '@/hooks/useAsyncData';
import { technicianOrderService } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import { orgPath } from '@/app/config/orgRoutes';

export function TechnicianDashboardPanel() {
  const ordersQuery = useAsyncData(() => technicianOrderService.listAssigned(), []);

  if (ordersQuery.status === 'loading' && !ordersQuery.data) {
    return <p className="text-sm text-muted-foreground">Loading assigned orders…</p>;
  }

  if (ordersQuery.status === 'error') {
    return (
      <DashboardErrorState
        message={ordersQuery.error ?? 'Failed to load assigned orders'}
        onRetry={ordersQuery.retry}
      />
    );
  }

  const orders = ordersQuery.data ?? [];
  const today = new Date().toDateString();
  const pendingScan = orders.filter((o: LiverCareOrder) => o.orderStatus !== 'scan_completed').length;
  const scansToday = orders.filter(
    (o: LiverCareOrder) => o.scanScheduledAt && new Date(o.scanScheduledAt).toDateString() === today,
  ).length;
  const scanCompleted = orders.filter((o: LiverCareOrder) => o.orderStatus === 'scan_completed').length;

  const kpis = [
    { label: 'Pending scan', value: pendingScan, href: orgPath('/technician/orders') },
    { label: 'Scans scheduled today', value: scansToday },
    { label: 'Completed scans', value: scanCompleted },
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
          <CardTitle className="text-sm">Pending scan visits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {pendingScan === 0 ? (
            <p className="text-muted-foreground">No pending scan visits.</p>
          ) : (
            orders
              .filter((o: LiverCareOrder) => o.orderStatus !== 'scan_completed')
              .slice(0, 6)
              .map((o: LiverCareOrder) => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
                  <div>
                    <p className="font-medium">{o.patientName}</p>
                    <p className="text-xs text-muted-foreground">{o.orderNumber}</p>
                  </div>
                  <StatusBadge
                    status={o.orderStatus}
                    domain="order"
                    label={ORDER_STATUS_LABELS[o.orderStatus]}
                  />
                  <Link to={orgPath(`/technician/orders/${o.id}`)} className="text-primary underline">Open</Link>
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
