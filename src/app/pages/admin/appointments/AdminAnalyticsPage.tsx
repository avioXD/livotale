import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminAppointmentsService } from '@/services';
import type { AppointmentAnalytics } from '@/types';

export function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AppointmentAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setAnalytics(await adminAppointmentsService.getAnalytics());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      }
    })();
  }, []);

  const typeData = (analytics?.byType ?? []).map((row) => ({
    name: row.type_name,
    total: row.total,
  }));

  const volumeData = (analytics?.dailyVolume ?? []).map((row) => ({
    day: new Date(row.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    total: row.total,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointment analytics"
        description="30-day volume, completion rate, and breakdown by type."
        actions={
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link to="/admin/appointments">
              <FiArrowLeft className="h-4 w-4" />
              Ops dashboard
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {analytics && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completion rate (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{analytics.completionRate}%</p>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {typeData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By appointment type</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {volumeData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Daily volume</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
