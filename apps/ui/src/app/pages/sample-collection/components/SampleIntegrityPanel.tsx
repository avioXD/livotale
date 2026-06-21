import { Badge } from '@/components/ui/badge';
import type { SamplePhoto } from '@/types/sampleCollection';

const PHOTO_LABELS: Record<string, string> = {
  container_label: 'Container label',
  container_qr: 'QR on bottle',
  lab_bottle_verification: 'Lab verification',
};

interface SampleBottlePhotosProps {
  photos?: SamplePhoto[];
  emptyMessage?: string;
}

export function SampleBottlePhotos({ photos = [], emptyMessage = 'No bottle photos yet.' }: SampleBottlePhotosProps) {
  if (photos.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {photos.map((photo) => (
        <li key={photo.id} className="overflow-hidden rounded-md border">
          {photo.storageUrl ? (
            <img
              src={photo.storageUrl}
              alt={PHOTO_LABELS[photo.photoType] ?? photo.photoType}
              className="h-36 w-full object-cover"
            />
          ) : (
            <div className="flex h-36 items-center justify-center bg-muted text-xs text-muted-foreground">
              Photo on file
            </div>
          )}
          <div className="flex items-center justify-between px-2 py-1.5">
            <Badge variant="outline" className="text-[10px]">
              {PHOTO_LABELS[photo.photoType] ?? photo.photoType}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {new Date(photo.createdAt).toLocaleString()}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface SampleIntegrityBadgeProps {
  sampleCode: string;
  patientName?: string | null;
  patientCode?: string | null;
  qrVerificationCode?: string | null;
}

export function SampleIntegrityBadge({
  sampleCode,
  patientName,
  patientCode,
  qrVerificationCode,
}: SampleIntegrityBadgeProps) {
  const qrPayload = qrVerificationCode
    ? `LGSC|${sampleCode}|${qrVerificationCode}`
    : sampleCode;

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="font-mono">{sampleCode}</Badge>
        {patientCode && <Badge variant="secondary">{patientCode}</Badge>}
      </div>
      <p className="font-medium">{patientName ?? 'Patient'}</p>
      {qrVerificationCode && (
        <>
          <p className="text-xs text-muted-foreground">
            Print this QR payload on the sample bottle to link blood to the correct patient.
          </p>
          <code className="block break-all rounded bg-background px-2 py-1 text-xs">{qrPayload}</code>
        </>
      )}
    </div>
  );
}
