import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { useUserRole } from '@/store';
import { AppRole } from '@/types';

/** Technicians manage field visits from /technician/orders */
export function LiverFibrosisScanPage() {
  const role = useUserRole();

  if (role === AppRole.TECHNICIAN) {
    return <Navigate to="/technician/orders" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liver Fibrosis Scan & clinical workflow"
        description="Technicians manage field work from Field orders. Doctors and admins review scan and sample data on order detail."
      />
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Field capture is handled by technicians on the order detail page.
          Use patient profiles or liver care order detail to review scan results.
        </CardContent>
      </Card>
    </div>
  );
}
