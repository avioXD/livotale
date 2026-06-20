import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiMapPin } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { technicianAppointmentsService } from '@/services';
import { orgPath } from '@/app/config/orgRoutes';
import type { TechnicianTrackingResponse } from '@/types';

const POLL_MS = 30_000;

export function TechnicianTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tracking, setTracking] = useState<TechnicianTrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const load = async () => {
      try {
        const data = await technicianAppointmentsService.getPatientTracking(id);
        if (!cancelled) {
          setTracking(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load tracking');
        }
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id]);

  if (!id) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Technician tracking"
        description="Live location updates every 30 seconds while your technician is on the way."
        actions={
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(orgPath(`/appointments/${id}`))}>
            <FiArrowLeft className="h-4 w-4" />
            Appointment
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!tracking ? (
        <p className="text-sm text-muted-foreground">Loading tracking…</p>
      ) : !tracking.active ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {tracking.message ?? 'Tracking is not active for this appointment.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{tracking.technicianName ?? 'Your technician'}</CardTitle>
              <Badge className="capitalize">{String(tracking.status).replace(/_/g, ' ')}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {tracking.lastLocation ? (
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="inline-flex items-center gap-2 font-medium">
                  <FiMapPin className="h-4 w-4 text-livotale-pink" />
                  Last known location
                </p>
                <p className="mt-2 text-muted-foreground">
                  {Number(tracking.lastLocation.latitude).toFixed(5)},{' '}
                  {Number(tracking.lastLocation.longitude).toFixed(5)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Updated {new Date(tracking.lastLocation.recorded_at).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Waiting for technician location ping…</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
