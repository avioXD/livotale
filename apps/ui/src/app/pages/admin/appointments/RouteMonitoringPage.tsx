import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiMapPin } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAdminAppointmentsStore } from '@/store';
import { orgPath } from '@/app/config/orgRoutes';

const POLL_MS = 30_000;

export function RouteMonitoringPage() {
  const routeLive = useAdminAppointmentsStore((s) => s.routeLive);
  const isLoading = useAdminAppointmentsStore((s) => s.isLoading);
  const error = useAdminAppointmentsStore((s) => s.error);
  const loadRouteLive = useAdminAppointmentsStore((s) => s.loadRouteLive);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    void loadRouteLive(date);
    const timer = window.setInterval(() => void loadRouteLive(date), POLL_MS);
    return () => window.clearInterval(timer);
  }, [date, loadRouteLive]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Route monitoring"
        description="Live technician positions for active home visits (refreshes every 30s)."
        actions={
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link to={orgPath('/admin/appointments')}>
              <FiArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />

      {isLoading && routeLive.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading routes…</p>
      ) : routeLive.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No active field routes for this date.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {routeLive.map((row) => (
            <Card key={row.appointmentId}>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{row.appointmentCode}</CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {row.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {row.patientName} · {row.technicianName ?? 'Unassigned tech'}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {row.lastLocation ? (
                  <>
                    <p className="inline-flex items-center gap-1.5">
                      <FiMapPin className="h-4 w-4" />
                      {row.lastLocation.latitude.toFixed(5)}, {row.lastLocation.longitude.toFixed(5)}
                    </p>
                    <p className="text-muted-foreground">
                      Updated {new Date(row.lastLocation.recordedAt).toLocaleTimeString()}
                    </p>
                    <Button variant="link" className="h-auto p-0" asChild>
                      <a
                        href={`https://maps.google.com/?q=${row.lastLocation.latitude},${row.lastLocation.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in maps
                      </a>
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground">No GPS ping yet</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
