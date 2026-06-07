import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SampleCollectionAnalytics } from '@/types/sampleCollection';

interface SampleAnalyticsPanelProps {
  analytics: SampleCollectionAnalytics;
  title?: string;
}

function formatBucket(bucket: string, period: string) {
  const d = new Date(bucket);
  if (period === 'yearly') return d.getFullYear().toString();
  if (period === 'daily') return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export function SampleAnalyticsPanel({ analytics, title = 'Sample & report analytics' }: SampleAnalyticsPanelProps) {
  const collections = analytics.collectionsOverTime.map((r) => ({
    label: formatBucket(r.bucket, analytics.period),
    collected: r.collected,
  }));

  const reports = analytics.reportsOverTime.map((r) => ({
    label: formatBucket(r.bucket, analytics.period),
    reports: r.reports,
  }));

  const statusData = analytics.byStatus.map((r) => ({
    status: r.status.replace(/_/g, ' '),
    total: r.total,
  }));

  const s = analytics.summary;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{title}</h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total samples</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{s.total_samples}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Collected</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{s.collected}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">In lab pipeline</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{s.in_lab_pipeline}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Reports published</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{s.reports_published}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Rejected</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{s.rejected}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {collections.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Collections over time</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={collections}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="collected" stroke="hsl(var(--primary))" strokeWidth={2} name="Collected" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {reports.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Reports published</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reports}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reports" stroke="#0d9488" strokeWidth={2} name="Reports" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {statusData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Samples by status</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Samples" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
