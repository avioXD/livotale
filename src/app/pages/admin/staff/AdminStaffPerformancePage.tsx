import { Navigate, useSearchParams } from 'react-router-dom';
import { staffRoleFromSlug, STAFF_ROLE_SLUGS } from '@/app/pages/admin/staff/staffHubConfig';
import type { StaffRoleKey } from '@/types/staffHub';

/** @deprecated Use /admin/staff/:role — kept for bookmarks */
export function AdminStaffPerformancePage() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role') as StaffRoleKey | null;
  const role = staffRoleFromSlug(roleParam ? STAFF_ROLE_SLUGS[roleParam] : undefined);
  if (!role) {
    return <Navigate to="/admin/staff/technicians" replace />;
  }
  let section = searchParams.get('section');
  const member = searchParams.get('member');
  if (section === 'directory' || section === 'profiles' || section === 'performance') section = 'users';
  if (member) {
    const tab = section === 'performance' ? '?tab=performance' : '';
    return <Navigate to={`/admin/staff/${STAFF_ROLE_SLUGS[role]}/${member}${tab}`} replace />;
  }
  const query = new URLSearchParams();
  if (section) query.set('section', section);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return <Navigate to={`/admin/staff/${STAFF_ROLE_SLUGS[role]}${suffix}`} replace />;
}
