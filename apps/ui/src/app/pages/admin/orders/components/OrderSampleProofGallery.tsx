import { StatusBadge } from '@/components/common';
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

function ProofPhotoItem({ photo }: { photo: CollectionProofPhoto }) {
  return (
    <li className="rounded-md border px-3 py-2 text-sm">
      <p className="font-medium">{COLLECTION_PHOTO_LABELS[photo.photoType]}</p>
      {photo.storageUrl ? (
        <a
          href={photo.storageUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-livotale-pink hover:underline"
        >
          {photo.fileName || 'View proof'}
        </a>
      ) : (
        <p className="text-xs text-muted-foreground">{photo.fileName}</p>
      )}
    </li>
  );
}

export function OrderSampleProofGallery({ dispatch, orderNumber }: OrderSampleProofGalleryProps) {
  if (!dispatch || dispatch.status === 'not_required') return null;

  const photos = dispatch.collectionPhotos ?? [];
  if (photos.length === 0 && dispatch.status === 'pending_dispatch') return null;

  const { home, handover } = groupPhotos(photos);

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Lab partner collection</p>
        <StatusBadge
          status={dispatch.status}
          domain="sampleDispatch"
          label={SAMPLE_DISPATCH_LABELS[dispatch.status]}
        />
      </div>

      {dispatch.status === 'pending_dispatch' && (
        <p className="text-sm text-muted-foreground">
          Awaiting confirmed pathology schedule for order{' '}
          <span className="font-mono font-medium">{orderNumber}</span>. The lab partner collects at the
          scheduled visit.
        </p>
      )}

      {home.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Collection photos</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {home.map((photo) => (
              <ProofPhotoItem key={photo.id} photo={photo} />
            ))}
          </ul>
        </div>
      )}

      {handover.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lab handover</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {handover.map((photo) => (
              <ProofPhotoItem key={photo.id} photo={photo} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
