import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { SampleBottlePhotos, SampleIntegrityBadge } from '@/app/pages/sample-collection/components/SampleIntegrityPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sampleCollectionService } from '@/services/sampleCollection';
import type { SampleCollection, SampleLabTest, SampleRejectionReason } from '@/types/sampleCollection';

const REJECTION_REASONS: { value: SampleRejectionReason; label: string }[] = [
  { value: 'sample_id_mismatch', label: 'Sample ID mismatch' },
  { value: 'image_unclear', label: 'Sample image unclear' },
  { value: 'damaged', label: 'Sample damaged' },
  { value: 'leaked', label: 'Sample leaked' },
  { value: 'wrong_container', label: 'Wrong container' },
  { value: 'insufficient_quantity', label: 'Quantity insufficient' },
  { value: 'delayed_delivery', label: 'Delayed delivery' },
  { value: 'not_labelled', label: 'Sample not labelled' },
  { value: 'patient_mismatch', label: 'Patient details mismatch' },
  { value: 'test_not_possible', label: 'Test not possible' },
  { value: 'other', label: 'Other' },
];

function flagClass(flag: string) {
  if (flag === 'high' || flag === 'critical') return 'text-destructive';
  if (flag === 'low') return 'text-amber-600';
  if (flag === 'normal') return 'text-emerald-600';
  return '';
}

export function LabSamplesPage() {
  const [samples, setSamples] = useState<SampleCollection[]>([]);
  const [selected, setSelected] = useState<SampleCollection | null>(null);
  const [resultDraft, setResultDraft] = useState<Record<string, string>>({});
  const [searchCode, setSearchCode] = useState('');
  const [rejectReason, setRejectReason] = useState<SampleRejectionReason>('damaged');
  const [rejectNote, setRejectNote] = useState('');
  const [labPhotoFile, setLabPhotoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sampleCollectionService.listLab();
      setSamples(data);
      setUsingDemo(data.length > 0 && data[0]?.id.startsWith('demo-'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load samples');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const syncResultDraft = (tests: SampleLabTest[] | undefined) => {
    const draft: Record<string, string> = {};
    for (const test of tests ?? []) {
      draft[test.labTestId] =
        test.resultText ?? (test.resultValue != null ? String(test.resultValue) : '');
    }
    setResultDraft(draft);
  };

  const openSample = async (id: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const detail = await sampleCollectionService.getLabById(id);
      setSelected(detail);
      syncResultDraft(detail.requestedTests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample');
    } finally {
      setIsSaving(false);
    }
  };

  const run = async (action: () => Promise<unknown>) => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await action();
      if (result && typeof result === 'object' && 'sampleCollection' in result) {
        const sc = (result as { sampleCollection: SampleCollection }).sampleCollection;
        setSelected(sc);
        syncResultDraft(sc.requestedTests);
      } else if (selected && result) {
        const sc = result as SampleCollection;
        setSelected(sc);
        syncResultDraft(sc.requestedTests);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsSaving(false);
    }
  };

  const saveResults = async () => {
    if (!selected?.requestedTests?.length) return;
    const results = selected.requestedTests.map((test) => {
      const raw = resultDraft[test.labTestId]?.trim() ?? '';
      const numeric = raw !== '' && !Number.isNaN(Number(raw)) ? Number(raw) : null;
      return {
        labTestId: test.labTestId,
        resultValue: numeric,
        resultText: numeric == null && raw ? raw : null,
      };
    });
    await run(() => sampleCollectionService.updateLabResults(selected.id, results));
  };

  const filtered = searchCode.trim()
    ? samples.filter((s) => s.sampleCode.toLowerCase().includes(searchCode.trim().toLowerCase()))
    : samples;

  const tests = selected?.requestedTests ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample testing queue"
        description="Verify collected blood samples, enter test vitals, and generate PDF reports."
      />

      {usingDemo && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Demo samples — technician-collected blood assigned to your lab. Restart API after pulling latest code, then run migration 027 and <code className="text-xs">npm run seed:sample-demo</code>.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Collected samples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search by LGSC sample code"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
            />
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No samples in queue.</p>
            ) : (
              <ul className="space-y-2">
                {filtered.map((sample) => (
                  <li key={sample.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-muted/50"
                      onClick={() => void openSample(sample.id)}
                    >
                      <div>
                        <p className="font-mono text-sm">{sample.sampleCode}</p>
                        <p className="text-xs text-muted-foreground">
                          {sample.patientName ?? 'Patient'}
                          {(sample.requestedTestCount ?? sample.requestedTests?.length)
                            ? ` · ${sample.requestedTestCount ?? sample.requestedTests?.length} tests ordered`
                            : ''}
                          {sample.technicianName ? ` · Tech: ${sample.technicianName}` : ''}
                        </p>
                      </div>
                      <Badge className="capitalize">{sample.status.replace(/_/g, ' ')}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sample processing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select a sample to verify identity and enter results.</p>
            ) : (
              <>
                <SampleIntegrityBadge
                  sampleCode={selected.sampleCode}
                  patientName={selected.patientName}
                  patientCode={selected.patientCode}
                  qrVerificationCode={selected.qrVerificationCode}
                />

                <Badge className="capitalize">{selected.status.replace(/_/g, ' ')}</Badge>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Chain-of-custody photos</Label>
                  <SampleBottlePhotos
                    photos={selected.photos}
                    emptyMessage="No bottle photos from technician yet."
                  />
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <Label className="text-sm font-medium">Lab bottle verification photo</Label>
                  <p className="text-xs text-muted-foreground">
                    Photograph the bottle label and QR to confirm this is the correct patient sample.
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setLabPhotoFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    size="sm"
                    disabled={isSaving || !labPhotoFile}
                    onClick={() => {
                      if (!labPhotoFile) return;
                      void run(async () => {
                        const sc = await sampleCollectionService.uploadLabPhoto(selected.id, labPhotoFile);
                        setLabPhotoFile(null);
                        return sc;
                      });
                    }}
                  >
                    Upload lab verification photo
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={isSaving} onClick={() => void run(() => sampleCollectionService.receiveLab(selected.id))}>
                    Mark received
                  </Button>
                  <Button size="sm" variant="outline" disabled={isSaving} onClick={() => void run(() => sampleCollectionService.startTesting(selected.id))}>
                    Start testing
                  </Button>
                </div>

                <div className="space-y-3 rounded-md border p-3">
                  <Label className="text-sm font-medium">Requested tests & vitals</Label>
                  {tests.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No tests linked to this sample yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="py-2 pr-2">Test</th>
                            <th className="py-2 pr-2">Ref range</th>
                            <th className="py-2">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tests.map((test) => (
                            <tr key={test.labTestId} className="border-b last:border-0">
                              <td className="py-2 pr-2">
                                <p className="font-medium">{test.name}</p>
                                <p className="text-xs text-muted-foreground">{test.code}{test.unit ? ` · ${test.unit}` : ''}</p>
                              </td>
                              <td className="py-2 pr-2 text-xs text-muted-foreground">
                                {test.referenceRange ?? '—'}
                              </td>
                              <td className="py-2">
                                <Input
                                  className="h-8"
                                  placeholder="Value"
                                  value={resultDraft[test.labTestId] ?? ''}
                                  onChange={(e) =>
                                    setResultDraft({ ...resultDraft, [test.labTestId]: e.target.value })
                                  }
                                />
                                {test.flag && test.flag !== 'unknown' && (
                                  <span className={`text-xs capitalize ${flagClass(test.flag)}`}>{test.flag}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Button size="sm" disabled={isSaving || tests.length === 0} onClick={() => void saveResults()}>
                    Save test results to database
                  </Button>
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <Label className="text-sm font-medium">Generate report PDF</Label>
                  <p className="text-xs text-muted-foreground">
                    Creates a PDF from saved vitals and submits for admin approval.
                  </p>
                  <Button
                    size="sm"
                    disabled={isSaving}
                    onClick={() => void run(() => sampleCollectionService.generateLabReport(selected.id))}
                  >
                    Generate & upload report PDF
                  </Button>
                  {(selected.reports?.length ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selected.reports?.length} report(s) on file — pending admin approval.
                    </p>
                  )}
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <Label>Reject sample</Label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value as SampleRejectionReason)}
                  >
                    {REJECTION_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <Textarea
                    placeholder="Rejection remarks"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    rows={2}
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSaving}
                    onClick={() =>
                      void run(() => sampleCollectionService.rejectLab(selected.id, rejectReason, rejectNote || undefined))
                    }
                  >
                    Reject sample
                  </Button>
                </div>

                {selected.appointmentId && (
                  <Button variant="link" size="sm" asChild className="px-0">
                    <Link to={`/appointments/${selected.appointmentId}`}>View appointment</Link>
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
