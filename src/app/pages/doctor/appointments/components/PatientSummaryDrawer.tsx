import { Link } from 'react-router-dom';
import { FiExternalLink } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DoctorAppointmentDetail } from '@/types';

interface PatientSummaryDrawerProps {
  appointment: DoctorAppointmentDetail;
}

export function PatientSummaryDrawer({ appointment }: PatientSummaryDrawerProps) {
  const summary = appointment.patientSummary;
  const profileUrl = `/patients/${appointment.patientId}?tab=dashboard`;
  const reportsUrl = `/patients/${appointment.patientId}?tab=reports`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link to={profileUrl}>
            <FiExternalLink className="h-4 w-4" />
            Full profile
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={reportsUrl}>View reports</Link>
        </Button>
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
                <span className="text-muted-foreground">Latest FibroScan: </span>
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

      {appointment.fibroscanSnippets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent FibroScan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {appointment.fibroscanSnippets.map((row) => (
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
