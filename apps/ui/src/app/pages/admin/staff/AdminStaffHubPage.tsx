import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { isAdminRole } from '@/app/config/productRoles';
import { useUserRole } from '@/store';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { StaffRoleWorkspace } from '@/app/pages/admin/staff/components/StaffRoleWorkspace';
import { PLATFORM_ADMIN_STAFF_KEYS, STAFF_ROLE_CONFIGS, staffRoleFromSlug } from '@/app/pages/admin/staff/staffHubConfig';
import { orgPath } from '@/app/config/orgRoutes';
import { Button } from '@/components/ui/button';
import { adminAppointmentsService } from '@/services/appointments';
import { opsAnalyticsService } from '@/services/opsAnalytics';
import { staffDirectoryService } from '@/services/staff/StaffDirectoryService';
import type { StaffLabPartnerProfile, StaffTechnicianProfile } from '@/types/sampleCollection';
import type { DoctorOption } from '@/types/appointments';
import type { StaffMemberRow, StaffRoleDashboard, StaffSectionTab } from '@/types/staffHub';
import { useUrlTabState } from '@/hooks/useUrlTabState';

const STAFF_SECTIONS = ['dashboard', 'users'] as const;

function parseSection(value: string | null): StaffSectionTab {
  if (value === 'users') return 'users';
  if (value === 'directory' || value === 'profiles' || value === 'performance') return 'users';
  return 'dashboard';
}

export function AdminStaffHubPage() {
  const userRole = useUserRole();
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const [searchParams] = useSearchParams();
  const activeRole = staffRoleFromSlug(roleSlug);
  const activeSection = parseSection(searchParams.get('section'));

  if (!activeRole) {
    return <Navigate to={orgPath('/admin/staff/technicians')} replace />;
  }

  if (activeRole === 'lab_partner') {
    return <Navigate to={orgPath('/admin/staff/lab-partners')} replace />;
  }

  if (PLATFORM_ADMIN_STAFF_KEYS.has(activeRole) && !isAdminRole(userRole)) {
    return <Navigate to={orgPath('/admin/staff/technicians')} replace />;
  }

  const [technicians, setTechnicians] = useState<StaffTechnicianProfile[]>([]);
  const [labPartners, setLabPartners] = useState<StaffLabPartnerProfile[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberRow[]>([]);
  const [staffDashboard, setStaffDashboard] = useState<StaffRoleDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setSection] = useUrlTabState({
    param: 'section',
    defaultValue: 'dashboard',
    validValues: STAFF_SECTIONS,
    omitDefault: true,
  });

  const load = useCallback(async () => {
    setError(null);
    const needsTechnicians = activeRole === 'technician';
    const needsDoctors = activeRole === 'doctor';
    const needsLabPartners = activeRole === 'lab_partner';

    const [techniciansResult, labPartnersResult, doctorsResult, staffRowsResult, staffSummaryResult] =
      await Promise.allSettled([
        needsTechnicians ? opsAnalyticsService.listTechnicians() : Promise.resolve([]),
        needsLabPartners ? opsAnalyticsService.listLabPartners() : Promise.resolve([]),
        needsDoctors ? adminAppointmentsService.listDoctors() : Promise.resolve([]),
        staffDirectoryService.listUsers(activeRole),
        staffDirectoryService.getDashboard(activeRole),
      ]);

    const failures: string[] = [];

    if (techniciansResult.status === 'fulfilled') {
      setTechnicians(techniciansResult.value);
    } else {
      setTechnicians([]);
      failures.push('technicians');
    }

    if (labPartnersResult.status === 'fulfilled') {
      setLabPartners(labPartnersResult.value);
    } else {
      setLabPartners([]);
      failures.push('lab partners');
    }

    if (doctorsResult.status === 'fulfilled') {
      setDoctors(doctorsResult.value);
    } else {
      setDoctors([]);
      failures.push('doctors');
    }

    if (staffRowsResult.status === 'fulfilled') {
      setStaffMembers(staffRowsResult.value);
    } else {
      setStaffMembers([]);
      failures.push('staff directory');
    }

    if (staffSummaryResult.status === 'fulfilled') {
      setStaffDashboard(staffSummaryResult.value);
    } else {
      setStaffDashboard(null);
      failures.push('staff dashboard');
    }

    const criticalFailed = staffRowsResult.status === 'rejected';
    if (criticalFailed) {
      const reason = staffRowsResult.reason;
      setError(reason instanceof Error ? reason.message : 'Failed to load staff directory');
    } else if (failures.length > 0) {
      console.warn(`Staff hub partial load failures: ${failures.join(', ')}`);
    }
  }, [activeRole]);

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
            <Link to={orgPath('/admin/operations')}>
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

      <StaffRoleWorkspace
        role={activeRoleConfig}
        section={activeSection}
        onSectionChange={setSection}
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
  return <Navigate to={orgPath('/admin/staff/technicians')} replace />;
}
