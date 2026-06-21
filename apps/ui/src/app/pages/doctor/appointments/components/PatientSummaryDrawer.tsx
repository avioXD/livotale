import { Link } from 'react-router-dom';
import { FiExternalLink } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DoctorAppointmentDetail } from '@/types';
import { orgPath } from '@/app/config/orgRoutes';

interface PatientSummaryDrawerProps {
  appointment: DoctorAppointmentDetail;
}

export function PatientSummaryDrawer({ appointment }: PatientSummaryDrawerProps) {
  const summary = appointment.patientSummary;
  const pid = appointment.patientId;
  const links = [
    { label: 'Profile', path: orgPath(`/patients/${pid}?tab=profile`) },
    { label: 'Orders', path: orgPath(`/patients/${pid}?tab=orders`) },
    { label: 'Payments', path: orgPath(`/patients/${pid}?tab=payments`) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link to={orgPath(`/patients/${pid}?tab=profile`)}>
            <FiExternalLink className="h-4 w-4" />
            Open patient
          </Link>
        </Button>
        {links.map((l) => (
          <Button key={l.label} variant="outline" size="sm" asChild>
            <Link to={l.path}>{l.label}</Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patient summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Patient: </span>
            {appointment.patientName}
            {appointment.patientCode ? ` · ${appointment.patientCode}` : ''}
          </p>
          {summary && (
            <>
              <p>
                <span className="text-muted-foreground">Risk score: </span>
                {summary.risk_score ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Latest Liver Fibrosis Scan: </span>
                {summary.latest_fibroscan_kpa != null ? `${summary.latest_fibroscan_kpa} kPa` : '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Latest SGPT: </span>
                {summary.latest_sgpt ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Journey: </span>
                {summary.journey_status ?? '—'}
              </p>
            </>
          )}
          {appointment.chiefComplaint && (
            <p>
              <span className="text-muted-foreground">Chief complaint: </span>
              {appointment.chiefComplaint}
            </p>
          )}
        </CardContent>
      </Card>

      {appointment.liverFibrosisScanSnippets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Liver Fibrosis Scan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {appointment.liverFibrosisScanSnippets.map((row) => (
              <div key={row.id} className="rounded-md border px-3 py-2">
                <p>{row.liver_stiffness_kpa} kPa · Stage {row.fibrosis_stage}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(row.recorded_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {appointment.labSnippets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent labs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {appointment.labSnippets.map((row) => (
              <div key={row.id} className="rounded-md border px-3 py-2">
                <p>
                  {row.test_name}: {row.result_value ?? '—'} {row.unit ?? ''}
                  {row.flag ? ` (${row.flag})` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.recorded_at ? new Date(row.recorded_at).toLocaleDateString() : 'Pending'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
