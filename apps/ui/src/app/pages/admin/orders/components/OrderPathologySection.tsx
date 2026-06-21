import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIExtractionReviewPanel } from '@/app/pages/admin/orders/components/AIExtractionReviewPanel';
import { FinalReportSection } from '@/app/pages/admin/orders/components/FinalReportSection';
import { LabWorkflowChecklist } from '@/app/pages/admin/orders/components/LabWorkflowChecklist';
import { OrderPathologyScheduleSection } from '@/app/pages/admin/orders/components/OrderPathologyScheduleSection';
import { OrderSampleProofGallery } from '@/app/pages/admin/orders/components/OrderSampleProofGallery';
import { getLabWorkflowSteps } from '@/app/pages/admin/orders/components/labWorkflowSteps';
import { isPortalOrderMapped } from '@/services/liverCare/pathologySchedule';
import { useLabReportsStore } from '@/store';
import type { LiverCareOrder } from '@/types/serviceOrder';

interface OrderPathologySectionProps {
  order: LiverCareOrder;
  pathologyRequired: boolean;
  onUpdated: () => void;
  readOnly?: boolean;
}

export function OrderPathologySection({
  order,
  pathologyRequired,
  onUpdated,
  readOnly = false,
}: OrderPathologySectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedLabId, setSelectedLabId] = useState(order.partnerLabId ?? '');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const storeOrder = useLabReportsStore((s) => (s.activeOrderId === order.id ? s.activeOrder : null));
  const report = useLabReportsStore((s) => (s.activeOrderId === order.id ? s.report : null));
  const dispatch = useLabReportsStore((s) => (s.activeOrderId === order.id ? s.dispatch : null));
  const aiJob = useLabReportsStore((s) => (s.activeOrderId === order.id ? s.aiJob : null));
  const partnerLabs = useLabReportsStore((s) => s.partnerLabs);
  const orderSaving = useLabReportsStore((s) => s.orderSaving);
  const orderError = useLabReportsStore((s) => (s.activeOrderId === order.id ? s.orderError : null));

  const loadOrder = useLabReportsStore((s) => s.loadOrder);
  const assignLab = useLabReportsStore((s) => s.assignLab);
  const markReceivedAtLab = useLabReportsStore((s) => s.markReceivedAtLab);
  const markAwaitingReport = useLabReportsStore((s) => s.markAwaitingReport);
  const markLabPartnerCollected = useLabReportsStore((s) => s.markLabPartnerCollected);
  const confirmLabPartnerVisit = useLabReportsStore((s) => s.confirmLabPartnerVisit);
  const uploadReportFromEmail = useLabReportsStore((s) => s.uploadReportFromEmail);

  const effectiveOrder = storeOrder ?? order;
  const assignedLab = partnerLabs.find((l) => l.id === effectiveOrder.partnerLabId);

  const workflowSteps = useMemo(
    () => getLabWorkflowSteps({ order: effectiveOrder, dispatch, report, aiJob }),
    [effectiveOrder, dispatch, report, aiJob],
  );

  useEffect(() => {
    void loadOrder(order.id);
    setSelectedLabId(order.partnerLabId ?? '');
  }, [order.id, order.partnerLabId, loadOrder]);

  const portalOrderMapped = isPortalOrderMapped(effectiveOrder);

  if (!pathologyRequired) {
    return (
      <p className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
        Pathology not included in {order.packageCode}.
      </p>
    );
  }

  const run = async (action: () => Promise<unknown>) => {
    setUploadSuccess(null);
    try {
      await action();
      onUpdated();
    } catch {
      // orderError set in store
    }
  };

  const canUploadPdf = dispatch?.status === 'awaiting_report' && !report;

  const handleUploadPdf = () => {
    if (!pdfFile) return;
    void run(async () => {
      const result = await uploadReportFromEmail(order.id, { file: pdfFile });
      setUploadSuccess(
        `Uploaded ${result.report.fileName}. AI extracted ${result.extractionJob.fields.length} parameters.`,
      );
      setPdfFile(null);
      if (fileRef.current) fileRef.current.value = '';
    });
  };

  return (
    <div className="space-y-4">
      <LabWorkflowChecklist steps={workflowSteps} />

      <OrderPathologyScheduleSection order={order} onUpdated={onUpdated} readOnly={readOnly} />

      {orderError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {orderError}
        </div>
      )}
      {uploadSuccess && (
        <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          {uploadSuccess}
        </div>
      )}

      <OrderSampleProofGallery dispatch={dispatch} orderNumber={effectiveOrder.orderNumber} />

      <div className="space-y-4 rounded-md border p-4">
        {readOnly ? (
          <div className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Lab partner: </span>
              <span className="font-medium">{effectiveOrder.partnerLabName ?? '—'}</span>
            </p>
            {assignedLab?.email && (
              <p>
                <span className="text-muted-foreground">Lab email: </span>
                {assignedLab.email}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 space-y-1">
              <Label htmlFor="partner-lab">Lab partner</Label>
              <select
                id="partner-lab"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedLabId}
                onChange={(e) => setSelectedLabId(e.target.value)}
              >
                <option value="">Select lab…</option>
                {partnerLabs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — {l.city}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              disabled={orderSaving || !selectedLabId}
              onClick={() => run(() => assignLab(order.id, selectedLabId))}
            >
              Assign lab
            </Button>
          </div>
        )}

        {effectiveOrder.partnerLabName && assignedLab && (
          <p className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <strong>{effectiveOrder.partnerLabName}</strong> emails reports to{' '}
            <code className="text-xs">{assignedLab.email}</code>
          </p>
        )}

        {!readOnly &&
          order.pathologyScheduledAt &&
          !portalOrderMapped && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Confirm the pathology schedule above, then generate the internal ref and save the lab portal
              order ID before tracking collector visit.
            </p>
          )}

        {!readOnly &&
          order.pathologyScheduledAt &&
          dispatch?.status === 'pending_dispatch' &&
          portalOrderMapped &&
          effectiveOrder.pathologyVisitOutcome !== 'visited' && (
            <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-900">
              <p className="font-medium">Update from lab partner portal — collector visit</p>
              <p>
                Check {order.partnerLabName}&apos;s portal for order{' '}
                {effectiveOrder.pathologyExternalAppointmentId ? (
                  <span className="font-mono">{effectiveOrder.pathologyExternalAppointmentId}</span>
                ) : (
                  '—'
                )}
                . When their collector has visited the patient, confirm here.
              </p>
              {effectiveOrder.pathologyVisitOutcome === 'no_show' && (
                <p className="text-amber-800">
                  Previous visit marked as no-show — confirm a new schedule above, then record visit outcome
                  again.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={orderSaving}
                  onClick={() => run(() => confirmLabPartnerVisit(order.id, 'visited'))}
                >
                  Collector visited
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={orderSaving}
                  onClick={() => run(() => confirmLabPartnerVisit(order.id, 'no_show'))}
                >
                  No-show
                </Button>
              </div>
            </div>
          )}

        {!readOnly && effectiveOrder.pathologyVisitOutcome === 'visited' && (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
            Lab collector visit confirmed
            {effectiveOrder.pathologyVisitConfirmedAt
              ? ` · ${new Date(effectiveOrder.pathologyVisitConfirmedAt).toLocaleString()}`
              : ''}
          </p>
        )}

        {!readOnly && dispatch?.status === 'pending_dispatch' && order.pathologyScheduledAt && (
          effectiveOrder.pathologyVisitOutcome === 'visited' ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span>
              Check the lab partner portal — when sample collection is complete, mark it here.
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={orderSaving}
              onClick={() => run(() => markLabPartnerCollected(order.id))}
            >
              Sample collected (lab portal)
            </Button>
          </div>
          ) : null
        )}

        {!readOnly && dispatch?.status === 'pending_dispatch' && !order.pathologyScheduledAt && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Assign a lab partner and confirm the pathology visit schedule above.
          </p>
        )}

        {!readOnly && dispatch?.status === 'sample_collected' && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Sample collected — check lab partner portal; mark received at lab when testing has started there.
          </p>
        )}

        {!readOnly && dispatch?.status === 'sample_collected' && (
          <Button
            size="sm"
            variant="secondary"
            disabled={orderSaving}
            onClick={() => run(() => markReceivedAtLab(order.id))}
          >
            Lab received sample & testing
          </Button>
        )}

        {!readOnly && dispatch?.status === 'received_at_lab' && !report && (
          <Button
            size="sm"
            variant="outline"
            disabled={orderSaving}
            onClick={() => run(() => markAwaitingReport(order.id))}
          >
            Mark awaiting report (lab will email PDF)
          </Button>
        )}

        {!readOnly && canUploadPdf && (
          <div className="space-y-3 rounded-md border border-dashed border-livotale-pink/40 bg-livotale-pink/5 p-4">
            <p className="text-sm font-medium">Upload lab report PDF</p>
            {effectiveOrder.pathologyLabOrderRef && (
              <p className="text-sm text-muted-foreground">
                Internal ref:{' '}
                <span className="font-mono font-medium text-foreground">
                  {effectiveOrder.pathologyLabOrderRef}
                </span>
              </p>
            )}
            <div className="space-y-1">
              <Label htmlFor="lab-pdf">PDF file</Label>
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
            <Button size="sm" disabled={orderSaving || !pdfFile} onClick={handleUploadPdf}>
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
      </div>

      <AIExtractionReviewPanel
        orderId={order.id}
        pathologyRequired
        embeddedInLab
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
