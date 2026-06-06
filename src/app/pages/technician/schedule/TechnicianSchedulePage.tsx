import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { RouteMapPanel } from '@/app/pages/technician/schedule/components/RouteMapPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { technicianAppointmentsService } from '@/services';
import type { TechnicianRouteResponse, TechnicianScheduleItem } from '@/types';

export function TechnicianSchedulePage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [schedule, setSchedule] = useState<TechnicianScheduleItem[]>([]);
  const [route, setRoute] = useState<TechnicianRouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [items, routeData] = await Promise.all([
          technicianAppointmentsService.getSchedule(date),
          technicianAppointmentsService.getRoute(date),
        ]);
        setSchedule(items);
        setRoute(routeData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schedule');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [date]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field schedule"
        description="Home visits assigned to you — route order, vitals, FibroScan, and sample collection."
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Date</p>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Appointments ({schedule.length})
          </h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : schedule.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No home visits scheduled for this date.
              </CardContent>
            </Card>
          ) : (
            schedule.map((item) => (
              <Card key={item.appointmentId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{item.patientName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {item.patientCode} ·{' '}
                    {new Date(item.scheduledStart).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{item.line1}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {item.status.replace(/_/g, ' ')}
                    </Badge>
                    <Button size="sm" onClick={() => navigate(`/technician/schedule/${item.appointmentId}`)}>
                      Open visit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <RouteMapPanel route={route} />
      </div>
    </div>
  );
}
