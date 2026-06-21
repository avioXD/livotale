import { Link } from 'react-router-dom';
import { DashboardErrorState, KpiCard, KpiGrid, kpiAccentAt } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAsyncData } from '@/hooks/useAsyncData';
import { adminDashboardService, pathologyService } from '@/services/liverCare';
import type { SampleDispatch } from '@/types/sampleDispatch';
import { SAMPLE_DISPATCH_LABELS } from '@/types/sampleDispatch';
import { orgPath } from '@/app/config/orgRoutes';

export function OpsDashboardPanel() {
  const summaryQuery = useAsyncData(() => adminDashboardService.getSummary(), []);
  const dispatchQuery = useAsyncData(() => pathologyService.listSampleDispatchQueue(), []);

  if (summaryQuery.status === 'loading' && !summaryQuery.data) {
    return <p className="text-sm text-muted-foreground">Loading operations KPIs…</p>;
  }

  if (summaryQuery.status === 'error') {
    return (
      <DashboardErrorState
        message={summaryQuery.error ?? 'Failed to load operations KPIs'}
        onRetry={summaryQuery.retry}
      />
    );
  }

  const summary = summaryQuery.data;
  if (!summary) return null;

  const dispatchQueue = dispatchQuery.data ?? [];
  const awaitingUpload = dispatchQueue.filter((d: SampleDispatch) => d.status === 'awaiting_report').length;
  const pendingDispatch = dispatchQueue.filter((d: SampleDispatch) => d.status === 'pending_dispatch').length;

  const kpis = [
    { label: 'New enquiries', value: summary.enquiries.new, href: orgPath('/admin/operations?tab=enquiries') },
    { label: 'Payment pending', value: summary.orders.paymentPending, href: orgPath('/admin/operations?tab=orders') },
    { label: 'Scans completed', value: summary.orders.scanCompleted, href: orgPath('/admin/operations?tab=orders') },
    { label: 'Lab / pathology pending', value: summary.orders.labPending, href: orgPath('/admin/operations?tab=partner-lab') },
    { label: 'Lab visits pending confirmation', value: pendingDispatch, href: orgPath('/admin/operations?tab=partner-lab') },
    { label: 'Awaiting lab PDF', value: awaitingUpload, href: orgPath('/admin/operations?tab=partner-lab') },
    {
      label: 'AI / report review',
      value: summary.orders.reportPending,
      href: orgPath('/admin/operations?tab=ai-review&extractionStatus=review_pending'),
    },
    {
      label: 'Consultations pending',
      value: summary.orders.consultationPending,
      href: orgPath('/admin/operations?tab=appointments'),
    },
  ];

  return (
    <div className="space-y-6">
      {dispatchQuery.status === 'error' && (
        <DashboardErrorState
          title="Lab queue unavailable"
          message={dispatchQuery.error ?? 'Failed to load dispatch queue'}
          onRetry={dispatchQuery.retry}
        />
      )}
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
            {dispatchQueue.slice(0, 5).map((d: SampleDispatch) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
                <span>{d.partnerLabName}</span>
                <span className="text-muted-foreground">{SAMPLE_DISPATCH_LABELS[d.status]}</span>
                <Link to={orgPath(`/admin/orders/${d.orderId}`)} className="text-primary underline">Open order</Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
