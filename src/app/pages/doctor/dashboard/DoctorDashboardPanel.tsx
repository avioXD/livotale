import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardCharts } from '@/app/pages/dashboard/components/DashboardCharts';
import { DashboardStats } from '@/app/pages/dashboard/components/DashboardStats';
import { EcosystemOverview } from '@/app/pages/dashboard/components/EcosystemOverview';
import {
  DoctorOnlineConsultPanel,
  type DoctorConsultRow,
} from '@/app/pages/doctor/dashboard/components/DoctorOnlineConsultPanel';
import { Button } from '@/components/ui/button';
import { adminAppointmentsService } from '@/services/appointments';
import { doctorAppointmentsService } from '@/services';
import { dashboardService } from '@/services/patients';
import type { DashboardOverview } from '@/types';

const DEMO_TELE_CONSULTS: DoctorConsultRow[] = [
  {
    id: 'demo-tele-1',
    appointmentCode: 'APT-TELE-1042',
    patientName: 'Rohan Mehta',
    scheduledStart: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
    status: 'assigned',
    typeName: 'Teleconsultation',
  },
  {
    id: 'demo-tele-2',
    appointmentCode: 'APT-TELE-1048',
    patientName: 'Priya Nair',
    scheduledStart: new Date(new Date().setHours(15, 30, 0, 0)).toISOString(),
    status: 'booked',
    typeName: 'Follow-up teleconsult',
  },
];

interface DoctorDashboardPanelProps {
  /** When set, loads this doctor's queue via admin API (staff profile preview). */
  doctorId?: string;
  memberName?: string;
  readOnly?: boolean;
}

function toConsultRow(row: {
  id: string;
  appointmentCode: string;
  patientName: string;
  scheduledStart: string;
  status: string;
  typeName?: string;
}): DoctorConsultRow {
  return {
    id: row.id,
    appointmentCode: row.appointmentCode,
    patientName: row.patientName,
    scheduledStart: row.scheduledStart,
    status: row.status,
    typeName: row.typeName,
  };
}

export function DoctorDashboardPanel({
  doctorId,
  memberName,
  readOnly = false,
}: DoctorDashboardPanelProps) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [teleAppointments, setTeleAppointments] = useState<DoctorConsultRow[]>([]);
  const [usingDemoTele, setUsingDemoTele] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const overviewData = await dashboardService.getOverview();
        if (!cancelled) setOverview(overviewData);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      }

      try {
        const today = new Date().toISOString().slice(0, 10);
        let teleRows: DoctorConsultRow[] = [];

        if (doctorId) {
          const rows = await adminAppointmentsService.list({
            doctorId,
            dateFrom: `${today}T00:00:00.000Z`,
            limit: '50',
          });
          teleRows = rows
            .filter((r) => r.visitMode === 'tele')
            .map(toConsultRow);
        } else {
          const calendar = await doctorAppointmentsService.getCalendar({ view: 'week', date: today });
          teleRows = calendar.appointments
            .filter((r) => r.visitMode === 'tele')
            .map(toConsultRow);
        }

        if (!cancelled) {
          if (teleRows.length > 0) {
            setTeleAppointments(teleRows);
            setUsingDemoTele(false);
          } else {
            setTeleAppointments(DEMO_TELE_CONSULTS);
            setUsingDemoTele(true);
          }
        }
      } catch {
        if (!cancelled) {
          setTeleAppointments(DEMO_TELE_CONSULTS);
          setUsingDemoTele(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const title = memberName ? `${memberName}'s dashboard` : 'Dashboard';
  const description = memberName
    ? 'Clinic KPIs, online consultations, and care ecosystem overview.'
    : 'Clinic KPIs, online consultations, and your teleconsultation queue.';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {!readOnly && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/doctor/appointments">Open calendar</Link>
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {usingDemoTele && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Showing demo online consultations — assign tele appointments to this doctor for live data.
        </div>
      )}

      <DoctorOnlineConsultPanel
        appointments={teleAppointments}
        readOnly={readOnly}
      />

      <DashboardStats overview={overview} isLoading={isLoading} />
      {overview && <DashboardCharts overview={overview} />}
      <EcosystemOverview />
    </div>
  );
}
