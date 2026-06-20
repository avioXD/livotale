import { Navigate, useSearchParams } from 'react-router-dom';
import { staffRoleFromSlug, STAFF_ROLE_SLUGS } from '@/app/pages/admin/staff/staffHubConfig';
import { orgPath } from '@/app/config/orgRoutes';
import type { StaffRoleKey } from '@/types/staffHub';

/** @deprecated Use /org/admin/staff/:role — kept for bookmarks */
export function AdminStaffPerformancePage() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role') as StaffRoleKey | null;
  const role = staffRoleFromSlug(roleParam ? STAFF_ROLE_SLUGS[roleParam] : undefined);
  if (!role) {
    return <Navigate to={orgPath('/admin/staff/technicians')} replace />;
  }
  let section = searchParams.get('section');
  const member = searchParams.get('member');
  if (section === 'directory' || section === 'profiles' || section === 'performance') section = 'users';
  if (member) {
    const tab = section === 'performance' ? '?tab=performance' : '';
    return <Navigate to={orgPath(`/admin/staff/${STAFF_ROLE_SLUGS[role]}/${member}${tab}`)} replace />;
  }
  const query = new URLSearchParams();
  if (section) query.set('section', section);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return <Navigate to={orgPath(`/admin/staff/${STAFF_ROLE_SLUGS[role]}${suffix}`)} replace />;
}
