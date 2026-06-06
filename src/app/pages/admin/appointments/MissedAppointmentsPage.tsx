import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAdminAppointmentsStore } from '@/store';

export function MissedAppointmentsPage() {
  const missed = useAdminAppointmentsStore((s) => s.missed);
  const isLoading = useAdminAppointmentsStore((s) => s.isLoading);
  const isSaving = useAdminAppointmentsStore((s) => s.isSaving);
  const error = useAdminAppointmentsStore((s) => s.error);
  const loadMissed = useAdminAppointmentsStore((s) => s.loadMissed);
  const handleMissed = useAdminAppointmentsStore((s) => s.handleMissed);

  useEffect(() => {
    void loadMissed();
  }, [loadMissed]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missed appointments"
        description="Review no-shows and mark follow-up or close the case."
        actions={
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link to="/admin/appointments">
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

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading missed appointments…</p>
      ) : missed.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No missed appointments in queue.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {missed.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{row.patientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.appointmentCode} · {row.typeName} ·{' '}
                    {new Date(row.scheduledStart).toLocaleString()}
                  </p>
                  <Badge variant="destructive" className="mt-2 capitalize">
                    {row.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                    onClick={() => void handleMissed(row.id, 'follow_up')}
                  >
                    Follow-up
                  </Button>
                  <Button size="sm" disabled={isSaving} onClick={() => void handleMissed(row.id, 'closed')}>
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
