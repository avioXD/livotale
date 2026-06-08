import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { isAdminRole } from '@/app/config/productRoles';
import { useUserRole } from '@/store';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { StaffRoleWorkspace } from '@/app/pages/admin/staff/components/StaffRoleWorkspace';
import { STAFF_ROLE_CONFIGS, staffRoleFromSlug } from '@/app/pages/admin/staff/staffHubConfig';
import { Button } from '@/components/ui/button';
import { adminAppointmentsService } from '@/services/appointments';
import { opsAnalyticsService, type AnalyticsPeriod } from '@/services/opsAnalytics';
import { staffDirectoryService } from '@/services/staff/StaffDirectoryService';
import type { SampleCollectionAnalytics, StaffLabPartnerProfile, StaffTechnicianProfile } from '@/types/sampleCollection';
import type { DoctorOption } from '@/types/appointments';
import type { StaffMemberRow, StaffRoleDashboard, StaffSectionTab } from '@/types/staffHub';

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

function parseSection(value: string | null): StaffSectionTab {
  if (value === 'users') return 'users';
  if (value === 'directory' || value === 'profiles' || value === 'performance') return 'users';
  return 'dashboard';
}

export function AdminStaffHubPage() {
  const userRole = useUserRole();
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeRole = staffRoleFromSlug(roleSlug);
  const activeSection = parseSection(searchParams.get('section'));

  if (!activeRole) {
    return <Navigate to="/admin/staff/technicians" replace />;
  }

  if (activeRole === 'operations' && !isAdminRole(userRole)) {
    return <Navigate to="/admin/staff/technicians" replace />;
  }

  const [period, setPeriod] = useState<AnalyticsPeriod>('monthly');
  const [analytics, setAnalytics] = useState<SampleCollectionAnalytics | null>(null);
  const [technicians, setTechnicians] = useState<StaffTechnicianProfile[]>([]);
  const [labPartners, setLabPartners] = useState<StaffLabPartnerProfile[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberRow[]>([]);
  const [staffDashboard, setStaffDashboard] = useState<StaffRoleDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setSection = (section: StaffSectionTab) => {
    setSearchParams(section === 'dashboard' ? {} : { section });
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const [a, t, l, d, staffRows, staffSummary] = await Promise.all([
        opsAnalyticsService.getAdminSampleAnalytics(period),
        opsAnalyticsService.listTechnicians(),
        opsAnalyticsService.listLabPartners(),
        adminAppointmentsService.listDoctors(),
        staffDirectoryService.listUsers(activeRole),
        staffDirectoryService.getDashboard(activeRole),
      ]);
      setAnalytics(a);
      setTechnicians(t);
      setLabPartners(l);
      setDoctors(d);
      setStaffMembers(staffRows);
      setStaffDashboard(staffSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff data');
      try {
        setAnalytics(await opsAnalyticsService.getAdminSampleAnalytics(period));
      } catch {
        // ignore
      }
    }
  }, [activeRole, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeRoleConfig = STAFF_ROLE_CONFIGS.find((r) => r.key === activeRole)!;

  return (
    <div className="space-y-6">
      <PageHeader
        title={activeRoleConfig.label}
        description={`${activeRoleConfig.description} Open Dashboard for team reports or Users to browse staff.`}
        actions={
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link to="/admin/operations">
              <FiArrowLeft className="h-4 w-4" />
              Ops dashboard
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={period === p.value ? 'default' : 'outline'}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <StaffRoleWorkspace
        role={activeRoleConfig}
        section={activeSection}
        onSectionChange={setSection}
        period={period}
        analytics={analytics}
        technicians={technicians}
        labPartners={labPartners}
        doctors={doctors}
        staffMembers={staffMembers}
        staffDashboard={staffDashboard}
      />
    </div>
  );
}

export function AdminStaffHubRedirect() {
  return <Navigate to="/admin/staff/technicians" replace />;
}
