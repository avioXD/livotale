import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAdminAppointmentsStore } from '@/store';

export function NotificationLogPage() {
  const reminderLogs = useAdminAppointmentsStore((s) => s.reminderLogs);
  const isLoading = useAdminAppointmentsStore((s) => s.isLoading);
  const error = useAdminAppointmentsStore((s) => s.error);
  const loadReminderLogs = useAdminAppointmentsStore((s) => s.loadReminderLogs);

  useEffect(() => {
    void loadReminderLogs();
  }, [loadReminderLogs]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification log"
        description="Appointment reminder dispatch history (in-app channel in dev)."
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
        <p className="text-sm text-muted-foreground">Loading logs…</p>
      ) : reminderLogs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No reminders logged yet. Run <code className="text-xs">npm run jobs:reminders</code> in the API project.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">Appointment</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {reminderLogs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-3 py-2">
                    {new Date(log.sentAt ?? log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{log.patientName ?? '—'}</td>
                  <td className="px-3 py-2">{log.appointmentCode ?? log.appointmentId.slice(0, 8)}</td>
                  <td className="px-3 py-2">{log.reminderType}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{log.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
