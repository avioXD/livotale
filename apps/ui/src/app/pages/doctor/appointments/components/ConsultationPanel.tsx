import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DoctorAppointmentDetail } from '@/types';

interface ConsultationPanelProps {
  appointment: DoctorAppointmentDetail;
  isSaving: boolean;
  onStart: () => Promise<void>;
  onComplete: (summary: string) => Promise<void>;
  onNoShow: (reason: string) => Promise<void>;
  onRequestReschedule: (reason: string) => Promise<void>;
  onSaveClinicalData: (payload: Record<string, unknown>) => Promise<void>;
}

export function ConsultationPanel({
  appointment,
  isSaving,
  onStart,
  onComplete,
  onNoShow,
  onRequestReschedule,
  onSaveClinicalData,
}: ConsultationPanelProps) {
  const [summary, setSummary] = useState('');
  const [reason, setReason] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState(appointment.chiefComplaint ?? '');
  const [symptoms, setSymptoms] = useState(appointment.symptoms ?? '');
  const [patientNotes, setPatientNotes] = useState(appointment.patientNotes ?? '');

  useEffect(() => {
    setChiefComplaint(appointment.chiefComplaint ?? '');
    setSymptoms(appointment.symptoms ?? '');
    setPatientNotes(appointment.patientNotes ?? '');
  }, [appointment]);

  const handleSaveClinical = async () => {
    await onSaveClinicalData({
      chiefComplaint: chiefComplaint.trim() || null,
      symptoms: symptoms.trim() || null,
      patientNotes: patientNotes.trim() || null,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patient data for this visit</CardTitle>
          <CardDescription>
            Update chief complaint and symptoms before generating the prescription.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="doctor-chief-complaint">Chief complaint</Label>
            <Textarea
              id="doctor-chief-complaint"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="doctor-symptoms">Symptoms</Label>
            <Textarea
              id="doctor-symptoms"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="doctor-patient-notes">Patient notes</Label>
            <Textarea
              id="doctor-patient-notes"
              value={patientNotes}
              onChange={(e) => setPatientNotes(e.target.value)}
              rows={2}
            />
          </div>
          <Button variant="secondary" disabled={isSaving} onClick={() => void handleSaveClinical()}>
            {isSaving ? 'Saving…' : 'Save patient data'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consultation actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {appointment.canStartConsultation && (
            <Button disabled={isSaving} onClick={() => void onStart()}>
              Start consultation
            </Button>
          )}

          {appointment.canComplete && (
            <div className="space-y-2">
              <Label htmlFor="consult-summary">Completion summary</Label>
              <Textarea
                id="consult-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                placeholder="Brief consultation summary for internal records"
              />
              <Button disabled={isSaving || summary.trim().length < 3} onClick={() => void onComplete(summary.trim())}>
                Mark completed
              </Button>
            </div>
          )}

          {appointment.canMarkNoShow && (
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="no-show-reason">No-show reason</Label>
              <Textarea
                id="no-show-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={isSaving || reason.trim().length < 3}
                  onClick={() => void onNoShow(reason.trim())}
                >
                  Mark no-show
                </Button>
                <Button
                  variant="outline"
                  disabled={isSaving || reason.trim().length < 3}
                  onClick={() => void onRequestReschedule(reason.trim())}
                >
                  Request reschedule
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
