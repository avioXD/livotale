import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LiverCareDashboardPanel } from '@/app/pages/admin/dashboard/LiverCareDashboardPanel';
import { OpsDashboardPanel } from '@/app/pages/admin/dashboard/OpsDashboardPanel';
import { TechnicianDashboardPanel } from '@/app/pages/admin/dashboard/TechnicianDashboardPanel';
import { DoctorLiverCareDashboardPanel } from '@/app/pages/admin/dashboard/DoctorLiverCareDashboardPanel';
import { SampleAnalyticsPanel } from '@/app/pages/sample-collection/components/SampleAnalyticsPanel';
import { buildStaffGlobalKpis } from '@/app/pages/admin/staff/staffAnalyticsUtils';
import { ADMIN_ROLES } from '@/app/config/productRoles';
import { orgPath } from '@/app/config/orgRoutes';
import { AnalyticsPeriodToolbar, DashboardErrorState, KpiCard, kpiAccentAt } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useUserRole } from '@/store';
import { adminAppointmentsService } from '@/services/appointments';
import { opsAnalyticsService, type AnalyticsPeriod } from '@/services/opsAnalytics';
import { AppRole } from '@/types';
import type { StaffLabPartnerProfile, StaffTechnicianProfile } from '@/types/sampleCollection';
import type { DoctorOption } from '@/types/appointments';
import type { StaffRoleKey } from '@/types/staffHub';

const ROLE_TITLES: Partial<Record<AppRole, { title: string; description: string }>> = {
  [AppRole.SUPER_ADMIN]: {
    title: 'Admin dashboard',
    description: 'Clinic-wide Liver Fibrosis Scan operations — revenue, orders, and team activity.',
  },
  [AppRole.CITY_MANAGER]: {
    title: 'City dashboard',
    description: 'City-scoped Liver Fibrosis Scan operations — orders, field visits, and team activity.',
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

const NETWORK_ANALYTICS_ROLES: AppRole[] = [
  AppRole.SUPER_ADMIN,
  AppRole.CITY_MANAGER,
  AppRole.OPERATIONS,
];

function appRoleToStaffKey(role: AppRole): StaffRoleKey {
  switch (role) {
    case AppRole.TECHNICIAN:
      return 'technician';
    case AppRole.DOCTOR:
      return 'doctor';
    case AppRole.SUPER_ADMIN:
      return 'super_admin';
    default:
      return 'operations';
  }
}

export function DashboardPage() {
  const userRole = useUserRole();
  const isAdmin = userRole != null && (ADMIN_ROLES as readonly AppRole[]).includes(userRole);
  const showsNetworkAnalytics = userRole != null && NETWORK_ANALYTICS_ROLES.includes(userRole);

  const [period, setPeriod] = useState<AnalyticsPeriod>('monthly');

  const analyticsQuery = useAsyncData(async () => {
    if (!showsNetworkAnalytics || !userRole) return null;
    const [sampleAnalytics, technicians, labPartners, doctors] = await Promise.all([
      opsAnalyticsService.getAdminSampleAnalytics(period),
      userRole === AppRole.TECHNICIAN ? Promise.resolve([] as StaffTechnicianProfile[]) : opsAnalyticsService.listTechnicians(),
      userRole === AppRole.TECHNICIAN || userRole === AppRole.DOCTOR
        ? Promise.resolve([] as StaffLabPartnerProfile[])
        : opsAnalyticsService.listLabPartners(),
      userRole === AppRole.DOCTOR ? Promise.resolve([] as DoctorOption[]) : adminAppointmentsService.listDoctors(),
    ]);
    return { sampleAnalytics, technicians, labPartners, doctors };
  }, [showsNetworkAnalytics, period, userRole]);

  const globalKpis = useMemo(() => {
    if (!userRole || !analyticsQuery.data?.sampleAnalytics) return [];
    const { sampleAnalytics, technicians, labPartners, doctors } = analyticsQuery.data;
    return buildStaffGlobalKpis(appRoleToStaffKey(userRole), sampleAnalytics, {
      technicians,
      labPartners,
      doctors,
      memberCount: technicians.length + labPartners.length + doctors.length,
    });
  }, [userRole, analyticsQuery.data]);

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
              <Button variant="outline" size="sm" asChild>
                <Link to={orgPath('/admin/operations')}>Operations hub</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={orgPath('/admin/staff/technicians')}>People & staff</Link>
              </Button>
            </>
          )}
          {userRole === AppRole.OPERATIONS && (
            <Button variant="outline" size="sm" asChild>
              <Link to={orgPath('/admin/operations')}>Operations hub</Link>
            </Button>
          )}
          {userRole === AppRole.TECHNICIAN && (
            <Button variant="outline" size="sm" asChild>
              <Link to={orgPath('/technician/orders')}>Assigned orders</Link>
            </Button>
          )}
          {userRole === AppRole.DOCTOR && (
            <Button variant="outline" size="sm" asChild>
              <Link to={orgPath('/doctor/consultations')}>Liver care Rx</Link>
            </Button>
          )}
        </div>
      </div>

      {showsNetworkAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Global report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyticsQuery.status === 'error' && (
              <DashboardErrorState message={analyticsQuery.error ?? 'Failed to load analytics'} onRetry={analyticsQuery.retry} />
            )}
            {analyticsQuery.status === 'loading' && (
              <p className="text-sm text-muted-foreground">Loading summary…</p>
            )}
            {analyticsQuery.status === 'ready' && globalKpis.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {globalKpis.map((kpi, i) => (
                  <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} hint={kpi.hint} accent={kpiAccentAt(i)} />
                ))}
              </div>
            )}
            <AnalyticsPeriodToolbar period={period} onPeriodChange={setPeriod} />
          </CardContent>
        </Card>
      )}

      {isAdmin && <LiverCareDashboardPanel />}
      {userRole === AppRole.OPERATIONS && <OpsDashboardPanel />}
      {userRole === AppRole.TECHNICIAN && <TechnicianDashboardPanel />}
      {userRole === AppRole.DOCTOR && <DoctorLiverCareDashboardPanel />}

      {showsNetworkAnalytics && analyticsQuery.status === 'ready' && analyticsQuery.data?.sampleAnalytics ? (
        <SampleAnalyticsPanel analytics={analyticsQuery.data.sampleAnalytics} title={`Detailed analytics (${period})`} />
      ) : showsNetworkAnalytics && analyticsQuery.status === 'loading' ? (
        <p className="text-sm text-muted-foreground">Loading sample analytics…</p>
      ) : null}
    </div>
  );
}
