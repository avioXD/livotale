import { FiClock, FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatScanVisitSummary } from '@/services/liverCare/scanSchedule';
import type { LiverCareOrder } from '@/types/serviceOrder';
import type { TechnicianOrderVisit } from '@/types/fibrosisScan';

interface TechnicianPatientInfoCardProps {
  order: LiverCareOrder;
  visit: TechnicianOrderVisit | null;
  patientEmail?: string | null;
}

export function TechnicianPatientInfoCard({ order, visit, patientEmail }: TechnicianPatientInfoCardProps) {
  const address = [visit?.address, visit?.city, visit?.pincode].filter(Boolean).join(', ');
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
          <p className="text-xs text-muted-foreground">Visit time</p>
          <p className="font-medium">{scheduleText}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Phone</p>
          <a href={`tel:${order.patientPhone}`} className="font-medium text-primary hover:underline">
            {order.patientPhone}
          </a>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          {email !== '—' ? (
            <a href={`mailto:${email}`} className="font-medium text-primary hover:underline">
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
              className="inline-flex items-start gap-1.5 font-medium text-primary hover:underline"
            >
              <FiMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {address}
            </a>
          ) : (
            <p>Address on file — contact operations</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
