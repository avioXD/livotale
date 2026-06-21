import { useEffect, useState } from 'react';
import { FiDownload, FiFileText } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { appointmentsService } from '@/services';
import type { AppointmentPrescription, PrescriptionPdfInfo } from '@/types';

interface AppointmentPrescriptionCardProps {
  appointmentId: string;
  showSection: boolean;
}

export function AppointmentPrescriptionCard({ appointmentId, showSection }: AppointmentPrescriptionCardProps) {
  const [prescription, setPrescription] = useState<AppointmentPrescription | null>(null);
  const [pdf, setPdf] = useState<PrescriptionPdfInfo | null>(null);
  const [pending, setPending] = useState(false);
  const [notReady, setNotReady] = useState(false);

  useEffect(() => {
    if (!showSection) {
      setPrescription(null);
      setPdf(null);
      setNotReady(false);
      return;
    }

    let cancelled = false;
    setPending(true);
    setNotReady(false);

    void (async () => {
      try {
        const rx = await appointmentsService.getPrescription(appointmentId);
        if (cancelled) return;
        setPrescription(rx);
        try {
          const pdfInfo = await appointmentsService.getPrescriptionPdf(appointmentId);
          if (!cancelled) setPdf(pdfInfo);
        } catch {
          if (!cancelled) setPdf(null);
        }
      } catch {
        if (!cancelled) {
          setPrescription(null);
          setPdf(null);
          setNotReady(true);
        }
      } finally {
        if (!cancelled) setPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appointmentId, showSection]);

  if (!showSection) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FiFileText className="h-4 w-4" />
          Prescription
        </CardTitle>
        <CardDescription>Available after your doctor approves the final prescription.</CardDescription>
      </CardHeader>
      <CardContent>
        {pending && <p className="text-sm text-muted-foreground">Checking prescription…</p>}
        {!pending && notReady && (
          <p className="text-sm text-muted-foreground">Your prescription is not ready yet. Check back after your consultation.</p>
        )}
        {!pending && prescription && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Approved</Badge>
              {prescription.prescriptionNumber && (
                <span className="text-sm text-muted-foreground">{prescription.prescriptionNumber}</span>
              )}
            </div>
            {prescription.diagnosis && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diagnosis</p>
                <p className="mt-1 text-sm">{prescription.diagnosis}</p>
              </div>
            )}
            {prescription.items?.length > 0 && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {prescription.items.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    {item.name}
                    {item.dosage ? ` · ${item.dosage}` : ''}
                    {item.frequency ? ` · ${item.frequency}` : ''}
                  </li>
                ))}
              </ul>
            )}
            {pdf && (
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={pdf.downloadUrl} target="_blank" rel="noreferrer">
                  <FiDownload className="h-4 w-4" />
                  Download PDF
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
