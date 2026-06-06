import { useEffect } from 'react';
import { DashboardStats } from '@/app/pages/dashboard/components/DashboardStats';
import { DashboardCharts } from '@/app/pages/dashboard/components/DashboardCharts';
import { EcosystemOverview } from '@/app/pages/dashboard/components/EcosystemOverview';
import { PatientDashboardPanel } from '@/app/pages/patients/components/PatientDashboardPanel';
import { useDashboardStore, useUserRole } from '@/store';
import { AppRole } from '@/types';
import { APP_TAGLINE } from '@/utils/constants';

export function DashboardPage() {
  const userRole = useUserRole();
  const isPatient = userRole === AppRole.PATIENT;

  const overview = useDashboardStore((s) => s.overview);
  const patientDashboard = useDashboardStore((s) => s.patientDashboard);
  const isLoading = useDashboardStore((s) => s.isLoading);
  const error = useDashboardStore((s) => s.error);
  const loadOverview = useDashboardStore((s) => s.loadOverview);
  const loadPatientDashboard = useDashboardStore((s) => s.loadPatientDashboard);

  useEffect(() => {
    if (isPatient) {
      void loadPatientDashboard();
    } else {
      void loadOverview();
    }
  }, [isPatient, loadOverview, loadPatientDashboard]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {isPatient ? 'My Health Dashboard' : 'Dashboard'}
        </h2>
        <p className="text-muted-foreground">
          {isPatient ? 'Your liver care metrics, trends, and program progress' : APP_TAGLINE}
        </p>
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
