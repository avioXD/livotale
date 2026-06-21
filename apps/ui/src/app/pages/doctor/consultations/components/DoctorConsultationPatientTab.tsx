import { useState } from 'react';
import { Video } from 'lucide-react';
import { StatusBadge } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DoctorMedicalSummaryPanel } from '@/app/pages/doctor/consultations/components/DoctorMedicalSummaryPanel';
import { ConsultationVisitLogTimeline } from '@/app/pages/doctor/consultations/components/ConsultationVisitLogTimeline';
import { doctorConsultationService } from '@/services/liverCare';
import type { Consultation, ConsultationVisitLog } from '@/types/consultation';
import type { AIExtractionJob } from '@/types/aiExtraction';
import type { FibrosisScanRecord } from '@/types/fibrosisScan';
import type { FinalReport } from '@/types/finalReport';
import type { LabReportUpload } from '@/types/labReport';
import type { LiverHealthReport } from '@/types/liverHealthReport';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';

interface DoctorConsultationPatientTabProps {
  order: LiverCareOrder;
  consultation: Consultation | null;
  visitLogs: ConsultationVisitLog[];
  scan: FibrosisScanRecord | null;
  labReport: LabReportUpload | null;
  aiJob: AIExtractionJob | null;
  finalReport: FinalReport | null;
  liverHealthReport: LiverHealthReport | null;
  onRefresh: () => Promise<void>;
}

export function DoctorConsultationPatientTab({
  order,
  consultation,
  visitLogs,
  scan,
  labReport,
  aiJob,
  finalReport,
  liverHealthReport,
  onRefresh,
}: DoctorConsultationPatientTabProps) {
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canStart = consultation?.status === 'consultation_scheduled';
  const meetingLink = consultation?.meetingLink;
  const waitingForOps =
    consultation && !consultation.scheduledAt && ['doctor_assigned', 'consultation_scheduled'].includes(consultation.status);

  const runAction = async (fn: () => Promise<void>) => {
    setActing(true);
    setActionError(null);
    try {
      await fn();
      await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {(waitingForOps || canStart || meetingLink || consultation?.scheduledAt) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Consultation actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {waitingForOps && (
              <p className="text-sm text-muted-foreground">
                Waiting for operations to schedule your video consultation. You cannot pick a time slot.
              </p>
            )}

            {consultation?.scheduledAt && (
              <p className="text-sm">
                <span className="text-muted-foreground">Scheduled: </span>
                {new Date(consultation.scheduledAt).toLocaleString()}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {canStart && (
                <Button
                  type="button"
                  disabled={acting}
                  onClick={() => void runAction(async () => {
                    await doctorConsultationService.start(order.id);
                  })}
                >
                  Start consultation
                </Button>
              )}
              {meetingLink && (
                <Button type="button" variant="outline" asChild>
                  <a href={meetingLink} target="_blank" rel="noreferrer">
                    <Video className="mr-2 h-4 w-4" />
                    Join video call
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
            <StatusBadge
              status={order.orderStatus}
              domain="order"
              label={ORDER_STATUS_LABELS[order.orderStatus]}
            />
          </div>
          {consultation?.scheduledAt && (
            <div>
              <p className="text-muted-foreground">Scheduled</p>
              <p className="font-medium">{new Date(consultation.scheduledAt).toLocaleString()}</p>
            </div>
          )}
          {consultation && (
            <div>
              <p className="text-muted-foreground">Consultation status</p>
              <StatusBadge status={consultation.status} />
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Clinical data</h2>
        <DoctorMedicalSummaryPanel
          scan={scan}
          labReport={labReport}
          aiJob={aiJob}
          finalReport={finalReport}
          liverHealthReport={liverHealthReport}
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Visit history log</h2>
        <ConsultationVisitLogTimeline visits={visitLogs} />
      </div>
    </div>
  );
}
