import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { AppointmentTimeline } from '@/app/pages/appointments/components/AppointmentTimeline';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdminAppointmentsStore } from '@/store';

export function AdminAppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const selected = useAdminAppointmentsStore((s) => s.selected);
  const isLoading = useAdminAppointmentsStore((s) => s.isLoading);
  const isSaving = useAdminAppointmentsStore((s) => s.isSaving);
  const error = useAdminAppointmentsStore((s) => s.error);
  const loadDetail = useAdminAppointmentsStore((s) => s.loadDetail);
  const updateAppointment = useAdminAppointmentsStore((s) => s.updateAppointment);
  const cancelAppointment = useAdminAppointmentsStore((s) => s.cancelAppointment);
  const clearSelected = useAdminAppointmentsStore((s) => s.clearSelected);

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (id) void loadDetail(id);
    return () => clearSelected();
  }, [id, loadDetail, clearSelected]);

  useEffect(() => {
    if (!selected) return;
    setChiefComplaint(selected.chiefComplaint ?? '');
    setSymptoms(selected.symptoms ?? '');
    setPatientNotes(selected.patientNotes ?? '');
    setScheduledStart(selected.scheduledStart.slice(0, 16));
    setDoctorId(selected.doctorId ?? '');
    setTechnicianId(selected.technicianId ?? '');
  }, [selected]);

  const handleSave = async () => {
    if (!id) return;
    await updateAppointment(id, {
      chiefComplaint: chiefComplaint.trim() || null,
      symptoms: symptoms.trim() || null,
      patientNotes: patientNotes.trim() || null,
      scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : undefined,
      doctorId: doctorId.trim() || null,
      technicianId: technicianId.trim() || null,
    });
  };

  const handleCancel = async () => {
    if (!id || !cancelReason.trim()) return;
    await cancelAppointment(id, cancelReason.trim());
    navigate('/admin/operations?tab=appointments');
  };

  if (isLoading && !selected) {
    return <p className="text-sm text-muted-foreground">Loading appointment…</p>;
  }

  if (!selected) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Appointment not found.</p>
        <Button variant="outline" asChild>
          <Link to="/admin/operations?tab=appointments">Back to operations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/operations?tab=appointments" aria-label="Back">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <PageHeader
          title={selected.appointmentCode}
          description={`${selected.typeName} · ${selected.patientName}`}
        />
        <Badge variant="outline" className="capitalize ml-auto">
          {selected.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointment details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Patient</p>
                <Link to={`/patients/${selected.patientId}`} className="font-medium text-livotale-pink hover:underline">
                  {selected.patientName}
                </Link>
              </div>
              <div>
                <p className="text-muted-foreground">Visit mode</p>
                <p className="font-medium capitalize">{selected.visitMode}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Doctor</p>
                <p className="font-medium">{selected.doctorName ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Technician</p>
                <p className="font-medium">{selected.technicianName ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment</p>
                <p className="font-medium capitalize">{selected.paymentStatus ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit appointment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="admin-appt-start">Scheduled start</Label>
              <Input
                id="admin-appt-start"
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-appt-doctor">Doctor ID</Label>
              <Input id="admin-appt-doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="UUID" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-appt-tech">Technician ID</Label>
              <Input id="admin-appt-tech" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} placeholder="UUID" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-appt-complaint">Chief complaint</Label>
              <Textarea id="admin-appt-complaint" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-appt-symptoms">Symptoms</Label>
              <Textarea id="admin-appt-symptoms" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-appt-notes">Patient notes</Label>
              <Textarea id="admin-appt-notes" value={patientNotes} onChange={(e) => setPatientNotes(e.target.value)} rows={2} />
            </div>
            <Button disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {selected.timeline?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentTimeline events={[]} unifiedTimeline={selected.timeline} />
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Cancel appointment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              placeholder="Reason for cancellation"
            />
          </div>
          <Button variant="destructive" disabled={isSaving || cancelReason.trim().length < 3} onClick={() => void handleCancel()}>
            Cancel appointment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
