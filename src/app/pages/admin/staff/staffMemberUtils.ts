import type { StaffLabPartnerProfile, StaffTechnicianProfile } from '@/types/sampleCollection';
import type { DoctorOption } from '@/types/appointments';
import type { StaffMemberRow, StaffRoleKey } from '@/types/staffHub';
import { staffRolePath } from '@/app/pages/admin/staff/staffHubConfig';
import { orgPath } from '@/app/config/orgRoutes';

export function findLabPartnerStaffMember(
  labPartnerId: string,
  directoryRows: StaffMemberRow[],
  fallback?: { email?: string | null },
): StaffMemberRow | null {
  return (
    directoryRows.find((row) => row.id === labPartnerId) ??
    directoryRows.find((row) => row.profilePath?.includes(`/lab-partners/${labPartnerId}`)) ??
    (fallback?.email
      ? directoryRows.find((row) => row.email && row.email === fallback.email)
      : null) ??
    null
  );
}

export function staffMemberDetailPath(roleKey: StaffRoleKey, memberId: string): string {
  return `${staffRolePath(roleKey)}/${memberId}`;
}

export function mapTechniciansToRows(rows: StaffTechnicianProfile[]): StaffMemberRow[] {
  return rows.map((t) => ({
    id: t.id,
    userId: t.userId,
    badgeId: t.badgeId,
    fullName: t.fullName,
    subtitle: `${t.employeeCode} · ${t.technicianType ?? 'technician'}`,
    status: t.status,
    email: t.email,
    mobile: t.mobile,
    city: t.serviceZone,
    metrics: [
      { label: 'Collected', value: t.samplesCollected },
      { label: 'Handed over', value: t.samplesHandedOver },
      { label: 'Completed', value: t.samplesCompleted },
    ],
  }));
}

export function mapLabPartnersToRows(rows: StaffLabPartnerProfile[]): StaffMemberRow[] {
  return rows.map((l) => ({
    id: l.id,
    userId: l.contactUserId ?? undefined,
    fullName: l.name,
    subtitle: `${l.contactName ?? 'Contact'} · ${l.registrationNumber ?? '—'}`,
    status: l.status,
    email: l.email,
    mobile: l.mobile,
    profilePath: orgPath(`/admin/staff/lab-partners/${l.id}`),
    metrics: [
      { label: 'Received', value: l.samplesReceived },
      { label: 'Reports', value: l.reportsUploaded },
      { label: 'Published', value: l.reportsPublished },
    ],
  }));
}

export function mapDoctorsToRows(rows: DoctorOption[]): StaffMemberRow[] {
  return rows.map((d) => ({
    id: d.id,
    userId: d.userId,
    fullName: d.fullName,
    subtitle: [d.specialization, d.clinicName].filter(Boolean).join(' · ') || 'Doctor',
    status: d.status ?? 'inactive',
    metrics: [
      { label: 'Registration', value: d.registrationNumber ?? '—' },
      { label: 'Languages', value: d.languagesKnown?.length ? d.languagesKnown.join(', ') : '—' },
      { label: 'Clinic', value: d.clinicName ?? '—' },
    ],
  }));
}

function mergeDoctorRows(clinicalRows: StaffMemberRow[], directoryRows: StaffMemberRow[]): StaffMemberRow[] {
  if (directoryRows.length === 0) return clinicalRows;

  const dirById = new Map(directoryRows.map((row) => [row.id, row]));
  const dirByUserId = new Map(
    directoryRows.filter((row) => row.userId).map((row) => [row.userId as string, row]),
  );

  const merged = clinicalRows.map((clinical) => {
    const directory =
      dirById.get(clinical.id) ?? (clinical.userId ? dirByUserId.get(clinical.userId) : undefined);
    if (!directory) return clinical;

    return {
      ...clinical,
      userId: directory.userId ?? clinical.userId,
      badgeId: directory.badgeId ?? clinical.badgeId,
      fullName: directory.fullName || clinical.fullName,
      email: directory.email ?? clinical.email,
      mobile: directory.mobile ?? clinical.mobile,
      status: directory.status || clinical.status,
      archivedAt: directory.archivedAt,
      archivedBy: directory.archivedBy,
      subtitle: clinical.subtitle || directory.subtitle,
      metrics: clinical.metrics,
    };
  });

  const seenIds = new Set(merged.map((row) => row.id));
  const seenUserIds = new Set(merged.map((row) => row.userId).filter(Boolean));

  for (const directory of directoryRows) {
    if (seenIds.has(directory.id)) continue;
    if (directory.userId && seenUserIds.has(directory.userId)) continue;
    merged.push(directory);
    seenIds.add(directory.id);
    if (directory.userId) seenUserIds.add(directory.userId);
  }

  return merged;
}

export function listStaffMembersForRole(
  roleKey: StaffRoleKey,
  data: {
    technicians: StaffTechnicianProfile[];
    labPartners: StaffLabPartnerProfile[];
    doctors: DoctorOption[];
    directoryRows?: StaffMemberRow[];
  },
): StaffMemberRow[] {
  const directory = data.directoryRows ?? [];

  if (roleKey === 'technician') {
    const rows = mapTechniciansToRows(data.technicians);
    if (directory.length === 0) return rows;
    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const entry of directory) {
      if (byId.has(entry.id)) continue;
      const duplicateUser = entry.userId
        ? [...byId.values()].some((row) => row.userId === entry.userId || row.id === entry.userId)
        : false;
      if (!duplicateUser) byId.set(entry.id, entry);
    }
    return [...byId.values()];
  }

  if (roleKey === 'lab_partner') {
    const rows = mapLabPartnersToRows(data.labPartners);
    if (directory.length === 0) return rows;
    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const entry of directory) {
      if (byId.has(entry.id)) continue;
      const duplicateUser = entry.userId
        ? [...byId.values()].some((row) => row.userId === entry.userId || row.id === entry.userId)
        : false;
      if (!duplicateUser) byId.set(entry.id, entry);
    }
    return [...byId.values()];
  }

  if (roleKey === 'doctor') {
    return mergeDoctorRows(mapDoctorsToRows(data.doctors), directory);
  }

  return directory;
}
