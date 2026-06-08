import { Navigate, useParams } from 'react-router-dom';

export function RedirectLegacyLabPartnerList() {
  return <Navigate to="/admin/staff/lab-partners" replace />;
}

export function RedirectLegacyLabPartnerDetail() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/admin/staff/lab-partners" replace />;
  return <Navigate to={`/admin/staff/lab-partners/${id}`} replace />;
}
