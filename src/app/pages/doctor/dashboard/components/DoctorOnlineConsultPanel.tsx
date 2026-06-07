import { Link } from 'react-router-dom';
import { FiVideo } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface DoctorConsultRow {
  id: string;
  appointmentCode: string;
  patientName: string;
  scheduledStart: string;
  status: string;
  typeName?: string;
}

interface DoctorOnlineConsultPanelProps {
  appointments: DoctorConsultRow[];
  joinPathPrefix?: string;
  readOnly?: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const ACTIVE_STATUSES = new Set([
  'booked',
  'assigned',
  'confirmed',
  'in_progress',
  'consultation_started',
  'waiting_for_doctor',
]);

export function DoctorOnlineConsultPanel({
  appointments,
  joinPathPrefix = '/doctor/appointments',
  readOnly = false,
}: DoctorOnlineConsultPanelProps) {
  const upcoming = appointments.filter((a) => ACTIVE_STATUSES.has(a.status));
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = upcoming.filter((a) => a.scheduledStart.slice(0, 10) === todayKey).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FiVideo className="h-4 w-4 text-primary" />
              Online consultations
            </CardTitle>
            <CardDescription>
              Teleconsultation queue — video visits assigned to this doctor.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">Today: {todayCount}</Badge>
            <Badge variant="outline">Upcoming: {upcoming.length}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No online consultations scheduled.
          </p>
        ) : (
          upcoming.map((appt) => (
            <div
              key={appt.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">{appt.patientName}</p>
                <p className="text-sm text-muted-foreground">
                  {appt.typeName ?? 'Teleconsultation'} · {formatTime(appt.scheduledStart)}
                </p>
                <p className="text-xs text-muted-foreground">{appt.appointmentCode}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {appt.status.replace(/_/g, ' ')}
                </Badge>
                {!readOnly && (
                  <Button size="sm" variant="default" className="gap-1" asChild>
                    <Link to={`${joinPathPrefix}/${appt.id}/tele`}>
                      <FiVideo className="h-3.5 w-3.5" />
                      Join
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
