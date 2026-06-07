import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader } from '@/components/common/PageHeader';
import { StaffMemberDashboardPanel } from '@/app/pages/admin/staff/components/StaffMemberDashboardPanel';
import { StaffMemberDetailPanel } from '@/app/pages/admin/staff/components/StaffMemberDetailPanel';
import { StaffMemberPerformancePanel } from '@/app/pages/admin/staff/components/StaffMemberPerformancePanel';
import { STAFF_ROLE_CONFIGS, staffRoleFromSlug, staffRolePath } from '@/app/pages/admin/staff/staffHubConfig';
import { listStaffMembersForRole, mapDoctorsToRows, mapLabPartnersToRows, mapTechniciansToRows } from '@/app/pages/admin/staff/staffMemberUtils';
import type { StaffMemberRow } from '@/types/staffHub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminAppointmentsService } from '@/services/appointments';
import { opsAnalyticsService } from '@/services/opsAnalytics';
import { staffDirectoryService } from '@/services/staff/StaffDirectoryService';
import type { SampleCollectionAnalytics, StaffLabPartnerProfile, StaffTechnicianProfile } from '@/types/sampleCollection';
import type { DoctorOption } from '@/types/appointments';

type DetailTab = 'dashboard' | 'profile' | 'performance';

export function AdminStaffMemberDetailPage() {
  const { roleSlug, memberId } = useParams<{ roleSlug: string; memberId: string }>();
  const [searchParams] = useSearchParams();
  const roleKey = staffRoleFromSlug(roleSlug);
  const roleConfig = STAFF_ROLE_CONFIGS.find((r) => r.key === roleKey)!;
  const defaultTab = (searchParams.get('tab') as DetailTab | null) ?? 'dashboard';

  const [technicians, setTechnicians] = useState<StaffTechnicianProfile[]>([]);
  const [labPartners, setLabPartners] = useState<StaffLabPartnerProfile[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberRow[]>([]);
  const [analytics, setAnalytics] = useState<SampleCollectionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [t, l, d, a, staffRows] = await Promise.all([
        opsAnalyticsService.listTechnicians(),
        opsAnalyticsService.listLabPartners(),
        adminAppointmentsService.listDoctors(),
        opsAnalyticsService.getAdminSampleAnalytics('monthly'),
        staffDirectoryService.listUsers(roleKey),
      ]);
      setTechnicians(t);
      setLabPartners(l);
      setDoctors(d);
      setAnalytics(a);
      setStaffMembers(staffRows);
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
    if (!memberId) return null;
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
  }, [memberId, roleKey, technicians, labPartners, doctors, staffMembers, roleConfig.label]);

  const selectedTechnician = technicians.find((t) => t.id === memberId);
  const selectedLab = labPartners.find((l) => l.id === memberId);
  const selectedDoctor = doctors.find((d) => d.id === memberId);

  if (!memberId || !roleSlug) return null;

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
          <Card className="border-livotel-pink/30 bg-gradient-to-r from-livotel-pink/5 to-transparent">
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

          <Tabs defaultValue={defaultTab} key={defaultTab}>
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="profile">Profile & updates</TabsTrigger>
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

            <TabsContent value="performance" className="mt-4 space-y-4">
              <StaffMemberPerformancePanel
                roleKey={roleKey}
                member={member}
                technician={selectedTechnician}
                labPartner={selectedLab}
              />
              {analytics && (roleKey === 'technician' || roleKey === 'lab_partner') && (
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
