import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DoctorMedicalSummaryPanel } from '@/app/pages/doctor/consultations/components/DoctorMedicalSummaryPanel';
import { ConsultationVisitLogTimeline } from '@/app/pages/doctor/consultations/components/ConsultationVisitLogTimeline';
import type { Consultation, ConsultationVisitLog } from '@/types/consultation';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';

interface DoctorConsultationPatientTabProps {
  order: LiverCareOrder;
  consultation: Consultation | null;
  visitLogs: ConsultationVisitLog[];
}

export function DoctorConsultationPatientTab({
  order,
  consultation,
  visitLogs,
}: DoctorConsultationPatientTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Patient information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium">{order.patientName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium">{order.patientPhone}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Order</p>
            <p className="font-medium">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Package</p>
            <p className="font-medium">{order.packageName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Order status</p>
            <Badge variant="outline">{ORDER_STATUS_LABELS[order.orderStatus]}</Badge>
          </div>
          {consultation?.meetingLink && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Video link</p>
              <a href={consultation.meetingLink} target="_blank" rel="noreferrer" className="text-primary underline">
                {consultation.meetingLink}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Clinical data</h2>
        <DoctorMedicalSummaryPanel orderId={order.id} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Visit history log</h2>
        <ConsultationVisitLogTimeline visits={visitLogs} />
      </div>
    </div>
  );
}
