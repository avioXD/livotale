import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KpiCard, KpiGrid, kpiAccentAt } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pathologyService, technicianOrderService } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import type { SampleDispatch } from '@/types/sampleDispatch';

export function TechnicianDashboardPanel() {
  const [orders, setOrders] = useState<LiverCareOrder[]>([]);
  const [dispatches, setDispatches] = useState<SampleDispatch[]>([]);

  useEffect(() => {
    void technicianOrderService.listAssigned().then(setOrders);
    void pathologyService.listSampleDispatchQueue().then(setDispatches);
  }, []);

  const today = new Date().toDateString();
  const scansToday = orders.filter((o) => o.scanScheduledAt && new Date(o.scanScheduledAt).toDateString() === today).length;
  const scanCompleted = orders.filter((o) => o.orderStatus === 'scan_completed' || o.orderStatus.startsWith('pathology')).length;
  const samplesToSend = dispatches.filter((d) => {
    const order = orders.find((o) => o.id === d.orderId);
    return order && d.status === 'pending_dispatch';
  }).length;

  const kpis = [
    { label: 'Assigned orders', value: orders.length, href: '/technician/orders' },
    { label: 'Scans scheduled today', value: scansToday },
    { label: 'Scans completed (active)', value: scanCompleted },
    { label: 'Samples to send to lab', value: samplesToSend },
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
          <CardTitle className="text-sm">Upcoming visits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {orders.length === 0 ? (
            <p className="text-muted-foreground">No assigned orders.</p>
          ) : (
            orders.slice(0, 6).map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
                <div>
                  <p className="font-medium">{o.patientName}</p>
                  <p className="text-xs text-muted-foreground">{o.orderNumber}</p>
                </div>
                <Badge variant="outline">{ORDER_STATUS_LABELS[o.orderStatus]}</Badge>
                <Link to={`/technician/orders/${o.id}`} className="text-primary underline">Open</Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
