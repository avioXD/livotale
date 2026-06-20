import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronDown, FiChevronUp, FiMapPin } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAdminAppointmentsStore } from '@/store';
import { orgPath } from '@/app/config/orgRoutes';

const POLL_MS = 30_000;

export function RouteMonitoringPanel() {
  const routeLive = useAdminAppointmentsStore((s) => s.routeLive);
  const isLoading = useAdminAppointmentsStore((s) => s.isLoading);
  const loadRouteLive = useAdminAppointmentsStore((s) => s.loadRouteLive);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!open) return;
    void loadRouteLive(date);
    const timer = window.setInterval(() => void loadRouteLive(date), POLL_MS);
    return () => window.clearInterval(timer);
  }, [open, date, loadRouteLive]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div>
          <CardTitle className="text-sm font-medium">Field route tracking</CardTitle>
          <p className="text-xs text-muted-foreground">Live technician positions for home sample visits (optional)</p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setOpen((v) => !v)}>
          {open ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
          {open ? 'Hide' : 'Show'}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3 border-t pt-4">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          {isLoading && routeLive.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading routes…</p>
          ) : routeLive.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active field routes for this date.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {routeLive.map((row) => (
                <div key={row.appointmentId} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.patientName}</p>
                      <p className="text-xs text-muted-foreground">{row.appointmentCode}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{row.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Technician: {row.technicianName ?? 'Unassigned'}
                  </p>
                  {row.lastLocation ? (
                    <p className="mt-1 flex items-center gap-1 text-xs">
                      <FiMapPin className="h-3 w-3" />
                      {row.lastLocation.latitude.toFixed(4)}, {row.lastLocation.longitude.toFixed(4)}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">No GPS ping yet</p>
                  )}
                  <Button size="sm" variant="link" className="mt-2 h-auto p-0" asChild>
                    <Link to={orgPath(`/admin/appointments/${row.appointmentId}`)}>Open appointment</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
