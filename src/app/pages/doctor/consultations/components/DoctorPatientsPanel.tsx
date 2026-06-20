import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { doctorConsultationService } from '@/services/liverCare';
import type { DoctorAssignedPatient } from '@/types/consultation';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import { orgPath } from '@/app/config/orgRoutes';

export function DoctorPatientsPanel() {
  const [patients, setPatients] = useState<DoctorAssignedPatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void doctorConsultationService.listAssignedPatients().then((rows) => {
      setPatients(rows);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Loading patients…</p>;
  }

  if (patients.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No patients assigned to you yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {patients.map((patient) => (
        <Card key={patient.patientId}>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium">{patient.patientName}</p>
              <p className="text-sm text-muted-foreground">{patient.patientPhone}</p>
              <p className="text-xs text-muted-foreground">
                {patient.orderCount} order{patient.orderCount === 1 ? '' : 's'} · Latest {patient.latestOrderNumber}
              </p>
              {patient.consultationScheduledAt && (
                <p className="text-xs text-muted-foreground">
                  Next consultation: {new Date(patient.consultationScheduledAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {ORDER_STATUS_LABELS[patient.latestOrderStatus as keyof typeof ORDER_STATUS_LABELS]
                  ?? patient.latestOrderStatus}
              </Badge>
              <Button size="sm" asChild>
                <Link to={orgPath(`/doctor/consultations/${patient.latestOrderId}`)}>Open consultation</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
