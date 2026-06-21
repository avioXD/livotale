import { useSearchParams } from 'react-router-dom';
import { PublicEnquiryForm } from '@/app/pages/public/components/PublicEnquiryForm';

export function EnquirePage() {
  const [searchParams] = useSearchParams();
  const packageCode = searchParams.get('package') ?? '';

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enquire about Liver Fibrosis Scan</h1>
        <p className="text-muted-foreground">Our operations team will contact you within 24 hours.</p>
      </div>
      <PublicEnquiryForm variant="page" initialPackageCode={packageCode} />
    </div>
  );
}
