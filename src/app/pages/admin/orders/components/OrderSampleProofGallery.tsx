import { Badge } from '@/components/ui/badge';
import {
  COLLECTION_PHOTO_LABELS,
  type CollectionProofPhoto,
  type SampleDispatch,
} from '@/types/sampleDispatch';
import { SAMPLE_DISPATCH_LABELS } from '@/types/sampleDispatch';

interface OrderSampleProofGalleryProps {
  dispatch: SampleDispatch | null;
  orderNumber: string;
}

function groupPhotos(photos: CollectionProofPhoto[]) {
  const home = photos.filter((p) => p.photoType !== 'lab_handover');
  const handover = photos.filter((p) => p.photoType === 'lab_handover');
  return { home, handover };
}

export function OrderSampleProofGallery({ dispatch, orderNumber }: OrderSampleProofGalleryProps) {
  if (!dispatch || dispatch.status === 'not_required') return null;

  const photos = dispatch.collectionPhotos ?? [];
  const { home, handover } = groupPhotos(photos);

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Blood sample — collection & handover</p>
        <Badge variant="outline">{SAMPLE_DISPATCH_LABELS[dispatch.status]}</Badge>
      </div>

      {dispatch.status === 'pending_dispatch' && (
        <p className="text-sm text-muted-foreground">
          Awaiting technician home collection for order{' '}
          <span className="font-mono font-medium">{orderNumber}</span> (tube photos + technician photo).
        </p>
      )}

      {home.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Home collection photos
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {home.map((photo) => (
              <ProofPhotoTile key={photo.id} photo={photo} />
            ))}
          </ul>
        </div>
      )}

      {dispatch.collectedAt && (
        <p className="text-xs text-muted-foreground">
          Collected at home {new Date(dispatch.collectedAt).toLocaleString()}
          {dispatch.collectedBy ? ` · ${dispatch.collectedBy}` : ''}
        </p>
      )}

      {handover.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lab handover photo
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {handover.map((photo) => (
              <ProofPhotoTile key={photo.id} photo={photo} />
            ))}
          </ul>
        </div>
      )}

      {dispatch.dispatchedAt && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          Handed over to {dispatch.partnerLabName}{' '}
          {new Date(dispatch.dispatchedAt).toLocaleString()}
          {dispatch.courierRef ? ` · Ref ${dispatch.courierRef}` : ''}
        </p>
      )}
    </div>
  );
}

function ProofPhotoTile({ photo }: { photo: CollectionProofPhoto }) {
  return (
    <li className="overflow-hidden rounded-md border">
      {photo.storageUrl ? (
        <img
          src={photo.storageUrl}
          alt={COLLECTION_PHOTO_LABELS[photo.photoType]}
          className="h-36 w-full object-cover"
        />
      ) : (
        <div className="flex h-36 items-center justify-center bg-muted text-xs text-muted-foreground">
          {photo.fileName}
        </div>
      )}
      <div className="flex items-center justify-between px-2 py-1.5">
        <Badge variant="outline" className="text-[10px]">
          {COLLECTION_PHOTO_LABELS[photo.photoType]}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {new Date(photo.createdAt).toLocaleString()}
        </span>
      </div>
    </li>
  );
}
