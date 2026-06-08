import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { useUserRole } from '@/store';
import { AppRole } from '@/types';

/** Technicians use merged Sample collection at /technician/schedule */
export function LiverFibrosisScanPage() {
  const role = useUserRole();

  if (role === AppRole.TECHNICIAN) {
    return <Navigate to="/technician/schedule?tab=clinical" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liver Fibrosis Scan & clinical workflow"
        description="Technicians manage field work from Sample collection. Doctors and admins can review Liver Fibrosis Scan results on patient profiles and order detail."
      />
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Field clinical capture is handled by technicians on the Sample collection page.
          Use patient profiles or liver care order detail to review scan results.
        </CardContent>
      </Card>
    </div>
  );
}
