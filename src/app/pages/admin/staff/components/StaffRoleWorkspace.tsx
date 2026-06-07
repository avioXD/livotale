import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUserPlus } from 'react-icons/fi';
import {
  DataTable,
  FilterField,
  ListToolbar,
  PaginationControls,
} from '@/components/common';
import { SampleAnalyticsPanel } from '@/app/pages/sample-collection/components/SampleAnalyticsPanel';
import { buildStaffUserColumns } from '@/app/pages/admin/staff/components/staffUserColumns';
import { STAFF_SECTION_TABS, staffRolePath } from '@/app/pages/admin/staff/staffHubConfig';
import { listStaffMembersForRole, staffMemberDetailPath } from '@/app/pages/admin/staff/staffMemberUtils';
import { getDemoStaffDashboard } from '@/data/staffHubDemoData';
import { staffOnboardingService } from '@/services/staff/StaffOnboardingService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { paginateList } from '@/utils/pagination';
import type { SampleCollectionAnalytics, StaffLabPartnerProfile, StaffTechnicianProfile } from '@/types/sampleCollection';
import type { DoctorOption } from '@/types/appointments';
import type { StaffMemberRow, StaffRoleConfig, StaffRoleDashboard, StaffSectionTab } from '@/types/staffHub';

interface StaffRoleWorkspaceProps {
  role: StaffRoleConfig;
  section: StaffSectionTab;
  onSectionChange: (tab: StaffSectionTab) => void;
  period: 'daily' | 'monthly' | 'yearly';
  analytics: SampleCollectionAnalytics | null;
  technicians: StaffTechnicianProfile[];
  labPartners: StaffLabPartnerProfile[];
  doctors: DoctorOption[];
  staffMembers?: StaffMemberRow[];
  staffDashboard?: StaffRoleDashboard | null;
}

export function StaffRoleWorkspace({
  role,
  section,
  onSectionChange,
  period,
  analytics,
  technicians,
  labPartners,
  doctors,
  staffMembers = [],
  staffDashboard = null,
}: StaffRoleWorkspaceProps) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; fullName: string; mobile: string; status: string }>>([]);

  useEffect(() => {
    void staffOnboardingService.listInvites(role.key).then((invites) => {
      setPendingInvites(
        invites
          .filter((i) => i.employmentStatus === 'inactive' || i.status !== 'active')
          .map((i) => ({
            id: i.memberId ?? i.id,
            fullName: i.fullName,
            mobile: i.mobile,
            status: i.employmentStatus,
          })),
      );
    });
  }, [role.key]);

  const allMembers = useMemo(() => {
    const rows = listStaffMembersForRole(role.key, {
      technicians,
      labPartners,
      doctors,
      directoryRows: staffMembers,
    });
    const existingIds = new Set(rows.map((r) => r.id));
    const fromInvites: StaffMemberRow[] = pendingInvites
      .filter((i) => !existingIds.has(i.id))
      .map((i) => ({
        id: i.id,
        fullName: i.fullName,
        subtitle: `${i.mobile} · onboarding`,
        status: i.status || 'inactive',
        email: null,
        mobile: i.mobile,
        metrics: [{ label: 'Onboarding', value: 'Pending' }],
      }));
    return [...fromInvites, ...rows];
  }, [role.key, technicians, labPartners, doctors, staffMembers, pendingInvites]);

  const filteredMembers = useMemo(() => {
    return allMembers.filter((m) => {
      if (appliedStatus && m.status.toLowerCase() !== appliedStatus.toLowerCase()) return false;
      if (!appliedSearch) return true;
      const haystack = [m.fullName, m.subtitle, m.email, m.mobile, m.status].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(appliedSearch);
    });
  }, [allMembers, appliedSearch, appliedStatus]);

  const paged = paginateList(filteredMembers, page, pageSize);
  const columns = useMemo(() => buildStaffUserColumns(role.key), [role.key]);

  const statusOptions = useMemo(() => {
    return [...new Set(allMembers.map((m) => m.status))].sort();
  }, [allMembers]);

  const dashboard = useMemo(() => {
    if (role.key === 'technician' && analytics) {
      const s = analytics.summary;
      return {
        kpis: [
          { label: 'Total samples', value: s.total_samples },
          { label: 'Collected', value: s.collected },
          { label: 'In lab pipeline', value: s.in_lab_pipeline },
          { label: 'Reports published', value: s.reports_published },
          { label: 'Active technicians', value: technicians.length },
        ],
      };
    }
    if (role.key === 'lab_partner' && analytics) {
      const s = analytics.summary;
      return {
        kpis: [
          { label: 'Samples in pipeline', value: s.in_lab_pipeline },
          { label: 'Published reports', value: s.reports_published },
          { label: 'Rejected', value: s.rejected },
          { label: 'Active labs', value: labPartners.length },
        ],
      };
    }
    if (role.key === 'doctor') {
      return {
        kpis: [
          { label: 'Active doctors', value: doctors.length },
          { label: 'With clinic', value: doctors.filter((d) => d.clinicName).length },
          { label: 'Specializations', value: new Set(doctors.map((d) => d.specialization).filter(Boolean)).size },
        ],
      };
    }
    const demo = staffDashboard ?? getDemoStaffDashboard(role.key);
    return { kpis: demo?.kpis ?? [{ label: 'Team members', value: allMembers.length }] };
  }, [role.key, analytics, technicians.length, labPartners.length, doctors, allMembers.length, staffDashboard]);

  const applyFilters = () => {
    setAppliedSearch(searchInput.trim().toLowerCase());
    setAppliedStatus(draftStatus);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchInput('');
    setDraftStatus('');
    setAppliedSearch('');
    setAppliedStatus('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{role.description}</p>

      <Tabs value={section} onValueChange={(v) => onSectionChange(v as StaffSectionTab)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          {STAFF_SECTION_TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{role.label} — global report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {dashboard.kpis.map((kpi) => (
                  <div key={kpi.label} className="rounded-md border px-3 py-3">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-semibold">{kpi.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {role.key === 'technician' && analytics && (
            <SampleAnalyticsPanel analytics={analytics} title={`Technician global analytics (${period})`} />
          )}
          {role.key === 'lab_partner' && analytics && (
            <SampleAnalyticsPanel analytics={analytics} title={`Lab network global analytics (${period})`} />
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" asChild>
              <Link to={`${staffRolePath(role.key)}/onboard`}>
                <FiUserPlus className="h-4 w-4" />
                Add user
              </Link>
            </Button>
          </div>
          <ListToolbar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={`Search ${role.label.toLowerCase()}…`}
            onApplyFilters={applyFilters}
            onResetFilters={resetFilters}
          >
            <FilterField label="Status" htmlFor={`staff-status-${role.key}`}>
              <select
                id={`staff-status-${role.key}`}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="inactive">inactive</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FilterField>
          </ListToolbar>

          <DataTable
            columns={columns}
            data={paged.items}
            emptyMessage={`No ${role.label.toLowerCase()} found. Adjust filters or run seed data.`}
            getRowKey={(row) => row.id}
            onRowClick={(row) => navigate(staffMemberDetailPath(role.key, row.id))}
          />

          <PaginationControls
            page={paged.page}
            pageSize={pageSize}
            total={paged.total}
            totalPages={paged.totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
