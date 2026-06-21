import { FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STAFF_DOCUMENT_LABELS, type StaffComplianceDocument } from '@/types/staffProfile';

interface StaffDocumentPreviewModalProps {
  document: StaffComplianceDocument | null;
  onClose: () => void;
}

function isImageUrl(url: string) {
  return /^data:image\//i.test(url) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url);
}

function isPdfUrl(url: string) {
  return /^data:application\/pdf/i.test(url) || /\.pdf(\?|$)/i.test(url);
}

export function StaffDocumentPreviewModal({ document, onClose }: StaffDocumentPreviewModalProps) {
  if (!document?.storageUrl) return null;

  const title = STAFF_DOCUMENT_LABELS[document.documentType];
  const url = document.storageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-2 border-b py-4">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {[document.documentNumber, document.status].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close preview">
            <FiX className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-4">
          {isImageUrl(url) ? (
            <img src={url} alt={title} className="mx-auto max-h-[70vh] rounded-md border object-contain" />
          ) : isPdfUrl(url) ? (
            <iframe
              src={url}
              title={title}
              className="h-[min(70vh,640px)] w-full rounded-md border bg-muted"
            />
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">Preview not available for this file type.</p>
              <Button variant="outline" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  Open in new tab
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
