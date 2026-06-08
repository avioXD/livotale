import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { adminDashboardService, packageService } from '@/services/liverCare';
import type { LiverCareDashboardFilters, LiverCareDashboardSummary } from '@/types/adminDashboard';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import type { LiverCarePackage } from '@/types/package';

function KpiCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const content = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
  if (href) {
    return <Link to={href} className="block transition-opacity hover:opacity-90">{content}</Link>;
  }
  return content;
}

export function LiverCareDashboardPanel() {
  const [summary, setSummary] = useState<LiverCareDashboardSummary | null>(null);
  const [packages, setPackages] = useState<LiverCarePackage[]>([]);
  const [filters, setFilters] = useState<LiverCareDashboardFilters>({});

  const load = async () => {
    setSummary(await adminDashboardService.getSummary(filters));
  };

  useEffect(() => {
    void packageService.listAdmin().then(setPackages);
  }, []);

  useEffect(() => {
    void load();
  }, [filters]);

  if (!summary) {
    return <p className="text-sm text-muted-foreground">Loading liver care KPIs…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="pkg-filter">Package</Label>
          <select
            id="pkg-filter"
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.packageId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, packageId: e.target.value || undefined }))}
          >
            <option value="">All packages</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Enquiries" value={summary.enquiries.total} href="/admin/enquiries" />
        <KpiCard label="New enquiries" value={summary.enquiries.new} href="/admin/enquiries" />
        <KpiCard label="Orders" value={summary.orders.total} href="/admin/operations?tab=orders" />
        <KpiCard label="Payment pending" value={summary.orders.paymentPending} href="/admin/operations?tab=orders" />
        <KpiCard label="Scan completed" value={summary.orders.scanCompleted} />
        <KpiCard label="Lab pending" value={summary.orders.labPending} href="/admin/operations?tab=orders" />
        <KpiCard label="Report pending" value={summary.orders.reportPending} href="/admin/operations?tab=orders" />
        <KpiCard label="Consultation pending" value={summary.orders.consultationPending} />
        <KpiCard label="Rx pending" value={summary.orders.prescriptionPending} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue (filtered)</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold">₹{summary.revenue.total.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground">Today: ₹{summary.revenue.today.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
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
            <Badge key={row.status} variant="outline" className="gap-1">
              {ORDER_STATUS_LABELS[row.status as keyof typeof ORDER_STATUS_LABELS] ?? row.status}
              <span className="font-bold">{row.count}</span>
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
