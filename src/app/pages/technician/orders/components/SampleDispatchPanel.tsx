import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pathologyService } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { SampleDispatch } from '@/types/sampleDispatch';
import { SAMPLE_DISPATCH_LABELS } from '@/types/sampleDispatch';

interface SampleDispatchPanelProps {
  order: LiverCareOrder;
  pathologyRequired: boolean;
  onUpdated: () => void;
}

export function SampleDispatchPanel({ order, pathologyRequired, onUpdated }: SampleDispatchPanelProps) {
  const [dispatch, setDispatch] = useState<SampleDispatch | null>(null);
  const [courierRef, setCourierRef] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!pathologyRequired) return;
    void pathologyService.getSampleDispatch(order.id).then(setDispatch);
  }, [order.id, pathologyRequired]);

  if (!pathologyRequired || !order.partnerLabId) return null;

  const handleDispatch = async () => {
    setActing(true);
    try {
      const d = await pathologyService.dispatchSample(order.id, 'technician', courierRef || undefined);
      setDispatch(d);
      onUpdated();
    } finally {
      setActing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Blood sample → partner lab</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          After scan, send blood sample to <strong>{order.partnerLabName}</strong>. Lab will email report to operations — not processed in-house.
        </p>
        {dispatch && (
          <Badge variant="outline">{SAMPLE_DISPATCH_LABELS[dispatch.status]}</Badge>
        )}
        {dispatch?.status === 'pending_dispatch' && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label>Courier ref (optional)</Label>
              <Input className="max-w-xs" value={courierRef} onChange={(e) => setCourierRef(e.target.value)} />
            </div>
            <Button size="sm" disabled={acting} onClick={() => void handleDispatch()}>
              Blood sample submitted to lab
            </Button>
          </div>
        )}
        {dispatch && dispatch.status !== 'pending_dispatch' && (
          <p className="text-green-700">Sample handoff recorded {dispatch.dispatchedAt ? new Date(dispatch.dispatchedAt).toLocaleString() : ''}.</p>
        )}
      </CardContent>
    </Card>
  );
}
