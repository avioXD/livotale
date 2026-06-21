import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardErrorState, StatusBadge } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { patientPortalService } from '@/services/liverCare';
import { usePatientPortalStore } from '@/store';
import type { PatientEnquiry } from '@/types/patientPortal';
import { formatEnquiryDate } from '@/utils/patientEnquiryUtils';

export function PatientEnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = usePatientPortalStore((s) => s.session)!;
  const [enquiry, setEnquiry] = useState<PatientEnquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    void patientPortalService
      .getMyEnquiry(session.phone, id)
      .then((row) => {
        setEnquiry(row);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load enquiry');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, [session.phone, id]);

  if (loading) {
    return <p className="text-muted-foreground">Loading enquiry…</p>;
  }

  if (error || !enquiry) {
    return (
      <DashboardErrorState
        message={error ?? 'Enquiry not found'}
        onRetry={load}
        title="Could not load enquiry"
      />
    );
  }

  const packageLabel =
    enquiry.preferredPackageName ??
    (enquiry.preferredPackageCode ? enquiry.preferredPackageCode : 'General enquiry');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{enquiry.enquiryNumber}</h1>
          <p className="text-muted-foreground">Enquiry submitted {formatEnquiryDate(enquiry.enquiryAt)}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/patient/orders#enquiries">Back to orders</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Status</CardTitle>
            <StatusBadge
              status={enquiry.status}
              domain="enquiry"
              label={enquiry.patientStatusLabel}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">Preferred package</p>
            <p>{packageLabel}</p>
          </div>
          {enquiry.message?.trim() ? (
            <div>
              <p className="font-medium text-muted-foreground">Your message</p>
              <p className="whitespace-pre-wrap">{enquiry.message.trim()}</p>
            </div>
          ) : null}
          {enquiry.orderId ? (
            <div className="border-t pt-4">
              <p className="mb-2 text-muted-foreground">
                This enquiry was converted to order {enquiry.orderNumber ?? ''}.
              </p>
              <Button asChild>
                <Link to={`/patient/orders/${enquiry.orderId}`}>View order</Link>
              </Button>
            </div>
          ) : (
            <p className="border-t pt-4 text-muted-foreground">
              Our team will contact you within 24 hours. You can track updates here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
