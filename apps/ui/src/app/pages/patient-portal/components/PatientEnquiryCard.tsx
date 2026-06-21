import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PatientEnquiry } from '@/types/patientPortal';
import { enquiryMessagePreview, formatEnquiryDate } from '@/utils/patientEnquiryUtils';

interface PatientEnquiryCardProps {
  enquiry: PatientEnquiry;
  compact?: boolean;
}

export function PatientEnquiryCard({ enquiry, compact = false }: PatientEnquiryCardProps) {
  const preview = enquiryMessagePreview(enquiry.message);
  const packageLabel =
    enquiry.preferredPackageName ??
    (enquiry.preferredPackageCode ? enquiry.preferredPackageCode : 'General enquiry');

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{enquiry.enquiryNumber}</CardTitle>
            <p className="text-sm text-muted-foreground">{packageLabel}</p>
          </div>
          <StatusBadge
            status={enquiry.status}
            domain="enquiry"
            label={enquiry.patientStatusLabel}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Submitted {formatEnquiryDate(enquiry.enquiryAt)}</p>
        {!compact && preview && (
          <p className="text-sm text-muted-foreground">{preview}</p>
        )}
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {enquiry.orderId ? (
            <Button size="sm" asChild>
              <Link to={`/patient/orders/${enquiry.orderId}`}>View order</Link>
            </Button>
          ) : null}
          <Button size="sm" variant="outline" asChild>
            <Link to={`/patient/enquiries/${enquiry.id}`}>Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
