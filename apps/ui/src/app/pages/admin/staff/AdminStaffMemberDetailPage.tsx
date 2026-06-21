import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { StaffMemberDashboardPanel } from '@/app/pages/admin/staff/components/StaffMemberDashboardPanel';
import { StaffMemberDetailPanel } from '@/app/pages/admin/staff/components/StaffMemberDetailPanel';
import { StaffArchivePanel } from '@/app/pages/admin/staff/components/StaffArchivePanel';
import { StaffDoctorSchedulePanel } from '@/app/pages/admin/staff/components/StaffDoctorSchedulePanel';
import { StaffMemberPerformancePanel } from '@/app/pages/admin/staff/components/StaffMemberPerformancePanel';
import { BankDetailsAdminPanel } from '@/app/pages/bank/components/BankDetailsAdminPanel';
import { isOpsRole, isSuperAdmin } from '@/app/config/productRoles';
import { STAFF_ROLE_CONFIGS, staffRoleFromSlug, staffRolePath } from '@/app/pages/admin/staff/staffHubConfig';
import { listStaffMembersForRole, mapDoctorsToRows, mapLabPartnersToRows, mapTechniciansToRows } from '@/app/pages/admin/staff/staffMemberUtils';
import { orgPath } from '@/app/config/orgRoutes';
import type { StaffMemberRow } from '@/types/staffHub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import { useUserRole } from '@/store';
import { adminAppointmentsService } from '@/services/appointments';
import { opsAnalyticsService } from '@/services/opsAnalytics';
import { staffDirectoryService } from '@/services/staff/StaffDirectoryService';
import type { SampleCollectionAnalytics, StaffLabPartnerProfile, StaffTechnicianProfile } from '@/types/sampleCollection';
import type { DoctorOption } from '@/types/appointments';

const BASE_DETAIL_TABS = ['dashboard', 'profile', 'bank', 'performance'] as const;
const DOCTOR_DETAIL_TABS = [...BASE_DETAIL_TABS, 'schedule'] as const;

export function AdminStaffMemberDetailPage() {
  const userRole = useUserRole();
  const { roleSlug, memberId } = useParams<{ roleSlug: string; memberId: string }>();
  const roleKey = staffRoleFromSlug(roleSlug);
  const roleConfig = roleKey ? STAFF_ROLE_CONFIGS.find((r) => r.key === roleKey) : undefined;
  const detailTabs = roleKey === 'doctor' ? DOCTOR_DETAIL_TABS : BASE_DETAIL_TABS;
  const [activeTab, setActiveTab] = useUrlTabState({
    defaultValue: 'dashboard',
    validValues: detailTabs,
    omitDefault: true,
  });

  const [technicians, setTechnicians] = useState<StaffTechnicianProfile[]>([]);
  const [labPartners, setLabPartners] = useState<StaffLabPartnerProfile[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberRow[]>([]);
  const [analytics, setAnalytics] = useState<SampleCollectionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!roleKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const staffRows = await staffDirectoryService.listUsers(roleKey);
      setStaffMembers(staffRows);

      const secondary = await Promise.allSettled([
        roleKey === 'technician' ? opsAnalyticsService.listTechnicians() : Promise.resolve([]),
        roleKey === 'lab_partner' ? opsAnalyticsService.listLabPartners() : Promise.resolve([]),
        roleKey === 'doctor' ? adminAppointmentsService.listDoctors() : Promise.resolve([]),
        roleKey === 'technician'
          ? opsAnalyticsService.getAdminSampleAnalytics('monthly')
          : Promise.resolve(null),
      ]);

      const [techResult, labResult, doctorResult, analyticsResult] = secondary;

      if (techResult.status === 'fulfilled') {
        setTechnicians(techResult.value);
      }
      if (labResult.status === 'fulfilled') {
        setLabPartners(labResult.value);
      }
      if (doctorResult.status === 'fulfilled') {
        setDoctors(doctorResult.value);
      } else if (roleKey === 'doctor') {
        setDoctors([]);
      }
      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(analyticsResult.value);
      }

      const doctorLoadFailed = roleKey === 'doctor' && doctorResult.status === 'rejected';
      if (doctorLoadFailed) {
        setError(
          doctorResult.reason instanceof Error
            ? doctorResult.reason.message
            : 'Doctor roster unavailable — schedule tab may still work. Run pending DB migrations.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff member');
    } finally {
      setIsLoading(false);
    }
  }, [roleKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const member = useMemo((): StaffMemberRow | null => {
    if (!memberId || !roleKey || !roleConfig) return null;
    const rows = listStaffMembersForRole(roleKey, {
      technicians,
      labPartners,
      doctors,
      directoryRows: staffMembers,
    });
    const found = rows.find((r) => r.id === memberId);
    if (found) return found;

    if (roleKey === 'technician') {
      const t = technicians.find((x) => x.id === memberId);
      if (t) return mapTechniciansToRows([t])[0];
    }
    if (roleKey === 'lab_partner') {
      const l = labPartners.find((x) => x.id === memberId);
      if (l) return mapLabPartnersToRows([l])[0];
    }
    if (roleKey === 'doctor') {
      const d = doctors.find((x) => x.id === memberId);
      if (d) return mapDoctorsToRows([d])[0];
    }

    return {
      id: memberId,
      fullName: `${roleConfig.label} member`,
      subtitle: memberId,
      status: 'active',
      metrics: [],
    };
  }, [memberId, roleKey, roleConfig, technicians, labPartners, doctors, staffMembers]);

  if (!roleKey || !roleConfig) {
    return <Navigate to={orgPath('/admin/staff/technicians')} replace />;
  }

  const selectedTechnician = technicians.find((t) => t.id === memberId);
  const selectedLab = labPartners.find((l) => l.id === memberId);
  const selectedDoctor = doctors.find((d) => d.id === memberId);

  if (!memberId || !roleSlug) return null;

  if (roleKey === 'lab_partner') {
    return <Navigate to={orgPath(`/admin/staff/lab-partners/${memberId}`)} replace />;
  }

  const canVerifyBankDetails = isSuperAdmin(userRole);
  const maskedBankDetails = isOpsRole(userRole) && !isSuperAdmin(userRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`${staffRolePath(roleKey)}?section=users`} aria-label={`Back to ${roleConfig.label}`}>
            <FiArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <PageHeader
          title={member?.fullName ?? `${roleConfig.label} profile`}
          description={member?.subtitle ?? 'Staff record'}
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading staff record…</p>
      )}

      {!isLoading && member && (
        <>
          <Card className="border-livotale-pink/30 bg-gradient-to-r from-livotale-pink/5 to-transparent">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-lg">Staff summary</CardTitle>
                <Badge variant="outline" className="capitalize">{member.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              {member.metrics.map((m) => (
                <div key={m.label}>
                  <span className="text-muted-foreground">{m.label}</span>
                  <p className="font-medium">{m.value}</p>
                </div>
              ))}
              {(member.email || member.mobile) && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Contact</span>
                  <p className="font-medium">{[member.email, member.mobile].filter(Boolean).join(' · ')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <StaffArchivePanel roleKey={roleKey} member={member} onArchived={() => void load()} />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="profile">Profile & updates</TabsTrigger>
              <TabsTrigger value="bank">Bank details</TabsTrigger>
              {roleKey === 'doctor' && <TabsTrigger value="schedule">Schedule</TabsTrigger>}
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-4">
              <StaffMemberDashboardPanel roleKey={roleKey} member={member} />
            </TabsContent>

            <TabsContent value="profile" className="mt-4">
              <StaffMemberDetailPanel
                roleKey={roleKey}
                member={member}
                labPartner={selectedLab}
                doctor={selectedDoctor}
                onSaved={() => void load()}
              />
            </TabsContent>

            <TabsContent value="bank" className="mt-4">
              {member.userId ? (
                <BankDetailsAdminPanel
                  userId={member.userId}
                  canVerify={canVerifyBankDetails}
                  masked={maskedBankDetails}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No linked user account for this staff member — bank details cannot be loaded.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {roleKey === 'doctor' && (
              <TabsContent value="schedule" className="mt-4">
                <StaffDoctorSchedulePanel doctorId={member.id} doctorName={member.fullName} />
              </TabsContent>
            )}

            <TabsContent value="performance" className="mt-4 space-y-4">
              <StaffMemberPerformancePanel
                roleKey={roleKey}
                member={member}
                technician={selectedTechnician}
                labPartner={selectedLab}
              />
              {analytics && roleKey === 'technician' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Team benchmark</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {analytics.byStatus.slice(0, 8).map((row) => (
                      <Badge key={row.status} variant="secondary" className="capitalize">
                        {row.status.replace(/_/g, ' ')}: {row.total}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
