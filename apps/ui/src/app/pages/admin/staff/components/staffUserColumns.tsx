import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { staffMemberDetailPath } from '@/app/pages/admin/staff/staffMemberUtils';
import type { TableColumn } from '@/types';
import type { StaffMemberRow, StaffRoleKey } from '@/types/staffHub';

export function buildStaffUserColumns(roleKey: StaffRoleKey): TableColumn<StaffMemberRow>[] {
  const metricHeaders = roleKey === 'technician'
    ? ['Collected', 'Handed over', 'Completed']
    : roleKey === 'lab_partner'
      ? ['Received', 'Reports', 'Published']
      : roleKey === 'doctor'
        ? ['Registration', 'Qualification', 'Clinic']
        : roleKey === 'operations'
          ? ['Zones', 'Pincodes', 'Status']
          : ['Badge', 'Role', 'Status'];

  const scopeColumn: TableColumn<StaffMemberRow> | null =
    roleKey === 'operations' || roleKey === 'super_admin'
      ? {
          key: 'scope',
          header: 'City scope',
          render: (row) => (
            <span className="text-sm text-muted-foreground">
              {row.city ?? '—'}
              {row.isCityManagerPromoted ? ' · city manager' : ''}
              {row.pincodes && row.pincodes.length > 0 ? ` · ${row.pincodes.length} pincode(s)` : ''}
            </span>
          ),
        }
      : null;

  return [
    {
      key: 'badge',
      header: 'Badge ID',
      render: (row) => (
        <span className="font-mono text-xs font-semibold tracking-wide text-muted-foreground">
          {row.badgeId ?? row.metrics.find((m) => m.label === 'Badge')?.value ?? '—'}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <Link
          to={staffMemberDetailPath(roleKey, row.id)}
          className="font-medium text-primary hover:underline"
        >
          {row.fullName}
        </Link>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (row) => <span className="text-muted-foreground">{row.subtitle}</span>,
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {[row.email, row.mobile].filter(Boolean).join(' · ') || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge
          variant={row.status === 'archived' ? 'secondary' : 'outline'}
          className="capitalize"
        >
          {row.status}
        </Badge>
      ),
    },
    ...(scopeColumn ? [scopeColumn] : []),
    ...metricHeaders.map((label, index) => ({
      key: `metric-${index}`,
      header: label,
      render: (row: StaffMemberRow) => row.metrics[index]?.value ?? '—',
    })),
  ];
}
