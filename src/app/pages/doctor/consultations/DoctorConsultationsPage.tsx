import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { doctorConsultationService } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import { ORDER_STATUS_LABELS } from '@/types/serviceOrder';

type Filter = 'all' | 'scheduled' | 'pending_rx' | 'completed';

export function DoctorConsultationsPage() {
  const [orders, setOrders] = useState<LiverCareOrder[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void doctorConsultationService.listAssignedOrders().then((rows) => {
      setOrders(rows);
      setLoading(false);
    });
  }, []);

  const filtered = orders.filter((o) => {
    if (filter === 'scheduled') return o.orderStatus === 'consultation_pending' || o.orderStatus === 'doctor_assigned';
    if (filter === 'pending_rx') return o.orderStatus === 'prescription_pending';
    if (filter === 'completed') return o.orderStatus === 'prescription_generated' || o.orderStatus === 'completed';
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liver care consultations"
        description="PKG-3 orders assigned to you — review clinical data, conduct consultation, and publish prescriptions."
      />

      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'All'],
          ['scheduled', 'Scheduled'],
          ['pending_rx', 'Rx pending'],
          ['completed', 'Completed'],
        ] as const).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? 'default' : 'outline'}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading consultations…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No consultation orders in this view.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Card key={order.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{order.patientName}</p>
                  <p className="text-sm text-muted-foreground">{order.orderNumber} · {order.packageName}</p>
                  {order.consultationScheduledAt && (
                    <p className="text-xs text-muted-foreground">
                      Consultation: {new Date(order.consultationScheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{ORDER_STATUS_LABELS[order.orderStatus]}</Badge>
                  <Button size="sm" asChild>
                    <Link to={`/doctor/consultations/${order.id}`}>Open</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Demo: log in as <strong>doctor</strong> / <strong>Doctor@123</strong> — open order <strong>lco-3</strong> (Anita Desai, PKG-3).
      </p>
    </div>
  );
}
