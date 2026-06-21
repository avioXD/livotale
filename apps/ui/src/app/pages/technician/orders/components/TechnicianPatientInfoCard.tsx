import { FiClock, FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatScanVisitSummary } from '@/services/liverCare/scanSchedule';
import type { TechnicianOrderDetail, TechnicianOrderVisit } from '@/types/fibrosisScan';

function formatVisitAddress(
  source: Pick<TechnicianOrderDetail, 'address' | 'city' | 'pincode'> | null | undefined,
): string {
  if (!source) return '';
  return [source.address, source.city, source.pincode].filter(Boolean).join(', ');
}

interface TechnicianPatientInfoCardProps {
  order: TechnicianOrderDetail;
  visit: TechnicianOrderVisit | null;
  patientEmail?: string | null;
}

export function TechnicianPatientInfoCard({
  order,
  visit,
  patientEmail,
}: TechnicianPatientInfoCardProps) {
  const address = formatVisitAddress(visit) || formatVisitAddress(order);
  const scheduleText =
    order.scanScheduledAt || order.scanPatientPreferredAt
      ? formatScanVisitSummary(order)
      : 'Not scheduled — contact operations';
  const email = patientEmail ?? visit?.patientEmail ?? '—';
  const mapsQuery = encodeURIComponent(address || order.patientName);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Patient & visit</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Patient</p>
          <p className="font-medium">{order.patientName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Visit time</p>
          <p className="font-medium">{scheduleText}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Contact number</p>
          <a
            href={`tel:${order.patientPhone.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-1.5 text-base font-semibold text-primary hover:underline"
          >
            <FiPhone className="h-4 w-4" aria-hidden />
            {order.patientPhone}
          </a>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          {email !== '—' ? (
            <a href={`mailto:${email}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              <FiMail className="h-3.5 w-3.5" aria-hidden />
              {email}
            </a>
          ) : (
            <p className="font-medium">—</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-muted-foreground">Address</p>
          {address ? (
            <a
              href={`https://maps.google.com/?q=${mapsQuery}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-start gap-2 text-base font-medium leading-relaxed text-primary hover:underline"
            >
              <FiMapPin className="mt-1 h-4 w-4 shrink-0" aria-hidden />
              {address}
            </a>
          ) : (
            <p className="text-base">Address on file — contact operations</p>
          )}
        </div>
        {!order.scanScheduledAt && !order.scanPatientPreferredAt && (
          <p className="sm:col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <FiClock className="h-3.5 w-3.5" aria-hidden />
            Home visit time not set yet — patient or operations can schedule after payment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
