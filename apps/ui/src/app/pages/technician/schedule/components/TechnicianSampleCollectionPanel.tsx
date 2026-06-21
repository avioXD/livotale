import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sampleCollectionService } from '@/services/sampleCollection';
import type { SampleCollection, SamplePhotoType } from '@/types/sampleCollection';
import { SampleBottlePhotos, SampleIntegrityBadge } from '@/app/pages/sample-collection/components/SampleIntegrityPanel';

interface TechnicianSampleCollectionPanelProps {
  appointmentId: string;
  initialSample?: SampleCollection | null;
  onUpdated?: () => void;
}

export function TechnicianSampleCollectionPanel({
  appointmentId,
  initialSample,
  onUpdated,
}: TechnicianSampleCollectionPanelProps) {
  const [sample, setSample] = useState<SampleCollection | null>(initialSample ?? null);
  const [isLoading, setIsLoading] = useState(!initialSample);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectionForm, setCollectionForm] = useState({
    sampleType: 'blood',
    tubesCount: '3',
    containerType: 'EDTA',
    fastingStatus: 'fasting',
    remarks: '',
  });
  const [handoverForm, setHandoverForm] = useState({
    handoverLocation: '',
    containerCount: '3',
    condition: 'good',
    remarks: '',
    labPartnerId: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoType, setPhotoType] = useState<SamplePhotoType>('container_label');

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sampleCollectionService.getByAppointment(appointmentId);
      setSample(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample collection');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialSample) void load();
    else setSample(initialSample);
  }, [appointmentId, initialSample]);

  const run = async (action: () => Promise<unknown>) => {
    setIsSaving(true);
    setError(null);
    try {
      await action();
      await load();
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsSaving(false);
    }
  };

  const withGeo = (): Promise<{ latitude: number; longitude: number } | undefined> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(undefined),
        { timeout: 5000 },
      );
    });

  const handleCollect = async (e: FormEvent) => {
    e.preventDefault();
    if (!sample) return;
    const geo = await withGeo();
    await run(() =>
      sampleCollectionService.technicianAction(sample.id, 'collect', {
        sampleType: collectionForm.sampleType,
        tubesCount: Number(collectionForm.tubesCount),
        containerType: collectionForm.containerType,
        fastingStatus: collectionForm.fastingStatus,
        remarks: collectionForm.remarks || undefined,
        ...geo,
      }),
    );
  };

  const handlePhoto = async () => {
    if (!sample || !photoFile) return;
    const geo = await withGeo();
    await run(() => sampleCollectionService.uploadPhoto(sample.id, photoFile, geo, photoType));
    setPhotoFile(null);
  };

  const handleHandover = async (e: FormEvent) => {
    e.preventDefault();
    if (!sample) return;
    await run(() =>
      sampleCollectionService.handover(sample.id, {
        handoverLocation: handoverForm.handoverLocation || undefined,
        containerCount: Number(handoverForm.containerCount),
        condition: handoverForm.condition,
        remarks: handoverForm.remarks || undefined,
        labPartnerId: handoverForm.labPartnerId || undefined,
      }),
    );
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading sample collection…</p>;
  }

  if (!sample) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          No sample collection record for this appointment.
        </CardContent>
      </Card>
    );
  }

  const status = sample.status.replace(/_/g, ' ');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sample collection workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono">
            {sample.sampleCode}
          </Badge>
          <Badge className="capitalize">{status}</Badge>
        </div>

        <SampleIntegrityBadge
          sampleCode={sample.sampleCode}
          patientName={sample.patientName}
          patientCode={sample.patientCode}
          qrVerificationCode={sample.qrVerificationCode}
        />

        {(sample.requestedTests?.length ?? 0) > 0 && (
          <div className="rounded-md border p-3 text-sm">
            <p className="mb-2 font-medium">Requested lab tests</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {sample.requestedTests?.map((test) => (
                <li key={test.labTestId}>
                  {test.name} ({test.code})
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Affix the LGSC ID and QR on the bottle, then upload clear photos of the label and QR.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={isSaving} onClick={() => void run(() => sampleCollectionService.technicianAction(sample.id, 'accept'))}>
            Accept
          </Button>
          <Button size="sm" disabled={isSaving} onClick={() => void run(() => sampleCollectionService.technicianAction(sample.id, 'travel-started'))}>
            Start travel
          </Button>
          <Button size="sm" disabled={isSaving} onClick={() => void run(() => sampleCollectionService.technicianAction(sample.id, 'reached'))}>
            Reached location
          </Button>
          <Button size="sm" disabled={isSaving} onClick={() => void run(() => sampleCollectionService.technicianAction(sample.id, 'start-collection'))}>
            Start collection
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isSaving}
            onClick={() => void run(() => sampleCollectionService.technicianAction(sample.id, 'failed', { reason: 'collection_failed' }))}
          >
            Mark failed
          </Button>
        </div>

        <form onSubmit={(e) => void handleCollect(e)} className="grid gap-2 rounded-md border p-3">
          <Label className="text-sm font-medium">Collection form</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Sample type"
              value={collectionForm.sampleType}
              onChange={(e) => setCollectionForm({ ...collectionForm, sampleType: e.target.value })}
            />
            <Input
              placeholder="Tubes count"
              value={collectionForm.tubesCount}
              onChange={(e) => setCollectionForm({ ...collectionForm, tubesCount: e.target.value })}
            />
            <Input
              placeholder="Container type"
              value={collectionForm.containerType}
              onChange={(e) => setCollectionForm({ ...collectionForm, containerType: e.target.value })}
            />
            <Input
              placeholder="Fasting status"
              value={collectionForm.fastingStatus}
              onChange={(e) => setCollectionForm({ ...collectionForm, fastingStatus: e.target.value })}
            />
          </div>
          <Textarea
            placeholder="Collection remarks"
            value={collectionForm.remarks}
            onChange={(e) => setCollectionForm({ ...collectionForm, remarks: e.target.value })}
            rows={2}
          />
          <Button type="submit" size="sm" disabled={isSaving}>
            Mark sample collected
          </Button>
        </form>

        <div className="space-y-2 rounded-md border p-3">
          <Label className="text-sm font-medium">Sample bottle photo</Label>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={photoType}
            onChange={(e) => setPhotoType(e.target.value as SamplePhotoType)}
          >
            <option value="container_label">Container label (LGSC ID)</option>
            <option value="container_qr">QR code on bottle</option>
          </select>
          <Input type="file" accept="image/*" capture="environment" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
          <Button size="sm" disabled={isSaving || !photoFile} onClick={() => void handlePhoto()}>
            Upload bottle photo
          </Button>
          <SampleBottlePhotos photos={sample.photos} emptyMessage="No photos uploaded yet." />
        </div>

        <form onSubmit={(e) => void handleHandover(e)} className="grid gap-2 rounded-md border p-3">
          <Label className="text-sm font-medium">Lab handover</Label>
          <Input
            placeholder="Handover location"
            value={handoverForm.handoverLocation}
            onChange={(e) => setHandoverForm({ ...handoverForm, handoverLocation: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Container count"
              value={handoverForm.containerCount}
              onChange={(e) => setHandoverForm({ ...handoverForm, containerCount: e.target.value })}
            />
            <Input
              placeholder="Condition"
              value={handoverForm.condition}
              onChange={(e) => setHandoverForm({ ...handoverForm, condition: e.target.value })}
            />
          </div>
          <Textarea
            placeholder="Handover remarks"
            value={handoverForm.remarks}
            onChange={(e) => setHandoverForm({ ...handoverForm, remarks: e.target.value })}
            rows={2}
          />
          <Button type="submit" size="sm" disabled={isSaving}>
            Hand over to lab
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
