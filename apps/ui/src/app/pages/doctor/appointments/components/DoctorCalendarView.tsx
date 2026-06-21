import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DoctorAppointmentSummary, DoctorCalendarView } from '@/types';

interface DoctorCalendarViewProps {
  view: DoctorCalendarView;
  date: string;
  appointments: DoctorAppointmentSummary[];
  onSelect: (id: string) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function DoctorCalendarView({ view, date, appointments, onSelect }: DoctorCalendarViewProps) {
  if (!appointments.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No appointments in this {view} view for {date}.
        </CardContent>
      </Card>
    );
  }

  const grouped =
    view === 'day'
      ? [[date, appointments] as const]
      : Object.entries(
          appointments.reduce<Record<string, DoctorAppointmentSummary[]>>((acc, appt) => {
            const key = appt.scheduledStart.slice(0, 10);
            acc[key] = acc[key] ?? [];
            acc[key].push(appt);
            return acc;
          }, {}),
        );

  return (
    <div className="space-y-4">
      {grouped.map(([day, rows]) => (
        <Card key={day}>
          {view !== 'day' && (
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{formatDay(`${day}T12:00:00`)}</CardTitle>
            </CardHeader>
          )}
          <CardContent className="space-y-2">
            {rows.map((appt) => (
              <button
                key={appt.id}
                type="button"
                onClick={() => onSelect(appt.id)}
                className="flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{appt.patientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {appt.typeName} · {formatTime(appt.scheduledStart)}
                  </p>
                  {appt.chiefComplaint && (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{appt.chiefComplaint}</p>
                  )}
                </div>
                <Badge variant="secondary" className="capitalize shrink-0">
                  {appt.status.replace(/_/g, ' ')}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
