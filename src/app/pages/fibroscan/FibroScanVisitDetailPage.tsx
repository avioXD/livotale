import { Navigate, useParams } from 'react-router-dom';
import { useUserRole } from '@/store';
import { AppRole } from '@/types';

/** Technicians use order detail at /technician/orders/:id */
export function LiverFibrosisScanVisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useUserRole();

  if (role === AppRole.TECHNICIAN) {
    return <Navigate to={id ? `/technician/orders/${id}` : '/technician/orders'} replace />;
  }

  if (id) {
    return <Navigate to="/liver-fibrosis-scan" replace />;
  }

  return <Navigate to="/liver-fibrosis-scan" replace />;
}
