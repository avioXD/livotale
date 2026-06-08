import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { aiExtractionOrderService, liverCareOrderService } from '@/services/liverCare';
import type { AIExtractionJob } from '@/types/aiExtraction';
import type { LiverCareOrder } from '@/types/serviceOrder';

export function AdminOperationsAIReviewTab() {
  const [jobs, setJobs] = useState<AIExtractionJob[]>([]);
  const [orders, setOrders] = useState<Record<string, LiverCareOrder>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const pending = await aiExtractionOrderService.listPendingReview();
      setJobs(pending);
      const orderMap: Record<string, LiverCareOrder> = {};
      await Promise.all(
        pending.map(async (j) => {
          const o = await liverCareOrderService.getById(j.orderId);
          if (o) orderMap[j.orderId] = o;
        }),
      );
      setOrders(orderMap);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading AI review queue…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pathology reports with AI extraction pending verification. Open an order to review and confirm extracted values.
      </p>

      {jobs.length === 0 && (
        <p className="text-sm text-muted-foreground">No extractions pending review.</p>
      )}

      <div className="space-y-3">
        {jobs.map((job) => {
          const order = orders[job.orderId];
          return (
            <div
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{order?.orderNumber ?? job.orderId}</p>
                <p className="text-sm text-muted-foreground">
                  {order?.patientName} · {job.fields.length} fields
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="capitalize">{job.status.replace(/_/g, ' ')}</Badge>
                <Button size="sm" asChild>
                  <Link to={`/admin/orders/${job.orderId}`}>Review</Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
