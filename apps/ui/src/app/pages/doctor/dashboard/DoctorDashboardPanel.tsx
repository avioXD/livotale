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
import { doctorConsultationService } from '@/services';
import { dashboardService } from '@/services/patients';
import type { DashboardOverview } from '@/types';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { orgPath } from '@/app/config/orgRoutes';

interface DoctorDashboardPanelProps {
  /** When set, loads this doctor's queue via admin API (staff profile preview). */
  doctorId?: string;
  memberName?: string;
  readOnly?: boolean;
}

const CONSULTATION_ORDER_STATUSES = new Set([
  'doctor_assigned',
  'consultation_pending',
  'prescription_pending',
  'prescription_generated',
]);

function orderToConsultRow(order: LiverCareOrder): DoctorConsultRow | null {
  if (!order.consultationScheduledAt) return null;
  if (!CONSULTATION_ORDER_STATUSES.has(order.orderStatus)) return null;
  return {
    id: order.id,
    appointmentCode: order.orderNumber,
    patientName: order.patientName,
    scheduledStart: order.consultationScheduledAt,
    status: order.orderStatus,
    typeName: order.packageName,
  };
}

export function DoctorDashboardPanel({
  doctorId,
  memberName,
  readOnly = false,
}: DoctorDashboardPanelProps) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [teleAppointments, setTeleAppointments] = useState<DoctorConsultRow[]>([]);
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
        const orders = await doctorConsultationService.listAssignedOrders(doctorId);
        const teleRows = orders
          .map(orderToConsultRow)
          .filter((row): row is DoctorConsultRow => row !== null);

        if (!cancelled) {
          setTeleAppointments(teleRows);
        }
      } catch {
        if (!cancelled) {
          setTeleAppointments([]);
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
            <Link to={orgPath('/doctor/consultations')}>Open consultations</Link>
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
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
