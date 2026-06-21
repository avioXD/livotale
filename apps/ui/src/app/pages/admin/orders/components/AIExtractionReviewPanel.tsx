import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLabReportsStore } from '@/store';
import type { ExtractedField } from '@/types/aiExtraction';

interface AIExtractionReviewPanelProps {
  orderId: string;
  pathologyRequired: boolean;
  embeddedInLab?: boolean;
  onUpdated: () => void;
  readOnly?: boolean;
}

const FLAG_COLORS: Record<string, string> = {
  normal: 'bg-green-100 text-green-800',
  high: 'bg-amber-100 text-amber-900',
  low: 'bg-blue-100 text-blue-900',
  critical: 'bg-red-100 text-red-900',
};

export function AIExtractionReviewPanel({
  orderId,
  pathologyRequired,
  embeddedInLab = false,
  onUpdated,
  readOnly = false,
}: AIExtractionReviewPanelProps) {
  const [fields, setFields] = useState<ExtractedField[]>([]);

  const activeOrderId = useLabReportsStore((s) => s.activeOrderId);
  const job = useLabReportsStore((s) => (s.activeOrderId === orderId ? s.aiJob : null));
  const report = useLabReportsStore((s) => (s.activeOrderId === orderId ? s.report : null));
  const orderSaving = useLabReportsStore((s) => s.orderSaving);
  const orderError = useLabReportsStore((s) => (s.activeOrderId === orderId ? s.orderError : null));

  const loadOrder = useLabReportsStore((s) => s.loadOrder);
  const triggerExtraction = useLabReportsStore((s) => s.triggerExtraction);
  const updateExtractionFields = useLabReportsStore((s) => s.updateExtractionFields);
  const verifyExtraction = useLabReportsStore((s) => s.verifyExtraction);
  const requestReupload = useLabReportsStore((s) => s.requestReupload);

  useEffect(() => {
    if (activeOrderId !== orderId) void loadOrder(orderId);
  }, [orderId, activeOrderId, loadOrder]);

  useEffect(() => {
    if (job) setFields(job.fields);
  }, [job]);

  if (!pathologyRequired) return null;

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      onUpdated();
    } catch {
      // orderError set in store
    }
  };

  const updateField = (id: string, editableValue: string) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, editableValue } : f)));
  };

  const addCustomField = () => {
    setFields((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        fieldName: 'Custom test',
        extractedValue: '',
        editableValue: '',
        unit: '',
        referenceRange: '',
        flag: 'normal',
        confidenceScore: 1,
        verified: false,
      },
    ]);
  };

  const content = (
    <div className="space-y-4">
        {orderError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {orderError}
          </div>
        )}

        {!report && (
          <p className="text-sm text-muted-foreground">Upload the lab partner PDF to start extraction.</p>
        )}

        {!readOnly && report && !job && (
          <Button size="sm" disabled={orderSaving} onClick={() => run(() => triggerExtraction(orderId))}>
            Re-run AI extraction
          </Button>
        )}

        {job && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge className="capitalize">{job.status.replace(/_/g, ' ')}</Badge>
              <span className="text-muted-foreground">{job.fields.length} fields in database</span>
              {report?.fileName && <span className="text-muted-foreground">Source: {report.fileName}</span>}
            </div>

            {job.fields.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Test</th>
                      <th className="px-3 py-2 text-left">Value</th>
                      <th className="px-3 py-2 text-left">Unit</th>
                      <th className="px-3 py-2 text-left">Ref range</th>
                      <th className="px-3 py-2 text-left">Flag</th>
                      <th className="px-3 py-2 text-left">Conf.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{f.fieldName}</td>
                        <td className="px-3 py-2">
                          {readOnly || job.status === 'verified' ? (
                            <span>{f.editableValue || f.extractedValue || '—'}</span>
                          ) : (
                            <Input
                              className="h-8 min-w-[80px]"
                              value={f.editableValue}
                              onChange={(e) => updateField(f.id, e.target.value)}
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{f.unit || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{f.referenceRange || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded px-2 py-0.5 text-xs capitalize ${FLAG_COLORS[f.flag] ?? ''}`}>
                            {f.flag}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{(f.confidenceScore * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {job.status === 'verified' && (
              <p className="text-sm text-green-700">
                Verified by {job.verifiedBy} on {job.verifiedAt ? new Date(job.verifiedAt).toLocaleString() : '—'}
              </p>
            )}

            {job.status === 'reupload_required' && (
              <p className="text-sm text-amber-800">Re-upload required — upload a new pathology PDF from lab email, then extraction will run again.</p>
            )}

            {!readOnly && job.status !== 'verified' && job.status !== 'reupload_required' && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={addCustomField}>Add custom field</Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={orderSaving}
                  onClick={() => run(() => updateExtractionFields(orderId, fields))}
                >
                  Save edits to database
                </Button>
                <Button
                  size="sm"
                  disabled={orderSaving || fields.length === 0}
                  onClick={() => run(() => verifyExtraction(orderId))}
                >
                  Confirm parameters for letterhead
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={orderSaving}
                  onClick={() => run(() => requestReupload(orderId))}
                >
                  Request re-upload
                </Button>
              </div>
            )}
          </>
        )}
    </div>
  );

  if (embeddedInLab) {
    return (
      <section className="rounded-md border p-4">
        <h3 className="mb-3 text-sm font-semibold">AI extraction review</h3>
        {content}
      </section>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI extraction review</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
