import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardStats } from '@/app/pages/dashboard/components/DashboardStats';
import { DashboardCharts } from '@/app/pages/dashboard/components/DashboardCharts';
import { EcosystemOverview } from '@/app/pages/dashboard/components/EcosystemOverview';
import { SampleAnalyticsPanel } from '@/app/pages/sample-collection/components/SampleAnalyticsPanel';
import { DoctorDashboardPanel } from '@/app/pages/doctor/dashboard/DoctorDashboardPanel';
import { PatientDashboardPanel } from '@/app/pages/patients/components/PatientDashboardPanel';
import { Button } from '@/components/ui/button';
import { useDashboardStore, useUserRole } from '@/store';
import { opsAnalyticsService, type AnalyticsPeriod } from '@/services/opsAnalytics';
import { AppRole } from '@/types';
import type { SampleCollectionAnalytics } from '@/types/sampleCollection';
import { APP_TAGLINE } from '@/utils/constants';

const ADMIN_OPS: AppRole[] = [AppRole.OPERATIONS, AppRole.CITY_MANAGER, AppRole.SUPER_ADMIN];

export function DashboardPage() {
  const userRole = useUserRole();
  const isPatient = userRole === AppRole.PATIENT;
  const isDoctor = userRole === AppRole.DOCTOR;
  const isLab = userRole === AppRole.LAB_PARTNER;
  const isAdminOps = userRole != null && ADMIN_OPS.includes(userRole);

  const overview = useDashboardStore((s) => s.overview);
  const patientDashboard = useDashboardStore((s) => s.patientDashboard);
  const isLoading = useDashboardStore((s) => s.isLoading);
  const error = useDashboardStore((s) => s.error);
  const loadOverview = useDashboardStore((s) => s.loadOverview);
  const loadPatientDashboard = useDashboardStore((s) => s.loadPatientDashboard);

  const [period, setPeriod] = useState<AnalyticsPeriod>('monthly');
  const [sampleAnalytics, setSampleAnalytics] = useState<SampleCollectionAnalytics | null>(null);

  useEffect(() => {
    if (isPatient) {
      void loadPatientDashboard();
    } else if (!isLab && !isAdminOps && !isDoctor) {
      void loadOverview();
    }
  }, [isPatient, isDoctor, isLab, isAdminOps, loadOverview, loadPatientDashboard]);

  useEffect(() => {
    if (!isLab && !isAdminOps) return;
    void (async () => {
      const data = isLab
        ? await opsAnalyticsService.getLabAnalytics(period)
        : await opsAnalyticsService.getAdminSampleAnalytics(period);
      setSampleAnalytics(data);
    })();
  }, [isLab, isAdminOps, period]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isPatient ? 'My Health Dashboard' : isDoctor ? 'Doctor dashboard' : isLab ? 'Lab overview' : isAdminOps ? 'Operations overview' : 'Dashboard'}
          </h2>
          <p className="text-muted-foreground">
            {isPatient
              ? 'Your liver care metrics, trends, and program progress'
              : isDoctor
                ? 'Clinic KPIs, online consultations, and your teleconsultation queue'
              : isLab || isAdminOps
                ? 'Collected samples and published reports — daily, monthly, or yearly'
                : APP_TAGLINE}
          </p>
        </div>
        {(isLab || isAdminOps) && (
          <div className="flex flex-wrap gap-2">
            {(['daily', 'monthly', 'yearly'] as AnalyticsPeriod[]).map((p) => (
              <Button key={p} size="sm" variant={period === p ? 'default' : 'outline'} onClick={() => setPeriod(p)}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
            {isLab && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/lab-samples">Testing queue</Link>
              </Button>
            )}
            {isAdminOps && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/staff/technicians">People & staff</Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isPatient ? (
        isLoading && !patientDashboard ? (
          <p className="text-sm text-muted-foreground">Loading your health data…</p>
        ) : patientDashboard ? (
          <PatientDashboardPanel dashboard={patientDashboard} />
        ) : null
      ) : isDoctor ? (
        <DoctorDashboardPanel />
      ) : isLab || isAdminOps ? (
        sampleAnalytics ? (
          <SampleAnalyticsPanel
            analytics={sampleAnalytics}
            title={isLab ? 'Your lab — samples & reports' : 'All teams — samples & reports'}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Loading sample analytics…</p>
        )
      ) : (
        <>
          <DashboardStats overview={overview} isLoading={isLoading} />
          {overview && <DashboardCharts overview={overview} />}
          <EcosystemOverview />
        </>
      )}
    </div>
  );
}
