import { useEffect, useState } from 'react';
import { DoctorDashboardPanel } from '@/app/pages/doctor/dashboard/DoctorDashboardPanel';
import { DashboardCharts } from '@/app/pages/dashboard/components/DashboardCharts';
import { DashboardStats } from '@/app/pages/dashboard/components/DashboardStats';
import { EcosystemOverview } from '@/app/pages/dashboard/components/EcosystemOverview';
import { SampleAnalyticsPanel } from '@/app/pages/sample-collection/components/SampleAnalyticsPanel';
import { getDemoStaffDashboard } from '@/data/staffHubDemoData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardService } from '@/services/patients';
import { opsAnalyticsService, type AnalyticsPeriod } from '@/services/opsAnalytics';
import type { DashboardOverview } from '@/types';
import type { SampleCollectionAnalytics } from '@/types/sampleCollection';
import type { StaffMemberRow, StaffRoleKey } from '@/types/staffHub';

const PERIODS: AnalyticsPeriod[] = ['daily', 'monthly', 'yearly'];

interface StaffMemberDashboardPanelProps {
  roleKey: StaffRoleKey;
  member: StaffMemberRow;
  doctorId?: string;
}

function roleDashboardTitle(roleKey: StaffRoleKey): string {
  switch (roleKey) {
    case 'lab_partner':
      return 'Lab overview';
    case 'operations':
      return 'Operations overview';
    case 'technician':
      return 'Dashboard';
    case 'doctor':
      return 'Dashboard';
    default:
      return 'Dashboard';
  }
}

function roleDashboardDescription(roleKey: StaffRoleKey, memberName: string): string {
  switch (roleKey) {
    case 'lab_partner':
      return `${memberName} sees collected samples and published reports — daily, monthly, or yearly.`;
    case 'operations':
      return `${memberName} sees network-wide samples and reports across all teams.`;
    case 'technician':
    case 'doctor':
      return `${memberName} sees clinic KPIs, online consultations, trends, and the care ecosystem overview.`;
    default:
      return `${memberName} sees clinic KPIs, trends, and the care ecosystem overview.`;
  }
}

export function StaffMemberDashboardPanel({ roleKey, member, doctorId }: StaffMemberDashboardPanelProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('monthly');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [sampleAnalytics, setSampleAnalytics] = useState<SampleCollectionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const usesSampleAnalytics = roleKey === 'lab_partner' || roleKey === 'operations';
  const isDoctor = roleKey === 'doctor';
  const demoDashboard = getDemoStaffDashboard(roleKey);

  useEffect(() => {
    if (usesSampleAnalytics || isDoctor) return;

    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await dashboardService.getOverview();
        if (!cancelled) setOverview(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [usesSampleAnalytics, isDoctor]);

  useEffect(() => {
    if (!usesSampleAnalytics) return;

    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data =
          roleKey === 'lab_partner'
            ? await opsAnalyticsService.getLabAnalytics(period)
            : await opsAnalyticsService.getAdminSampleAnalytics(period);
        if (!cancelled) setSampleAnalytics(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [usesSampleAnalytics, roleKey, period]);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
        Preview of what <span className="font-medium">{member.fullName}</span> sees on their{' '}
        <span className="font-medium">Dashboard</span> home screen after sign-in.
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{roleDashboardTitle(roleKey)}</h3>
          <p className="text-sm text-muted-foreground">
            {roleDashboardDescription(roleKey, member.fullName)}
          </p>
        </div>
        {usesSampleAnalytics && (
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? 'default' : 'outline'}
                onClick={() => setPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isDoctor ? (
        <DoctorDashboardPanel
          doctorId={doctorId ?? member.id}
          memberName={member.fullName}
          readOnly
        />
      ) : usesSampleAnalytics ? (
        isLoading && !sampleAnalytics ? (
          <p className="text-sm text-muted-foreground">Loading analytics…</p>
        ) : sampleAnalytics ? (
          <SampleAnalyticsPanel
            analytics={sampleAnalytics}
            title={
              roleKey === 'lab_partner'
                ? 'Your lab — samples & reports'
                : 'All teams — samples & reports'
            }
          />
        ) : null
      ) : isLoading && !overview && !demoDashboard ? (
        <p className="text-sm text-muted-foreground">Loading dashboard data…</p>
      ) : (
        <>
          {demoDashboard && !overview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{demoDashboard.headline}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {demoDashboard.kpis.map((kpi) => (
                  <div key={kpi.label} className="rounded-md border px-3 py-3">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-semibold">{kpi.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <DashboardStats overview={overview} isLoading={isLoading} />
          {overview && <DashboardCharts overview={overview} />}
          <EcosystemOverview />
        </>
      )}
    </div>
  );
}
