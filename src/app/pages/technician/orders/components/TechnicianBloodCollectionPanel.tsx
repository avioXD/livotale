import { useEffect, useRef, useState } from 'react';
import { FiCamera, FiCheck, FiDroplet, FiTruck } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pathologyService } from '@/services/liverCare';
import type { PartnerLab } from '@/types/partnerLab';
import type { BloodCollectionTiming } from '@/types/package';
import type { LiverCareOrder } from '@/types/serviceOrder';
import {
  COLLECTION_PHOTO_LABELS,
  type CollectionProofPhoto,
  type CollectionProofPhotoType,
  type SampleDispatch,
} from '@/types/sampleDispatch';
import { SAMPLE_DISPATCH_LABELS } from '@/types/sampleDispatch';
import { cn } from '@/utils';

interface TechnicianBloodCollectionPanelProps {
  order: LiverCareOrder;
  pathologyRequired: boolean;
  visitReady: boolean;
  bloodCollectionTiming?: BloodCollectionTiming | null;
  onUpdated: () => void;
}

function timingHint(timing?: BloodCollectionTiming | null): string {
  if (timing === 'before_scan') {
    return 'This order: collect blood before the fibrosis scan.';
  }
  if (timing === 'after_scan') {
    return 'This order: complete the fibrosis scan first, then collect blood at the same visit.';
  }
  return 'Collect blood during this visit as coordinated with the patient.';
}

function photoForType(photos: CollectionProofPhoto[], type: CollectionProofPhotoType) {
  return photos.filter((p) => p.photoType === type);
}

function PhotoUploadSlot({
  label,
  description,
  photos,
  capture,
  disabled,
  acting,
  onUpload,
}: {
  label: string;
  description: string;
  photos: CollectionProofPhoto[];
  capture?: 'user' | 'environment';
  disabled?: boolean;
  acting?: boolean;
  onUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const latest = photos[photos.length - 1];

  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {latest && (
          <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
            <FiCheck className="h-3 w-3" aria-hidden />
            Uploaded
          </Badge>
        )}
      </div>
      {latest?.storageUrl && (
        <img
          src={latest.storageUrl}
          alt={label}
          className="mt-3 h-28 w-full rounded-md object-cover sm:h-32"
        />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture={capture}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          if (fileRef.current) fileRef.current.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 w-full gap-2 sm:w-auto"
        disabled={disabled || acting}
        onClick={() => fileRef.current?.click()}
      >
        <FiCamera className="h-4 w-4" aria-hidden />
        {latest ? 'Replace photo' : 'Take / upload photo'}
      </Button>
    </div>
  );
}

export function TechnicianBloodCollectionPanel({
  order,
  pathologyRequired,
  visitReady,
  bloodCollectionTiming,
  onUpdated,
}: TechnicianBloodCollectionPanelProps) {
  const [dispatch, setDispatch] = useState<SampleDispatch | null>(null);
  const [partnerLabs, setPartnerLabs] = useState<PartnerLab[]>([]);
  const [selectedLabId, setSelectedLabId] = useState(order.partnerLabId ?? '');
  const [courierRef, setCourierRef] = useState('');
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const [d, labs] = await Promise.all([
      pathologyService.getSampleDispatch(order.id),
      pathologyService.listPartnerLabsForTechnician(),
    ]);
    setDispatch(d);
    setPartnerLabs(labs);
    if (d?.partnerLabId) setSelectedLabId(d.partnerLabId);
    else if (order.partnerLabId) setSelectedLabId(order.partnerLabId);
  };

  useEffect(() => {
    if (!pathologyRequired) return;
    void reload();
  }, [order.id, pathologyRequired, order.partnerLabId]);

  if (!pathologyRequired) return null;

  const run = async (action: () => Promise<SampleDispatch>) => {
    setActing(true);
    setError(null);
    try {
      const d = await action();
      setDispatch(d);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const uploadPhoto = (photoType: CollectionProofPhotoType, file: File) => {
    void run(() =>
      pathologyService.uploadCollectionProof(order.id, {
        fileName: file.name,
        photoType,
        orderLabelVerified: photoType === 'order_id_label' ? true : undefined,
      }),
    );
  };

  const photos = dispatch?.collectionPhotos ?? [];
  const hasTubeProof = photos.some((p) => p.photoType === 'order_id_label' || p.photoType === 'sample_tube');
  const hasTechnicianPhoto = photos.some((p) => p.photoType === 'technician_collector');
  const hasHandoverPhoto = photos.some((p) => p.photoType === 'lab_handover');
  const canConfirmCollected = hasTubeProof && hasTechnicianPhoto;

  const step1Done = dispatch?.status !== 'pending_dispatch';
  const step2Done = dispatch != null && !['pending_dispatch', 'sample_collected'].includes(dispatch.status);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FiDroplet className="h-4 w-4 text-rose-500" aria-hidden />
            Blood sample — home collection & lab handover
          </CardTitle>
          {dispatch && <Badge variant="outline">{SAMPLE_DISPATCH_LABELS[dispatch.status]}</Badge>}
        </div>
        <CardDescription>
          Order <span className="font-mono font-medium">{order.orderNumber}</span> is the ID on every tube.
          {timingHint(bloodCollectionTiming)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {!visitReady && (
          <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            Mark &quot;reached location&quot; before collecting blood.
          </p>
        )}

        {/* Step 1 — At patient home */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                step1Done ? 'bg-emerald-100 text-emerald-800' : 'bg-livotale-pink/15 text-livotale-pink',
              )}
            >
              1
            </span>
            <p className="font-medium">At patient home — collect & photograph</p>
          </div>

          {visitReady && dispatch?.status === 'pending_dispatch' && (
            <div className="space-y-3 rounded-md border bg-muted/20 p-4">
              <p className="text-xs text-amber-900 dark:text-amber-200">
                Label all tubes with <span className="font-mono font-semibold">{order.orderNumber}</span>, draw
                blood, then upload the three photos below.
              </p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <PhotoUploadSlot
                  label={COLLECTION_PHOTO_LABELS.order_id_label}
                  description="Close-up showing order ID written on the tube label"
                  photos={photoForType(photos, 'order_id_label')}
                  capture="environment"
                  disabled={!visitReady}
                  acting={acting}
                  onUpload={(f) => uploadPhoto('order_id_label', f)}
                />
                <PhotoUploadSlot
                  label={COLLECTION_PHOTO_LABELS.sample_tube}
                  description="All sample tubes sealed and ready for transport"
                  photos={photoForType(photos, 'sample_tube')}
                  capture="environment"
                  disabled={!visitReady}
                  acting={acting}
                  onUpload={(f) => uploadPhoto('sample_tube', f)}
                />
                <PhotoUploadSlot
                  label={COLLECTION_PHOTO_LABELS.technician_collector}
                  description="Your photo holding the samples — confirms who collected"
                  photos={photoForType(photos, 'technician_collector')}
                  capture="user"
                  disabled={!visitReady}
                  acting={acting}
                  onUpload={(f) => uploadPhoto('technician_collector', f)}
                />
              </div>
              <Button
                size="sm"
                className="w-full sm:w-auto"
                disabled={acting || !canConfirmCollected}
                onClick={() => run(() => pathologyService.markSampleCollected(order.id, 'technician'))}
              >
                Confirm sample collected at home
              </Button>
              {!canConfirmCollected && photos.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Upload tube label, sample tubes, and technician photo to continue.
                </p>
              )}
            </div>
          )}

          {step1Done && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Home collection confirmed
              {dispatch?.collectedAt ? ` · ${new Date(dispatch.collectedAt).toLocaleString()}` : ''}
            </p>
          )}
        </section>

        {/* Step 2 — At lab */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                step2Done ? 'bg-emerald-100 text-emerald-800' : step1Done ? 'bg-livotale-pink/15 text-livotale-pink' : 'bg-muted text-muted-foreground',
              )}
            >
              2
            </span>
            <p className="font-medium">At lab partner — hand over & photograph</p>
          </div>

          {dispatch?.status === 'sample_collected' && (
            <div className="space-y-4 rounded-md border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/20">
              <p className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-200">
                <FiTruck className="h-4 w-4 shrink-0" aria-hidden />
                Deliver samples to the lab, select the partner, then photograph the handover.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="submit-lab">Lab partner</Label>
                  <select
                    id="submit-lab"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedLabId}
                    onChange={(e) => setSelectedLabId(e.target.value)}
                  >
                    <option value="">Select lab partner…</option>
                    {partnerLabs.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} — {l.city}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="courier-ref">Handover ref (optional)</Label>
                  <Input
                    id="courier-ref"
                    value={courierRef}
                    onChange={(e) => setCourierRef(e.target.value)}
                    placeholder="Receipt / counter ref"
                  />
                </div>
              </div>

              <PhotoUploadSlot
                label={COLLECTION_PHOTO_LABELS.lab_handover}
                description="Photo at the lab showing samples handed over (counter, receipt, or staff)"
                photos={photoForType(photos, 'lab_handover')}
                capture="environment"
                disabled={!selectedLabId}
                acting={acting}
                onUpload={(f) => uploadPhoto('lab_handover', f)}
              />

              <Button
                size="sm"
                className="w-full sm:w-auto"
                disabled={acting || !selectedLabId || !hasHandoverPhoto}
                onClick={() =>
                  run(() =>
                    pathologyService.technicianSubmitSampleToLab(
                      order.id,
                      selectedLabId,
                      'technician',
                      courierRef || undefined,
                    ),
                  )
                }
              >
                Confirm handed over to lab
              </Button>
            </div>
          )}

          {step2Done && dispatch && (
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              Handed over to <strong>{dispatch.partnerLabName}</strong>
              {dispatch.dispatchedAt ? ` · ${new Date(dispatch.dispatchedAt).toLocaleString()}` : ''}
            </p>
          )}
        </section>

        {step1Done && photos.length > 0 && dispatch?.status !== 'pending_dispatch' && (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {photos.map((photo) => (
              <li key={photo.id} className="overflow-hidden rounded-md border">
                {photo.storageUrl && (
                  <img src={photo.storageUrl} alt={COLLECTION_PHOTO_LABELS[photo.photoType]} className="h-20 w-full object-cover" />
                )}
                <p className="px-2 py-1 text-[10px] text-muted-foreground">
                  {COLLECTION_PHOTO_LABELS[photo.photoType]}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
