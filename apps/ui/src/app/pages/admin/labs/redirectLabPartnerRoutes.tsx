import { Navigate, useParams } from 'react-router-dom';
import { orgPath } from '@/app/config/orgRoutes';

export function RedirectLegacyLabPartnerList() {
  return <Navigate to={orgPath('/admin/staff/lab-partners')} replace />;
}

export function RedirectLegacyLabPartnerDetail() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to={orgPath('/admin/staff/lab-partners')} replace />;
  return <Navigate to={orgPath(`/admin/staff/lab-partners/${id}`)} replace />;
}
