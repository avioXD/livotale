import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DoctorConsultationPatientTab } from '@/app/pages/doctor/consultations/components/DoctorConsultationPatientTab';
import { DoctorConsultationPrescriptionTab } from '@/app/pages/doctor/consultations/components/DoctorConsultationPrescriptionTab';
import { doctorConsultationService, liverCareOrderService } from '@/services/liverCare';
import type { Consultation, ConsultationVisitLog } from '@/types/consultation';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';

type DetailTab = 'patient' | 'prescription';

export function DoctorConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as DetailTab) || 'patient';

  const [order, setOrder] = useState<LiverCareOrder | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [visitLogs, setVisitLogs] = useState<ConsultationVisitLog[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const o = await liverCareOrderService.getById(id);
    setOrder(o);
    const c = (await doctorConsultationService.getConsultation(id))
      ?? (o ? await doctorConsultationService.ensureConsultation(id) : null);
    setConsultation(c);
    let logs = await doctorConsultationService.listVisitLogs(id);
    if (!logs.length && o) {
      logs = [await doctorConsultationService.ensureInitialVisitLog(id)];
    }
    setVisitLogs(logs);
    setSelectedVisitId((prev) => {
      if (prev && logs.some((v) => v.id === prev)) return prev;
      const active = [...logs].reverse().find((v) => v.status !== 'prescription_published') ?? logs[logs.length - 1];
      return active?.id ?? null;
    });
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

  if (!order) {
    return <p className="text-muted-foreground">Consultation not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title={order.patientName}
          description={`${order.orderNumber} · ${order.packageName}`}
        />
        <div className="flex items-center gap-2">
          <Badge variant="outline">{ORDER_STATUS_LABELS[order.orderStatus]}</Badge>
          <Button variant="outline" asChild>
            <Link to="/doctor/consultations">Back to list</Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="patient">Patient information</TabsTrigger>
          <TabsTrigger value="prescription">Prescription & follow-up</TabsTrigger>
        </TabsList>

        <TabsContent value="patient" className="pt-4">
          <DoctorConsultationPatientTab
            order={order}
            consultation={consultation}
            visitLogs={visitLogs}
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
