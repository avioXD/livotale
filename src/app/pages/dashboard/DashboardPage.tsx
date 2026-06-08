import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LiverCareDashboardPanel } from '@/app/pages/admin/dashboard/LiverCareDashboardPanel';
import { OpsDashboardPanel } from '@/app/pages/admin/dashboard/OpsDashboardPanel';
import { TechnicianDashboardPanel } from '@/app/pages/admin/dashboard/TechnicianDashboardPanel';
import { DoctorLiverCareDashboardPanel } from '@/app/pages/admin/dashboard/DoctorLiverCareDashboardPanel';
import { SampleAnalyticsPanel } from '@/app/pages/sample-collection/components/SampleAnalyticsPanel';
import { ADMIN_ROLES } from '@/app/config/productRoles';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/store';
import { opsAnalyticsService, type AnalyticsPeriod } from '@/services/opsAnalytics';
import { AppRole } from '@/types';
import type { SampleCollectionAnalytics } from '@/types/sampleCollection';

const ROLE_TITLES: Partial<Record<AppRole, { title: string; description: string }>> = {
  [AppRole.SUPER_ADMIN]: {
    title: 'Admin dashboard',
    description: 'Clinic-wide Liver Fibrosis Scan operations — revenue, orders, and team activity.',
  },
  [AppRole.CITY_MANAGER]: {
    title: 'Admin dashboard',
    description: 'Clinic-wide Liver Fibrosis Scan operations — revenue, orders, and team activity.',
  },
  [AppRole.OPERATIONS]: {
    title: 'Operations dashboard',
    description: 'Enquiries, payments, partner lab workflow, and AI review queue.',
  },
  [AppRole.TECHNICIAN]: {
    title: 'Field dashboard',
    description: 'Assigned scans, visit schedule, and blood sample dispatch to partner labs.',
  },
  [AppRole.DOCTOR]: {
    title: 'Clinical dashboard',
    description: 'Liver care consultations, reports ready for review, and prescriptions.',
  },
};

export function DashboardPage() {
  const userRole = useUserRole();
  const isAdmin = userRole != null && (ADMIN_ROLES as readonly AppRole[]).includes(userRole);

  const [period, setPeriod] = useState<AnalyticsPeriod>('monthly');
  const [sampleAnalytics, setSampleAnalytics] = useState<SampleCollectionAnalytics | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      const data = await opsAnalyticsService.getAdminSampleAnalytics(period);
      setSampleAnalytics(data);
    })();
  }, [isAdmin, period]);

  const meta = userRole ? ROLE_TITLES[userRole] : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{meta?.title ?? 'Dashboard'}</h2>
          <p className="text-muted-foreground">{meta?.description ?? 'Your workspace overview.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              {(['daily', 'monthly', 'yearly'] as AnalyticsPeriod[]).map((p) => (
                <Button key={p} size="sm" variant={period === p ? 'default' : 'outline'} onClick={() => setPeriod(p)}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/operations">Operations hub</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/staff/technicians">People & staff</Link>
              </Button>
            </>
          )}
          {userRole === AppRole.OPERATIONS && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/operations">Operations hub</Link>
            </Button>
          )}
          {userRole === AppRole.TECHNICIAN && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/technician/orders">Assigned orders</Link>
            </Button>
          )}
          {userRole === AppRole.DOCTOR && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/doctor/consultations">Liver care Rx</Link>
            </Button>
          )}
        </div>
      </div>

      {isAdmin && <LiverCareDashboardPanel />}
      {userRole === AppRole.OPERATIONS && <OpsDashboardPanel />}
      {userRole === AppRole.TECHNICIAN && <TechnicianDashboardPanel />}
      {userRole === AppRole.DOCTOR && <DoctorLiverCareDashboardPanel />}

      {isAdmin && sampleAnalytics ? (
        <SampleAnalyticsPanel analytics={sampleAnalytics} title="All teams — samples & reports" />
      ) : isAdmin ? (
        <p className="text-sm text-muted-foreground">Loading sample analytics…</p>
      ) : null}
    </div>
  );
}
