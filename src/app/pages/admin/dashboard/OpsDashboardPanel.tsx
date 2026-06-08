import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KpiCard, KpiGrid, kpiAccentAt } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminDashboardService, pathologyService } from '@/services/liverCare';
import type { LiverCareDashboardSummary } from '@/types/adminDashboard';
import type { SampleDispatch } from '@/types/sampleDispatch';
import { SAMPLE_DISPATCH_LABELS } from '@/types/sampleDispatch';

export function OpsDashboardPanel() {
  const [summary, setSummary] = useState<LiverCareDashboardSummary | null>(null);
  const [dispatchQueue, setDispatchQueue] = useState<SampleDispatch[]>([]);

  useEffect(() => {
    void adminDashboardService.getSummary().then(setSummary);
    void pathologyService.listSampleDispatchQueue().then(setDispatchQueue);
  }, []);

  if (!summary) {
    return <p className="text-sm text-muted-foreground">Loading operations KPIs…</p>;
  }

  const awaitingUpload = dispatchQueue.filter((d) => d.status === 'awaiting_report').length;
  const pendingDispatch = dispatchQueue.filter((d) => d.status === 'pending_dispatch').length;

  const kpis = [
    { label: 'New enquiries', value: summary.enquiries.new, href: '/admin/enquiries' },
    { label: 'Payment pending', value: summary.orders.paymentPending, href: '/admin/operations?tab=orders' },
    { label: 'Scans completed', value: summary.orders.scanCompleted, href: '/admin/operations?tab=orders' },
    { label: 'Lab / pathology pending', value: summary.orders.labPending, href: '/admin/operations?tab=partner-lab' },
    { label: 'Samples to send', value: pendingDispatch, href: '/admin/operations?tab=partner-lab' },
    { label: 'Awaiting lab PDF', value: awaitingUpload, href: '/admin/operations?tab=partner-lab' },
    {
      label: 'AI / report review',
      value: summary.orders.reportPending,
      href: '/admin/operations?tab=ai-review&extractionStatus=review_pending',
    },
    {
      label: 'Consultations pending',
      value: summary.orders.consultationPending,
      href: '/admin/operations?tab=appointments',
    },
  ];

  return (
    <div className="space-y-6">
      <KpiGrid>
        {kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} accent={kpiAccentAt(i)} />
        ))}
      </KpiGrid>

      {dispatchQueue.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lab partner queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dispatchQueue.slice(0, 5).map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
                <span>{d.partnerLabName}</span>
                <span className="text-muted-foreground">{SAMPLE_DISPATCH_LABELS[d.status]}</span>
                <Link to={`/admin/orders/${d.orderId}`} className="text-primary underline">Open order</Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
