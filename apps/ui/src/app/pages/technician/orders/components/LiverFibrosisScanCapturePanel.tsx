import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FiUpload, FiWifi } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FIBROSIS_STAGE_HINT,
  STEATOSIS_GRADE_HINT,
  METAVIR_STAGES,
  STEATOSIS_GRADES,
  fibroScanReliability,
  measurementSuccessPercent,
  scanNeedsProof,
  isScanCaptureComplete,
} from '@/app/pages/shared/components/fibroScanKpiConfig';
import { technicianOrderService } from '@/services/liverCare';
import type { FibrosisScanRecord, ScanReportDocumentType } from '@/types/fibrosisScan';
import { cn } from '@/utils';

interface LiverFibrosisScanCapturePanelProps {
  orderId: string;
  orderNumber: string;
  devicePatientCode?: string;
  onUpdated?: () => void;
  onSaved?: () => void;
}

const emptyForm = () => ({
  liverStiffnessKpa: '',
  capDbm: '',
  iqr: '',
  iqrMedianPercent: '',
  validMeasurements: '',
  totalMeasurements: '',
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

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
  );
}

export function LiverFibrosisScanCapturePanel({
  orderId,
  orderNumber,
  devicePatientCode,
  onUpdated,
  onSaved,
}: LiverFibrosisScanCapturePanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm());
  const [scanMeta, setScanMeta] = useState<Pick<FibrosisScanRecord, 'source' | 'scanFileUrl' | 'scanFileId'> | null>(
    null,
  );
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [reportDocumentType, setReportDocumentType] = useState<ScanReportDocumentType>('scanner_pdf');
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const scan = await technicianOrderService.getScan(orderId);
    if (scan) {
      setForm(recordToForm(scan));
      setScanMeta({
        source: scan.source,
        scanFileUrl: scan.scanFileUrl,
        scanFileId: scan.scanFileId,
      });
      if (scan.scanReportDocumentType) {
        setReportDocumentType(scan.scanReportDocumentType);
      }
      setLocked(scan.locked);
    } else {
      setScanMeta(null);
    }
  };

  useEffect(() => {
    void load();
  }, [orderId]);

  const run = async (action: () => Promise<unknown>, options?: { markComplete?: boolean }) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      await load();
      onUpdated?.();
      const scan = await technicianOrderService.getScan(orderId);
      if (options?.markComplete && isScanCaptureComplete(scan)) {
        onSaved?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const iqrMedianNum = Number(form.iqrMedianPercent);
  const reliability = fibroScanReliability(iqrMedianNum);
  const validNum = Number(form.validMeasurements);
  const totalNum = Number(form.totalMeasurements);
  const successRate = measurementSuccessPercent(validNum, totalNum);

  const buildInput = (source: FibrosisScanRecord['source'] = 'manual') => ({
    liverStiffnessKpa: Number(form.liverStiffnessKpa),
    capDbm: Number(form.capDbm),
    iqr: Number(form.iqr),
    iqrMedianPercent: Number(form.iqrMedianPercent),
    validMeasurements: validNum,
    totalMeasurements: totalNum,
    successRatePercent: successRate,
    probeType: form.probeType,
    scanAt: new Date().toISOString(),
    operatorName: form.operatorName,
    deviceSerial: form.deviceSerial,
    fastingStatus: form.fastingStatus,
    bmi: Number(form.bmi) || 0,
    interpretation: form.interpretation,
    steatosisGrade: form.steatosisGrade,
    fibrosisStage: form.fibrosisStage,
    remarks: form.remarks || null,
    source,
    scanFileId: scanMeta?.scanFileId ?? null,
    scanFileUrl: scanMeta?.scanFileUrl ?? null,
  });

  const proofRequired = scanNeedsProof(scanMeta);

  const kpisValid =
    Boolean(form.liverStiffnessKpa) &&
    Boolean(form.capDbm) &&
    Boolean(form.iqrMedianPercent) &&
    Boolean(form.validMeasurements) &&
    Boolean(form.totalMeasurements);

  const handleSubmitScan = () => {
    if (!proofFile || !kpisValid) return;
    void run(
      async () => {
        await technicianOrderService.saveScan(orderId, buildInput(scanMeta?.source ?? 'manual'));
        await technicianOrderService.attachScanFile(orderId, proofFile, reportDocumentType);
        setProofFile(null);
        if (fileRef.current) fileRef.current.value = '';
      },
      { markComplete: true },
    );
  };

  const handleSaveDraft = () => {
    if (!kpisValid) return;
    void run(
      () => technicianOrderService.saveScan(orderId, buildInput(scanMeta?.source ?? 'manual')),
      { markComplete: false },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">3. FibroScan results from machine</CardTitle>
        <CardDescription>
          Fetch KPIs from the device over Wi‑Fi or enter values manually from the on-screen report. Upload a
          photo or PDF of the FibroScan report in both cases before completing the visit. Device code{' '}
          <span className="font-mono font-medium">{devicePatientCode ?? '—'}</span> · Order{' '}
          <span className="font-mono font-medium">{orderNumber}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            disabled={saving || locked}
            onClick={() => run(() => technicianOrderService.fetchDeviceScan(orderId), { markComplete: false })}
          >
            <FiWifi className="h-4 w-4" aria-hidden />
            Fetch from machine
          </Button>
          {scanMeta?.source && (
            <Badge variant="outline" className="capitalize">
              Last source: {scanMeta.source}
            </Badge>
          )}
          {proofRequired && (
            <Badge variant="secondary" className="border-amber-400 bg-amber-50 text-amber-900">
              Report proof required
            </Badge>
          )}
        </div>

        {proofRequired && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Upload a PDF or image of the FibroScan report before completing this step.
          </p>
        )}

        <div className="space-y-3 rounded-lg border p-3">
          <SectionTitle>Primary clinical KPIs</SectionTitle>
          <p className="text-xs text-muted-foreground">
            Median values consolidated from multiple ultrasound pulses on the FibroScan report.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Liver stiffness E — median (kPa)</Label>
              <Input
                inputMode="decimal"
                placeholder="e.g. 6.2"
                value={form.liverStiffnessKpa}
                disabled={locked}
                onChange={(e) => setForm({ ...form, liverStiffnessKpa: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">Degree of liver scarring / fibrosis</p>
            </div>
            <div className="space-y-1">
              <Label>CAP score — median (dB/m)</Label>
              <Input
                inputMode="decimal"
                placeholder="e.g. 285"
                value={form.capDbm}
                disabled={locked}
                onChange={(e) => setForm({ ...form, capDbm: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">Fat accumulation in the liver (steatosis)</p>
            </div>
            <div className="space-y-1">
              <Label>Fibrosis stage (METAVIR)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                value={form.fibrosisStage}
                disabled={locked}
                onChange={(e) => setForm({ ...form, fibrosisStage: e.target.value })}
              >
                {METAVIR_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">{FIBROSIS_STAGE_HINT}</p>
            </div>
            <div className="space-y-1">
              <Label>Steatosis grade (S0–S3)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                value={form.steatosisGrade}
                disabled={locked}
                onChange={(e) => setForm({ ...form, steatosisGrade: e.target.value })}
              >
                {STEATOSIS_GRADES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">{STEATOSIS_GRADE_HINT}</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Clinical interpretation (from report)</Label>
              <Input
                value={form.interpretation}
                disabled={locked}
                placeholder="e.g. Mild fibrosis, moderate steatosis"
                onChange={(e) => setForm({ ...form, interpretation: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle>Quality control &amp; reliability</SectionTitle>
            {Number.isFinite(iqrMedianNum) && form.iqrMedianPercent !== '' && (
              <Badge
                variant={reliability.reliable ? 'default' : 'secondary'}
                className={cn(reliability.reliable && 'bg-emerald-600')}
              >
                {reliability.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            IQR / Median ≤ 30% generally indicates a valid scan (e.g. 11% is highly reliable).
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label>IQR — median (kPa)</Label>
              <Input
                inputMode="decimal"
                value={form.iqr}
                disabled={locked}
                onChange={(e) => setForm({ ...form, iqr: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>IQR / Median (%)</Label>
              <Input
                inputMode="decimal"
                value={form.iqrMedianPercent}
                disabled={locked}
                onChange={(e) => setForm({ ...form, iqrMedianPercent: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Valid measurements</Label>
              <Input
                inputMode="numeric"
                value={form.validMeasurements}
                disabled={locked}
                onChange={(e) => setForm({ ...form, validMeasurements: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Total measurements</Label>
              <Input
                inputMode="numeric"
                value={form.totalMeasurements}
                disabled={locked}
                onChange={(e) => setForm({ ...form, totalMeasurements: e.target.value })}
              />
            </div>
          </div>
          {validNum > 0 && totalNum > 0 && (
            <p className="text-xs text-muted-foreground">
              Valid / total: {validNum} / {totalNum} ({successRate}% success rate)
            </p>
          )}
        </div>

        <div
          className={cn(
            'space-y-3 rounded-lg border p-3',
            proofRequired && 'border-amber-400 bg-amber-50/50',
          )}
        >
          <SectionTitle>
            Machine report proof (required)
          </SectionTitle>
          <p className="text-xs text-muted-foreground">
            Photo or PDF of the on-screen or printed FibroScan report — required for manual and device-fetched scans.
          </p>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Report document type</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {(
                [
                  ['scanner_pdf', 'Scanner system PDF'],
                  ['report_photo', 'Report photo'],
                  ['letter', 'Letter / printout (for AI validation)'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="report-document-type"
                    value={value}
                    checked={reportDocumentType === value}
                    disabled={locked}
                    onChange={() => setReportDocumentType(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          {scanMeta?.scanFileUrl && (
            <p className="text-sm">
              Attached:{' '}
              <a
                href={scanMeta.scanFileUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-livotale-pink hover:underline"
              >
                View report proof
              </a>
            </p>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1 space-y-1">
              <Label htmlFor="scan-proof-file">PDF or image</Label>
              <Input
                id="scan-proof-file"
                ref={fileRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,.pdf"
                disabled={locked || saving}
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
              {proofFile && (
                <p className="text-xs text-muted-foreground">
                  {proofFile.name} ({(proofFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            className="gap-2"
            disabled={saving || locked || !kpisValid || !proofFile}
            onClick={handleSubmitScan}
          >
            <FiUpload className="h-4 w-4" aria-hidden />
            Submit scan
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={saving || locked || !kpisValid}
            onClick={handleSaveDraft}
          >
            Save draft
          </Button>
        </div>

        <button
          type="button"
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          onClick={() => setShowSession((v) => !v)}
        >
          {showSession ? 'Hide' : 'Show'} session &amp; device details
        </button>

        {showSession && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-1">
              <Label className="text-xs">Probe</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.probeType}
                disabled={locked}
                onChange={(e) => setForm({ ...form, probeType: e.target.value as 'M' | 'XL' })}
              >
                <option value="M">M</option>
                <option value="XL">XL</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Device serial</Label>
              <Input
                value={form.deviceSerial}
                disabled={locked}
                onChange={(e) => setForm({ ...form, deviceSerial: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Operator on device</Label>
              <Input
                value={form.operatorName}
                disabled={locked}
                onChange={(e) => setForm({ ...form, operatorName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">BMI</Label>
              <Input value={form.bmi} disabled={locked} onChange={(e) => setForm({ ...form, bmi: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Technician remarks</Label>
              <Textarea
                value={form.remarks}
                disabled={locked}
                rows={2}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
