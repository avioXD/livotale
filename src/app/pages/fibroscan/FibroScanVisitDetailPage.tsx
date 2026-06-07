import { Navigate, useParams } from 'react-router-dom';
import { useUserRole } from '@/store';
import { AppRole } from '@/types';

/** Technicians use unified detail at /technician/schedule/:id */
export function FibroScanVisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useUserRole();

  if (role === AppRole.TECHNICIAN && id) {
    return <Navigate to={`/technician/schedule/${id}`} replace />;
  }

  if (id) {
    return <Navigate to="/fibroscan" replace />;
  }

  return <Navigate to="/fibroscan" replace />;
}
