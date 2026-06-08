import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { technicianOrderService } from '@/services/liverCare';
import type { FibrosisScanRecord } from '@/types/fibrosisScan';

interface LiverFibrosisScanCapturePanelProps {
  orderId: string;
  onUpdated?: () => void;
}

const emptyForm = () => ({
  liverStiffnessKpa: '',
  capDbm: '',
  iqr: '',
  iqrMedianPercent: '',
  validMeasurements: '',
  totalMeasurements: '',
  successRatePercent: '',
  probeType: 'M' as 'M' | 'XL',
  operatorName: 'Vinod K.',
  deviceSerial: 'FS-DEMO-001',
  fastingStatus: true,
  bmi: '',
  interpretation: '',
  steatosisGrade: 'S0',
  fibrosisStage: 'F0',
  remarks: '',
});

function recordToForm(r: FibrosisScanRecord) {
  return {
    liverStiffnessKpa: String(r.liverStiffnessKpa),
    capDbm: String(r.capDbm),
    iqr: String(r.iqr),
    iqrMedianPercent: String(r.iqrMedianPercent),
    validMeasurements: String(r.validMeasurements),
    totalMeasurements: String(r.totalMeasurements),
    successRatePercent: String(r.successRatePercent),
    probeType: r.probeType,
    operatorName: r.operatorName,
    deviceSerial: r.deviceSerial,
    fastingStatus: r.fastingStatus,
    bmi: String(r.bmi),
    interpretation: r.interpretation,
    steatosisGrade: r.steatosisGrade,
    fibrosisStage: r.fibrosisStage,
    remarks: r.remarks ?? '',
  };
}

export function LiverFibrosisScanCapturePanel({ orderId, onUpdated }: LiverFibrosisScanCapturePanelProps) {
  const [form, setForm] = useState(emptyForm());
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const scan = await technicianOrderService.getScan(orderId);
    if (scan) {
      setForm(recordToForm(scan));
      setLocked(scan.locked);
    }
  };

  useEffect(() => {
    void load();
  }, [orderId]);

  const run = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      await load();
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const buildInput = () => ({
    liverStiffnessKpa: Number(form.liverStiffnessKpa),
    capDbm: Number(form.capDbm),
    iqr: Number(form.iqr),
    iqrMedianPercent: Number(form.iqrMedianPercent),
    validMeasurements: Number(form.validMeasurements),
    totalMeasurements: Number(form.totalMeasurements),
    successRatePercent: Number(form.successRatePercent),
    probeType: form.probeType,
    scanAt: new Date().toISOString(),
    operatorName: form.operatorName,
    deviceSerial: form.deviceSerial,
    fastingStatus: form.fastingStatus,
    bmi: Number(form.bmi),
    interpretation: form.interpretation,
    steatosisGrade: form.steatosisGrade,
    fibrosisStage: form.fibrosisStage,
    remarks: form.remarks || null,
    source: 'manual' as const,
    scanFileId: null,
    scanFileUrl: null,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Liver Fibrosis Scan capture</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={saving || locked}
            onClick={() => run(() => technicianOrderService.fetchDeviceScan(orderId))}
          >
            Fetch from device (dummy Wi-Fi)
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label>LSM (kPa)</Label>
            <Input value={form.liverStiffnessKpa} disabled={locked} onChange={(e) => setForm({ ...form, liverStiffnessKpa: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>CAP (dB/m)</Label>
            <Input value={form.capDbm} disabled={locked} onChange={(e) => setForm({ ...form, capDbm: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>IQR</Label>
            <Input value={form.iqr} disabled={locked} onChange={(e) => setForm({ ...form, iqr: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>IQR/Median %</Label>
            <Input value={form.iqrMedianPercent} disabled={locked} onChange={(e) => setForm({ ...form, iqrMedianPercent: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Valid measurements</Label>
            <Input value={form.validMeasurements} disabled={locked} onChange={(e) => setForm({ ...form, validMeasurements: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Total measurements</Label>
            <Input value={form.totalMeasurements} disabled={locked} onChange={(e) => setForm({ ...form, totalMeasurements: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Success rate %</Label>
            <Input value={form.successRatePercent} disabled={locked} onChange={(e) => setForm({ ...form, successRatePercent: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Probe type</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.probeType}
              disabled={locked}
              onChange={(e) => setForm({ ...form, probeType: e.target.value as 'M' | 'XL' })}
            >
              <option value="M">M</option>
              <option value="XL">XL</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>BMI</Label>
            <Input value={form.bmi} disabled={locked} onChange={(e) => setForm({ ...form, bmi: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Fibrosis stage</Label>
            <Input value={form.fibrosisStage} disabled={locked} onChange={(e) => setForm({ ...form, fibrosisStage: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Steatosis grade</Label>
            <Input value={form.steatosisGrade} disabled={locked} onChange={(e) => setForm({ ...form, steatosisGrade: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Interpretation</Label>
            <Input value={form.interpretation} disabled={locked} onChange={(e) => setForm({ ...form, interpretation: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Device serial</Label>
            <Input value={form.deviceSerial} disabled={locked} onChange={(e) => setForm({ ...form, deviceSerial: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Operator</Label>
            <Input value={form.operatorName} disabled={locked} onChange={(e) => setForm({ ...form, operatorName: e.target.value })} />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Remarks</Label>
          <Textarea value={form.remarks} disabled={locked} rows={2} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={saving || locked}
            onClick={() => run(() => technicianOrderService.saveScan(orderId, buildInput()))}
          >
            Save scan data
          </Button>
          <Button
            variant="outline"
            disabled={saving || locked}
            onClick={() => run(() => technicianOrderService.attachScanFile(orderId, 'scan-report.pdf'))}
          >
            Attach scan PDF (dummy)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
