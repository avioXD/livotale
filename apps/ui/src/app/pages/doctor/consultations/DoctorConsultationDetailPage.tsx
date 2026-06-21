import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DoctorConsultationPatientTab } from '@/app/pages/doctor/consultations/components/DoctorConsultationPatientTab';
import { DoctorConsultationPrescriptionTab } from '@/app/pages/doctor/consultations/components/DoctorConsultationPrescriptionTab';
import { doctorConsultationService } from '@/services/liverCare';
import type { Consultation, ConsultationVisitLog } from '@/types/consultation';
import type { AIExtractionJob } from '@/types/aiExtraction';
import type { FibrosisScanRecord } from '@/types/fibrosisScan';
import type { FinalReport } from '@/types/finalReport';
import type { LabReportUpload } from '@/types/labReport';
import type { LiverHealthReport } from '@/types/liverHealthReport';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';
import { orgPath } from '@/app/config/orgRoutes';
import { useUrlTabState } from '@/hooks/useUrlTabState';

const CONSULTATION_TABS = ['patient', 'prescription'] as const;

export function DoctorConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useUrlTabState({
    defaultValue: 'patient',
    validValues: CONSULTATION_TABS,
    omitDefault: true,
  });

  const [order, setOrder] = useState<LiverCareOrder | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [visitLogs, setVisitLogs] = useState<ConsultationVisitLog[]>([]);
  const [scan, setScan] = useState<FibrosisScanRecord | null>(null);
  const [labReport, setLabReport] = useState<LabReportUpload | null>(null);
  const [aiJob, setAiJob] = useState<AIExtractionJob | null>(null);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [liverHealthReport, setLiverHealthReport] = useState<LiverHealthReport | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyContext = useCallback((ctx: Awaited<ReturnType<typeof doctorConsultationService.getContext>>) => {
    setOrder(ctx.order);
    setConsultation(ctx.consultation);
    setVisitLogs(ctx.visitLogs);
    setScan(ctx.scan);
    setLabReport(ctx.pathology);
    setAiJob(ctx.aiExtraction);
    setFinalReport(ctx.finalReport);
    setLiverHealthReport(ctx.liverHealthReport);
    setSelectedVisitId((prev) => {
      const logs = ctx.visitLogs;
      if (prev && logs.some((v) => v.id === prev)) return prev;
      const active = [...logs].reverse().find((v) => v.status !== 'prescription_published') ?? logs[logs.length - 1];
      return active?.id ?? null;
    });
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const ctx = await doctorConsultationService.getContext(id);
      applyContext(ctx);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load consultation');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id, applyContext]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading consultation…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error ?? 'Consultation not found.'}</p>
        <Button variant="outline" asChild>
          <Link to={orgPath('/doctor/consultations')}>Back to list</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title={order.patientName}
          description={`${order.orderNumber} · ${order.packageName}`}
        />
        <div className="flex items-center gap-2">
          <StatusBadge
            status={order.orderStatus}
            domain="order"
            label={ORDER_STATUS_LABELS[order.orderStatus]}
          />
          <Button variant="outline" asChild>
            <Link to={orgPath('/doctor/consultations')}>Back to list</Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="patient">Patient information</TabsTrigger>
          <TabsTrigger value="prescription">Prescription & follow-up</TabsTrigger>
        </TabsList>

        <TabsContent value="patient" className="pt-4">
          <DoctorConsultationPatientTab
            order={order}
            consultation={consultation}
            visitLogs={visitLogs}
            scan={scan}
            labReport={labReport}
            aiJob={aiJob}
            finalReport={finalReport}
            liverHealthReport={liverHealthReport}
            onRefresh={load}
          />
        </TabsContent>

        <TabsContent value="prescription" className="pt-4">
          {selectedVisitId ? (
            <DoctorConsultationPrescriptionTab
              order={order}
              visitLogs={visitLogs}
              selectedVisitId={selectedVisitId}
              onSelectVisit={setSelectedVisitId}
              onRefresh={load}
            />
          ) : (
            <p className="text-muted-foreground">Loading visit log…</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
