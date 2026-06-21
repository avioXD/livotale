import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardErrorState, KpiCard, KpiGrid, kpiAccentAt } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAsyncData } from '@/hooks/useAsyncData';
import { adminDashboardService, packageService } from '@/services/liverCare';
import type { LiverCareDashboardFilters } from '@/types/adminDashboard';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import type { LiverCarePackage } from '@/types/package';
import { orgPath } from '@/app/config/orgRoutes';

export function LiverCareDashboardPanel() {
  const [filters, setFilters] = useState<LiverCareDashboardFilters>({});

  const packagesQuery = useAsyncData(() => packageService.listAdmin(), []);
  const summaryQuery = useAsyncData(
    () => adminDashboardService.getSummary(filters),
    [filters],
  );

  const summary = summaryQuery.data;
  const packages = packagesQuery.data ?? [];

  if (summaryQuery.status === 'loading' && !summary) {
    return <p className="text-sm text-muted-foreground">Loading liver care KPIs…</p>;
  }

  if (summaryQuery.status === 'error') {
    return (
      <DashboardErrorState
        message={summaryQuery.error ?? 'Failed to load liver care KPIs'}
        onRetry={summaryQuery.retry}
      />
    );
  }

  if (!summary) {
    return null;
  }

  const kpis = [
    { label: 'Enquiries', value: summary.enquiries.total, href: orgPath('/admin/operations?tab=enquiries') },
    { label: 'New enquiries', value: summary.enquiries.new, href: orgPath('/admin/operations?tab=enquiries') },
    { label: 'Orders', value: summary.orders.total, href: orgPath('/admin/operations?tab=orders') },
    { label: 'Payment pending', value: summary.orders.paymentPending, href: orgPath('/admin/operations?tab=orders') },
    { label: 'Scan completed', value: summary.orders.scanCompleted },
    { label: 'Lab pending', value: summary.orders.labPending, href: orgPath('/admin/operations?tab=partner-lab') },
    { label: 'Report pending', value: summary.orders.reportPending, href: orgPath('/admin/operations?tab=orders') },
    { label: 'Consultation pending', value: summary.orders.consultationPending },
    { label: 'Rx pending', value: summary.orders.prescriptionPending },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="date-from">From</Label>
          <Input
            id="date-from"
            type="date"
            value={filters.dateFrom?.slice(0, 10) ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                dateFrom: e.target.value ? `${e.target.value}T00:00:00Z` : undefined,
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="date-to">To</Label>
          <Input
            id="date-to"
            type="date"
            value={filters.dateTo?.slice(0, 10) ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                dateTo: e.target.value ? `${e.target.value}T23:59:59Z` : undefined,
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pkg-filter">Package</Label>
          <select
            id="pkg-filter"
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.packageId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, packageId: e.target.value || undefined }))}
          >
            <option value="">All packages</option>
            {packages.map((p: LiverCarePackage) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="status-filter">Order status</Label>
          <select
            id="status-filter"
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.orderStatus ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, orderStatus: e.target.value || undefined }))}
          >
            <option value="">All statuses</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="pay-filter">Payment</Label>
          <select
            id="pay-filter"
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.paymentStatus ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value || undefined }))}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={() => setFilters({})}>Clear filters</Button>
      </div>

      <KpiGrid>
        {kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} accent={kpiAccentAt(i)} />
        ))}
      </KpiGrid>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Revenue (filtered)"
          value={`₹${summary.revenue.total.toLocaleString('en-IN')}`}
          hint={`Today: ₹${summary.revenue.today.toLocaleString('en-IN')} · Month: ₹${summary.revenue.month.toLocaleString('en-IN')}`}
          accent="emerald"
        />
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Package-wise sales</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2">Package</th>
                  <th className="pb-2">Orders</th>
                  <th className="pb-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {summary.packageSales.map((row) => (
                  <tr key={row.packageId} className="border-t">
                    <td className="py-2">{row.packageCode}</td>
                    <td className="py-2">{row.orderCount}</td>
                    <td className="py-2">₹{row.revenue.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Orders by status</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {summary.ordersByStatus.map((row) => (
            <Badge key={row.status} variant="secondary">
              {ORDER_STATUS_LABELS[row.status as keyof typeof ORDER_STATUS_LABELS] ?? row.status}: {row.count}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
