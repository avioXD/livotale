import { Navigate, useParams } from 'react-router-dom';
import { useUserRole } from '@/store';
import { AppRole } from '@/types';
import { orgPath } from '@/app/config/orgRoutes';

/** Technicians use order detail at /org/technician/orders/:id */
export function LiverFibrosisScanVisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useUserRole();

  if (role === AppRole.TECHNICIAN) {
    return <Navigate to={id ? orgPath(`/technician/orders/${id}`) : orgPath('/technician/orders')} replace />;
  }

  if (id) {
    return <Navigate to="/liver-fibrosis-scan" replace />;
  }

  return <Navigate to="/liver-fibrosis-scan" replace />;
}
