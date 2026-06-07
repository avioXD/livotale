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
      : ['Metric 1', 'Metric 2', 'Metric 3'];

  return [
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
      render: (row) => <Badge variant="outline" className="capitalize">{row.status}</Badge>,
    },
    ...metricHeaders.map((label, index) => ({
      key: `metric-${index}`,
      header: label,
      render: (row: StaffMemberRow) => row.metrics[index]?.value ?? '—',
    })),
  ];
}
