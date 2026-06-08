import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { aiExtractionOrderService } from '@/services/liverCare';
import type { AIExtractionJob, ExtractedField } from '@/types/aiExtraction';
import type { LabReportUpload } from '@/types/labReport';
import { pathologyService } from '@/services/liverCare';

interface AIExtractionReviewPanelProps {
  orderId: string;
  pathologyRequired: boolean;
  onUpdated: () => void;
  readOnly?: boolean;
}

const FLAG_COLORS: Record<string, string> = {
  normal: 'bg-green-100 text-green-800',
  high: 'bg-amber-100 text-amber-900',
  low: 'bg-blue-100 text-blue-900',
  critical: 'bg-red-100 text-red-900',
};

export function AIExtractionReviewPanel({ orderId, pathologyRequired, onUpdated, readOnly = false }: AIExtractionReviewPanelProps) {
  const [job, setJob] = useState<AIExtractionJob | null>(null);
  const [report, setReport] = useState<LabReportUpload | null>(null);
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [j, r] = await Promise.all([
      aiExtractionOrderService.getJobForOrder(orderId),
      pathologyService.getReport(orderId),
    ]);
    setJob(j);
    setReport(r);
    if (j) setFields(j.fields);
  };

  useEffect(() => {
    void load();
  }, [orderId]);

  if (!pathologyRequired) return null;

  const run = async (action: () => Promise<unknown>) => {
    setActing(true);
    setError(null);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI-extracted report parameters</CardTitle>
        <p className="text-sm text-muted-foreground">
          AI reads the uploaded lab PDF and extracts test parameters. Review values, save to the database, then generate the Livotale letterhead PDF below.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {!report && (
          <p className="text-sm text-muted-foreground">Upload the partner lab PDF above to start AI parameter extraction.</p>
        )}

        {!readOnly && report && !job && (
          <Button size="sm" disabled={acting} onClick={() => run(() => aiExtractionOrderService.triggerExtraction(orderId))}>
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
                Verified by {job.verifiedBy} on {job.verifiedAt ? new Date(job.verifiedAt).toLocaleString() : '—'} — ready for letterhead report generation.
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
                  disabled={acting}
                  onClick={() => run(() => aiExtractionOrderService.updateFields(orderId, fields))}
                >
                  Save edits to database
                </Button>
                <Button
                  size="sm"
                  disabled={acting || fields.length === 0}
                  onClick={() => run(() => aiExtractionOrderService.verifyExtraction(orderId))}
                >
                  Confirm parameters for letterhead
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={acting}
                  onClick={() => run(() => aiExtractionOrderService.requestReupload(orderId))}
                >
                  Request re-upload
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
