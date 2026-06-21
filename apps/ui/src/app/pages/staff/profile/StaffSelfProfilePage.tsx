import { Navigate } from 'react-router-dom';
import { orgPath } from '@/app/config/orgRoutes';

/** Legacy route — profile lives under Settings → My profile tab. */
export function StaffSelfProfilePage() {
  return <Navigate to={orgPath('/settings?tab=my-profile')} replace />;
}
