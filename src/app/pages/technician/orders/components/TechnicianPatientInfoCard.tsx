import { FiClock, FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComorbiditySummary } from '@/app/pages/shared/components/PatientIntakeSummary';
import { formatScanVisitSummary } from '@/services/liverCare/scanSchedule';
import type { TechnicianOrderDetail, TechnicianOrderVisit } from '@/types/fibrosisScan';
import type { ScanPatientIntake } from '@/types/scanPatientIntake';

const SEX_LABELS = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
} as const;

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
  intake?: ScanPatientIntake | null;
}

export function TechnicianPatientInfoCard({
  order,
  visit,
  patientEmail,
  intake,
}: TechnicianPatientInfoCardProps) {
  const address = formatVisitAddress(visit) || formatVisitAddress(order);
  const scheduleText =
    order.scanScheduledAt || order.scanPatientPreferredAt
      ? formatScanVisitSummary(order)
      : 'Not scheduled — contact operations';
  const email = patientEmail ?? visit?.patientEmail ?? '—';
  const mapsQuery = encodeURIComponent(address || order.patientName);
  const clinical =
    intake &&
    (intake.technicianVerifiedAt ||
      intake.operatorEnteredAt ||
      intake.name ||
      intake.age > 0)
      ? intake
      : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Patient & visit</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Patient</p>
          <p className="font-medium">{clinical?.name ?? order.patientName}</p>
          {clinical && (
            <p className="text-xs text-muted-foreground">
              {SEX_LABELS[clinical.sex]} · {clinical.age} years
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Visit time</p>
          <p className="font-medium">{scheduleText}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Phone</p>
          <a
            href={`tel:${clinical?.phone ?? order.patientPhone}`}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <FiPhone className="h-3.5 w-3.5" aria-hidden />
            {clinical?.phone ?? order.patientPhone}
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
        {clinical && (clinical.weightKg != null || clinical.heightMeters != null) && (
          <div>
            <p className="text-xs text-muted-foreground">Anthropometrics</p>
            <p className="font-medium">
              {clinical.weightKg != null ? `${clinical.weightKg} kg` : '—'}
              {clinical.heightMeters != null ? ` · ${clinical.heightMeters} m` : ''}
            </p>
          </div>
        )}
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
        {clinical && (
          <div className="sm:col-span-2">
            <ComorbiditySummary value={clinical.comorbidities} />
          </div>
        )}
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
