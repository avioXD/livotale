import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportPdfInfo } from '@/types';

interface ReportPdfViewerProps {
  pdf: ReportPdfInfo;
}

export function ReportPdfViewer({ pdf }: ReportPdfViewerProps) {
  const src = pdf.embeddable && pdf.storageUrl ? pdf.storageUrl : pdf.previewUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Original Document</CardTitle>
        <CardDescription>
          {pdf.fileName ?? 'Report PDF'}
          {!pdf.embeddable && ' · Preview uses sample PDF (mock storage URL)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {src ? (
          <div className="overflow-hidden rounded-lg border bg-muted/20">
            <iframe
              title={pdf.fileName ?? 'Report PDF'}
              src={src}
              className="h-[min(70vh,640px)] w-full"
            />
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">No PDF available for this report.</p>
        )}
      </CardContent>
    </Card>
  );
}
