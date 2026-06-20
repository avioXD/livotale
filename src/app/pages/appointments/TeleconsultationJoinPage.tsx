import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiVideo } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { appointmentsService, doctorAppointmentsService } from '@/services';
import { useUserRole } from '@/store';
import { AppRole, type TeleconsultationJoinPayload } from '@/types';
import { orgPath } from '@/app/config/orgRoutes';

export function TeleconsultationJoinPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useUserRole();
  const [payload, setPayload] = useState<TeleconsultationJoinPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isDoctor = role === AppRole.DOCTOR;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    void (async () => {
      try {
        const data = isDoctor
          ? await doctorAppointmentsService.getTeleJoin(id)
          : await appointmentsService.getTeleJoin(id);
        if (!cancelled) {
          setPayload(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to join teleconsultation');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, isDoctor]);

  if (!id) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Teleconsultation"
        description="Join is available 15 minutes before start until 30 minutes after end."
        actions={
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate(isDoctor ? orgPath('/doctor/appointments') : orgPath(`/appointments/${id}`))}
          >
            <FiArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Checking join window…</p>
      ) : payload ? (
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{payload.typeName}</CardTitle>
              <Badge>{payload.appointmentCode}</Badge>
            </div>
            <CardDescription>
              {new Date(payload.scheduledStart).toLocaleString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isDoctor ? `Patient: ${payload.patientName ?? '—'}` : `Doctor: ${payload.doctorName ?? '—'}`}
            </p>
            <Button className="w-full gap-2" asChild>
              <a href={payload.meetingUrl} target="_blank" rel="noreferrer">
                <FiVideo className="h-4 w-4" />
                Join video call
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
