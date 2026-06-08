import { Navigate, useParams } from 'react-router-dom';
import { useUserRole } from '@/store';
import { AppRole } from '@/types';

/** Technicians use unified detail at /technician/schedule/:id */
export function Liver Fibrosis ScanVisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useUserRole();

  if (role === AppRole.TECHNICIAN && id) {
    return <Navigate to={`/technician/schedule/${id}`} replace />;
  }

  if (id) {
    return <Navigate to="/Liver Fibrosis Scan" replace />;
  }

  return <Navigate to="/Liver Fibrosis Scan" replace />;
}
