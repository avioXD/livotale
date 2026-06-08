import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function EnquireThanksPage() {
  const [searchParams] = useSearchParams();
  const enquiryNumber = searchParams.get('number') ?? 'your enquiry';

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div className="rounded-full bg-green-100 p-4 text-4xl">✓</div>
      <h1 className="text-2xl font-bold">Thank you!</h1>
      <p className="text-muted-foreground">
        Your enquiry <strong>{enquiryNumber}</strong> has been received. Our team will call you shortly.
      </p>
      <div className="flex flex-col gap-2">
        <Button asChild>
          <Link to="/packages">View packages</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/login">Staff login</Link>
        </Button>
      </div>
    </div>
  );
}
