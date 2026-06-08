import { KpiCard, KpiGrid, kpiAccentAt } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StaffLabPartnerProfile, StaffTechnicianProfile } from '@/types/sampleCollection';
import type { StaffMemberRow, StaffRoleKey } from '@/types/staffHub';

interface StaffMemberPerformancePanelProps {
  roleKey: StaffRoleKey;
  member: StaffMemberRow;
  technician?: StaffTechnicianProfile;
  labPartner?: StaffLabPartnerProfile;
}

export function StaffMemberPerformancePanel({
  roleKey,
  member,
  technician,
  labPartner,
}: StaffMemberPerformancePanelProps) {
  const extraRows =
    roleKey === 'technician' && technician
      ? [
          { label: 'Technician type', value: technician.technicianType ?? '—' },
          { label: 'Service zone', value: technician.serviceZone ?? '—' },
          { label: 'Max appointments/day', value: technician.maxAppointmentsPerDay ?? '—' },
          { label: 'Rating', value: technician.rating ?? '—' },
        ]
      : roleKey === 'lab_partner' && labPartner
        ? [
            { label: 'Registration', value: labPartner.registrationNumber ?? '—' },
            { label: 'Contact', value: labPartner.contactName ?? '—' },
          ]
        : [];

  const allMetrics = [...member.metrics, ...extraRows.map((r) => ({ label: r.label, value: r.value }))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Performance — {member.fullName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{member.subtitle}</p>
        <KpiGrid cols="three">
          {allMetrics.map((m, i) => (
            <KpiCard key={m.label} label={m.label} value={m.value} accent={kpiAccentAt(i)} />
          ))}
        </KpiGrid>
        {roleKey === 'technician' && (
          <p className="text-xs text-muted-foreground">
            Sample collection counts reflect field work handed to lab and completed patient reports.
          </p>
        )}
        {roleKey === 'lab_partner' && (
          <p className="text-xs text-muted-foreground">
            Lab metrics cover samples received, reports uploaded, and reports published to patients.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
