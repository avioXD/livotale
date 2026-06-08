import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doctorConsultationService } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';

function KpiCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const content = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href} className="block transition-opacity hover:opacity-90">{content}</Link> : content;
}

export function DoctorLiverCareDashboardPanel() {
  const [orders, setOrders] = useState<LiverCareOrder[]>([]);

  useEffect(() => {
    void doctorConsultationService.listAssignedOrders().then(setOrders);
  }, []);

  const awaitingConsult = orders.filter((o) =>
    ['doctor_assigned', 'consultation_pending'].includes(o.orderStatus),
  ).length;
  const rxPending = orders.filter((o) => o.orderStatus === 'prescription_pending').length;
  const reportReady = orders.filter((o) =>
    ['final_report_generated', 'doctor_assignment_pending', 'doctor_assigned'].includes(o.orderStatus),
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Assigned liver care orders" value={orders.length} href="/doctor/consultations" />
        <KpiCard label="Reports ready for review" value={reportReady} href="/doctor/consultations" />
        <KpiCard label="Consultations pending" value={awaitingConsult} href="/doctor/consultations" />
        <KpiCard label="Prescriptions to publish" value={rxPending} href="/doctor/consultations" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Consultation queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {orders.length === 0 ? (
            <p className="text-muted-foreground">No assigned consultations.</p>
          ) : (
            orders.slice(0, 6).map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
                <div>
                  <p className="font-medium">{o.patientName}</p>
                  <p className="text-xs text-muted-foreground">{o.packageName}</p>
                </div>
                <Badge variant="outline">{ORDER_STATUS_LABELS[o.orderStatus]}</Badge>
                <Link to={`/doctor/consultations/${o.id}`} className="text-primary underline">Open</Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
