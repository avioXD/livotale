import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIExtractionReviewPanel } from '@/app/pages/admin/orders/components/AIExtractionReviewPanel';
import { FinalReportSection } from '@/app/pages/admin/orders/components/FinalReportSection';
import { pathologyService, partnerLabService } from '@/services/liverCare';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { LabReportUpload } from '@/types/labReport';
import type { PartnerLab } from '@/types/partnerLab';
import type { SampleDispatch } from '@/types/sampleDispatch';
import { SAMPLE_DISPATCH_LABELS } from '@/types/sampleDispatch';

interface OrderPathologySectionProps {
  order: LiverCareOrder;
  pathologyRequired: boolean;
  onUpdated: () => void;
  readOnly?: boolean;
}

const WORKFLOW_STEPS = [
  'Assign partner lab',
  'Submit blood sample',
  'Lab receives sample',
  'Awaiting report (email)',
  'Upload lab PDF',
  'AI extraction review',
  'Livotale letterhead PDF',
] as const;

const AFTER_LETTERHEAD_STATUSES = new Set([
  'final_report_generated',
  'doctor_assignment_pending',
  'doctor_assigned',
  'consultation_pending',
  'prescription_pending',
  'prescription_generated',
  'completed',
]);

export function OrderPathologySection({
  order,
  pathologyRequired,
  onUpdated,
  readOnly = false,
}: OrderPathologySectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [labs, setLabs] = useState<PartnerLab[]>([]);
  const [selectedLabId, setSelectedLabId] = useState(order.partnerLabId ?? '');
  const [report, setReport] = useState<LabReportUpload | null>(null);
  const [dispatch, setDispatch] = useState<SampleDispatch | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [emailFrom, setEmailFrom] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [courierRef, setCourierRef] = useState('');
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const assignedLab = labs.find((l) => l.id === order.partnerLabId);

  const load = async () => {
    const [r, d] = await Promise.all([
      pathologyService.getReport(order.id),
      pathologyService.getSampleDispatch(order.id),
    ]);
    setReport(r);
    setDispatch(d);
    if (r?.emailFrom) setEmailFrom(r.emailFrom);
    if (r?.emailSubject) setEmailSubject(r.emailSubject);
  };

  useEffect(() => {
    void partnerLabService.list().then(setLabs);
    void load();
    setSelectedLabId(order.partnerLabId ?? '');
  }, [order.id, order.partnerLabId]);

  useEffect(() => {
    if (assignedLab?.email && !emailFrom) {
      setEmailFrom(assignedLab.email);
    }
  }, [assignedLab?.email, emailFrom]);

  if (!pathologyRequired) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Pathology not included in {order.packageCode}. No lab report workflow.
        </CardContent>
      </Card>
    );
  }

  const run = async (action: () => Promise<unknown>) => {
    setActing(true);
    setError(null);
    setUploadSuccess(null);
    try {
      await action();
      await load();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const activeStep = (() => {
    if (AFTER_LETTERHEAD_STATUSES.has(order.orderStatus)) return 6;
    if (order.orderStatus === 'report_review_pending') return 6;
    if (report?.extractionStatus === 'verified' || report?.finalStatus === 'verified') return 5;
    if (report) return 4;
    if (dispatch?.status === 'awaiting_report') return 3;
    if (dispatch?.status === 'received_at_lab') return 2;
    if (dispatch?.status === 'dispatched') return 1;
    if (order.partnerLabId) return 0;
    return -1;
  })();

  const canUploadPdf =
    dispatch &&
    ['awaiting_report', 'received_at_lab', 'dispatched'].includes(dispatch.status) &&
    !report;

  const handleUploadPdf = () => {
    if (!pdfFile) {
      setError('Select the PDF attachment from the lab email');
      return;
    }
    void run(async () => {
      const result = await pathologyService.uploadReportFromEmail(order.id, {
        file: pdfFile,
        emailFrom: emailFrom || assignedLab?.email,
        emailSubject: emailSubject || undefined,
      });
      setUploadSuccess(
        `Uploaded ${result.report.fileName}. AI extracted ${result.extractionJob.fields.length} parameters — review below.`,
      );
      setPdfFile(null);
      if (fileRef.current) fileRef.current.value = '';
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lab report</CardTitle>
          <p className="text-sm text-muted-foreground">
            Partner lab, sample dispatch, lab PDF upload, AI extraction, and downloadable Livotale letterhead report — all on this step.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {uploadSuccess && (
            <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
              {uploadSuccess}
            </div>
          )}

          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW_STEPS.map((step, i) => (
              <li
                key={step}
                className={`rounded-md border px-2 py-2 text-xs ${i <= activeStep ? 'border-livotale-pink/40 bg-livotale-pink/5 font-medium' : 'text-muted-foreground'}`}
              >
                <span className="mr-1 text-muted-foreground">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>

          {dispatch && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sample status:</span>
              <Badge variant="outline">{SAMPLE_DISPATCH_LABELS[dispatch.status]}</Badge>
              {dispatch.dispatchedBy && (
                <span className="text-xs text-muted-foreground">Submitted by {dispatch.dispatchedBy}</span>
              )}
              {dispatch.courierRef && <span className="text-xs text-muted-foreground">Ref: {dispatch.courierRef}</span>}
            </div>
          )}

          {readOnly ? (
            <div className="rounded-md border p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Partner lab: </span>
                <span className="font-medium">{order.partnerLabName ?? '—'}</span>
              </p>
              {assignedLab?.email && (
                <p>
                  <span className="text-muted-foreground">Lab email: </span>
                  {assignedLab.email}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
              <div className="min-w-[200px] flex-1 space-y-1">
                <Label htmlFor="partner-lab">Partner lab</Label>
                <select
                  id="partner-lab"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedLabId}
                  onChange={(e) => setSelectedLabId(e.target.value)}
                >
                  <option value="">Select lab…</option>
                  {labs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.city}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                disabled={acting || !selectedLabId}
                onClick={() => run(() => pathologyService.assignLab(order.id, selectedLabId))}
              >
                Assign lab
              </Button>
            </div>
          )}

          {order.partnerLabName && assignedLab && (
            <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <strong>{order.partnerLabName}</strong> will email reports to{' '}
              <code className="text-xs">{assignedLab.email}</code> — upload that PDF below when received.
            </div>
          )}

          {!readOnly && order.partnerLabId && dispatch?.status === 'pending_dispatch' && (
            <div className="flex flex-wrap items-end gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="min-w-[160px] flex-1 space-y-1">
                <Label>Courier / handoff ref (optional)</Label>
                <Input
                  value={courierRef}
                  onChange={(e) => setCourierRef(e.target.value)}
                  placeholder="e.g. COUR-MUM-4421"
                />
              </div>
              <Button
                size="sm"
                disabled={acting}
                onClick={() =>
                  run(() => pathologyService.dispatchSample(order.id, 'operations', courierRef || undefined))
                }
              >
                Blood sample submitted to lab
              </Button>
            </div>
          )}

          {!readOnly && dispatch?.status === 'dispatched' && (
            <Button
              size="sm"
              variant="secondary"
              disabled={acting}
              onClick={() => run(() => pathologyService.markReceivedAtLab(order.id))}
            >
              Lab received sample
            </Button>
          )}

          {!readOnly &&
            (dispatch?.status === 'received_at_lab' || dispatch?.status === 'dispatched') &&
            !report && (
              <Button
                size="sm"
                variant="outline"
                disabled={acting}
                onClick={() => run(() => pathologyService.markAwaitingReport(order.id))}
              >
                Mark awaiting report (lab will email PDF)
              </Button>
            )}

          {!readOnly && canUploadPdf && (
            <div className="space-y-3 rounded-md border border-dashed border-livotale-pink/40 bg-livotale-pink/5 p-4">
              <p className="text-sm font-medium">Upload PDF from lab email</p>
              <p className="text-xs text-muted-foreground">
                Forward or download the attachment from {assignedLab?.email ?? 'the partner lab'}. AI extraction
                starts automatically after upload.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="email-from">Email from</Label>
                  <Input
                    id="email-from"
                    value={emailFrom}
                    onChange={(e) => setEmailFrom(e.target.value)}
                    placeholder={assignedLab?.email ?? 'reports@lab.test'}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email-subject">Email subject (optional)</Label>
                  <Input
                    id="email-subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder={`Pathology — ${order.patientName}`}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="lab-pdf">Lab report PDF</Label>
                <Input
                  id="lab-pdf"
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                />
                {pdfFile && (
                  <p className="text-xs text-muted-foreground">
                    {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
              <Button size="sm" disabled={acting || !pdfFile} onClick={handleUploadPdf}>
                Upload & run AI extraction
              </Button>
            </div>
          )}

          {report && (
            <div className="rounded-md border p-3 text-sm space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{report.fileName}</span>
                <Badge variant="outline" className="capitalize">
                  {report.extractionStatus.replace(/_/g, ' ')}
                </Badge>
                <Badge className="capitalize">{report.finalStatus}</Badge>
                {report.sourceType === 'partner_lab_email' && <Badge variant="secondary">From lab email</Badge>}
              </div>
              {report.emailFrom && (
                <p className="text-muted-foreground">
                  Email: {report.emailFrom}
                  {report.emailSubject ? ` · ${report.emailSubject}` : ''}
                </p>
              )}
              <p className="text-muted-foreground">
                Uploaded {new Date(report.uploadedAt).toLocaleString()} · {report.partnerLabName}
              </p>
              <Button size="sm" variant="outline" asChild>
                <a href={report.fileUrl} target="_blank" rel="noreferrer">
                  View lab PDF
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AIExtractionReviewPanel
        orderId={order.id}
        pathologyRequired
        onUpdated={onUpdated}
        readOnly={readOnly}
      />

      <FinalReportSection
        orderId={order.id}
        pathologyRequired
        embeddedInLab
        onUpdated={onUpdated}
        readOnly={readOnly}
      />
    </div>
  );
}
