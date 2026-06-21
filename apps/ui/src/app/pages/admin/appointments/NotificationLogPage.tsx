import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { FiArrowLeft } from 'react-icons/fi';
import {
  DataTable,
  PageHeader,
  PaginationControls,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminAppointmentsStore } from '@/store';
import type { AppointmentReminderLog, TableColumn } from '@/types';
import { orgPath } from '@/app/config/orgRoutes';
import { useStorePaged } from '@/hooks/useStorePaged';

export function NotificationLogPage() {
  const {
    reminderLogsPageSize,
    isLoading,
    error,
    loadReminderLogs,
    setReminderLogsPage,
    setReminderLogsPageSize,
  } = useAdminAppointmentsStore(
    useShallow((s) => ({
      reminderLogsPageSize: s.reminderLogsPageSize,
      isLoading: s.isLoading,
      error: s.error,
      loadReminderLogs: s.loadReminderLogs,
      setReminderLogsPage: s.setReminderLogsPage,
      setReminderLogsPageSize: s.setReminderLogsPageSize,
    })),
  );

  useEffect(() => {
    void loadReminderLogs();
  }, [loadReminderLogs]);

  const paged = useStorePaged(
    useAdminAppointmentsStore,
    (s) => ({
      items: s.reminderLogs,
      page: s.reminderLogsPage,
      pageSize: s.reminderLogsPageSize,
    }),
    (s) => s.setReminderLogsPage,
  );

  const columns: TableColumn<AppointmentReminderLog>[] = useMemo(
    () => [
      {
        key: 'when',
        header: 'When',
        render: (log) => new Date(log.sentAt ?? log.createdAt).toLocaleString(),
      },
      {
        key: 'patient',
        header: 'Patient',
        render: (log) => log.patientName ?? '—',
      },
      {
        key: 'appointment',
        header: 'Appointment',
        render: (log) => log.appointmentCode ?? log.appointmentId.slice(0, 8),
      },
      {
        key: 'type',
        header: 'Type',
        render: (log) => log.reminderType,
      },
      {
        key: 'status',
        header: 'Status',
        render: (log) => <Badge variant="outline">{log.status}</Badge>,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification log"
        description="Appointment reminder dispatch history (in-app channel in dev)."
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

      <DataTable
        columns={columns}
        data={paged.items}
        isLoading={isLoading}
        emptyMessage="No reminders logged yet. Run npm run jobs:reminders in the API project."
        getRowKey={(log) => log.id}
      />

      <PaginationControls
        page={paged.page}
        pageSize={reminderLogsPageSize}
        total={paged.total}
        totalPages={paged.totalPages}
        onPageChange={setReminderLogsPage}
        onPageSizeChange={setReminderLogsPageSize}
        isLoading={isLoading}
      />
    </div>
  );
}
