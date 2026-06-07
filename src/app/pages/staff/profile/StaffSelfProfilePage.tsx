import { Navigate } from 'react-router-dom';

/** Legacy route — profile lives under Settings → My profile tab. */
export function StaffSelfProfilePage() {
  return <Navigate to="/settings?tab=my-profile" replace />;
}
