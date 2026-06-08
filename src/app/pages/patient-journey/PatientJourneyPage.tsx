import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useJourneyStore, JOURNEY_STEPS } from '@/store';
import type { JourneyStep } from '@/store/journey/journeyStore';

const STEP_LABELS: Record<JourneyStep, string> = {
  profile: 'Profile & Risk',
  symptoms: 'Symptoms',
  risk: 'Risk Assessment',
  reports: 'Reports',
  prescreen: 'AI Pre-Screen',
  booking: 'Book Visit',
  complete: 'Complete',
};

function QuestionnaireStep({
  title,
  description,
  questions,
  answers,
  onAnswer,
  onSubmit,
  isLoading,
}: {
  title: string;
  description: string;
  questions: Array<{ id: string; questionText: string; questionType: string; options: Array<{ value: string; label: string }> }>;
  answers: Record<string, string | boolean>;
  onAnswer: (questionId: string, answer: string | boolean) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="space-y-2 rounded-lg border p-3">
            <Label>{q.questionText}</Label>
            {q.questionType === 'boolean' ? (
              <div className="flex gap-2">
                <Button type="button" variant={answers[q.id] === true ? 'default' : 'outline'} size="sm" onClick={() => onAnswer(q.id, true)}>Yes</Button>
                <Button type="button" variant={answers[q.id] === false ? 'default' : 'outline'} size="sm" onClick={() => onAnswer(q.id, false)}>No</Button>
              </div>
            ) : (
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={String(answers[q.id] ?? '')}
                onChange={(e) => onAnswer(q.id, e.target.value)}
              >
                <option value="">Select...</option>
                {q.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
          </div>
        ))}
        <Button onClick={onSubmit} disabled={isLoading} className="w-full">
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
      </CardContent>
    </Card>
  );
}

export function PatientJourneyPage() {
  const navigate = useNavigate();
  const {
    step, journey, symptomsQuestionnaire, riskQuestionnaire,
    symptomsAnswers, riskAnswers, assessment, isLoading, error,
    setStep, loadJourney, loadQuestionnaires, setAnswer,
    submitProfile, submitSymptoms, submitRisk, uploadReport, runPreScreen, bookVisit, clearError,
  } = useJourneyStore();

  const [profile, setProfile] = useState({
    line1: '', line2: '', pincode: '', gender: 'undisclosed', dob: '',
    diabetes: false, hypertension: false, dyslipidemia: false, viralHepatitis: false,
    alcoholStatus: 'unknown', heightCm: '', weightKg: '',
  });
  const [visitDate, setVisitDate] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);

  useEffect(() => {
    void loadJourney();
    void loadQuestionnaires();
  }, [loadJourney, loadQuestionnaires]);

  const stepIndex = JOURNEY_STEPS.indexOf(step);
  const progress = useMemo(() => ((stepIndex + 1) / JOURNEY_STEPS.length) * 100, [stepIndex]);

  const defaultAddressId = journey?.addresses[0]?.id;

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    const height = profile.heightCm ? Number(profile.heightCm) : undefined;
    const weight = profile.weightKg ? Number(profile.weightKg) : undefined;
    const bmi = height && weight ? Number((weight / ((height / 100) ** 2)).toFixed(1)) : undefined;
    await submitProfile({
      address: { line1: profile.line1, line2: profile.line2 || undefined, pincode: profile.pincode || undefined },
      diabetes: profile.diabetes,
      hypertension: profile.hypertension,
      dyslipidemia: profile.dyslipidemia,
      viralHepatitis: profile.viralHepatitis,
      alcoholStatus: profile.alcoholStatus,
      heightCm: height,
      weightKg: weight,
      bmi,
      user: { gender: profile.gender, dob: profile.dob || undefined },
    });
  };

  const handleReportContinue = async () => {
    clearError();
    if (reportFile) {
      await uploadReport({
        fileName: reportFile.name,
        mimeType: reportFile.type || 'application/octet-stream',
        reportType: 'historical',
        notes: 'Uploaded during registration',
      });
    }
    setStep('prescreen');
  };

  const handleBookVisit = async (e: FormEvent) => {
    e.preventDefault();
    if (!defaultAddressId || !visitDate) return;
    clearError();
    await bookVisit({ addressId: defaultAddressId, scheduledAt: new Date(visitDate).toISOString(), visitType: 'initial' });
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 pb-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Your liver care setup</h1>
        <p className="text-sm text-muted-foreground">
          Complete these steps to schedule your home visit and begin care.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {stepIndex + 1} of {JOURNEY_STEPS.length}: {STEP_LABELS[step]}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      {step === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Profile & Risk Factors</CardTitle>
            <CardDescription>Address and clinical risk information for AI assessment.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleProfileSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="line1">Address</Label>
                <Input id="line1" value={profile.line1} onChange={(e) => setProfile({ ...profile, line1: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Line 2 (optional)" value={profile.line2} onChange={(e) => setProfile({ ...profile, line2: e.target.value })} />
                <Input placeholder="Pincode" value={profile.pincode} onChange={(e) => setProfile({ ...profile, pincode: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <select className="flex h-10 w-full rounded-md border px-3 text-sm" value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="undisclosed">Prefer not to say</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={profile.dob} onChange={(e) => setProfile({ ...profile, dob: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Height (cm)" value={profile.heightCm} onChange={(e) => setProfile({ ...profile, heightCm: e.target.value })} />
                <Input type="number" placeholder="Weight (kg)" value={profile.weightKg} onChange={(e) => setProfile({ ...profile, weightKg: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['diabetes', 'Type 2 Diabetes'],
                  ['hypertension', 'Hypertension'],
                  ['dyslipidemia', 'High Cholesterol'],
                  ['viralHepatitis', 'Viral Hepatitis History'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profile[key as keyof typeof profile] as boolean}
                      onChange={(e) => setProfile({ ...profile, [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Saving...' : 'Continue'}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 'symptoms' && symptomsQuestionnaire && (
        <QuestionnaireStep
          title="Liver Symptoms"
          description="Help us understand your current symptoms."
          questions={symptomsQuestionnaire.questions}
          answers={symptomsAnswers}
          onAnswer={(id, ans) => setAnswer('symptoms', id, ans)}
          onSubmit={() => void submitSymptoms()}
          isLoading={isLoading}
        />
      )}

      {step === 'risk' && riskQuestionnaire && (
        <QuestionnaireStep
          title="Risk Assessment"
          description="NAFLD and liver disease risk factors."
          questions={riskQuestionnaire.questions}
          answers={riskAnswers}
          onAnswer={(id, ans) => setAnswer('risk', id, ans)}
          onSubmit={() => void submitRisk()}
          isLoading={isLoading}
        />
      )}

      {step === 'reports' && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Reports (Optional)</CardTitle>
            <CardDescription>Upload historical lab or imaging reports. You can skip this step.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="file" multiple onChange={(e) => setReportFile(e.target.files?.[0] ?? null)} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('prescreen')}>Skip</Button>
              <Button onClick={() => void handleReportContinue()} disabled={isLoading}>
                {isLoading ? 'Uploading...' : 'Continue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'prescreen' && (
        <Card>
          <CardHeader>
            <CardTitle>AI Pre-Screening</CardTitle>
            <CardDescription>Generate your initial liver health assessment and care package recommendation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assessment ? (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Risk Score: {assessment.risk_score}</Badge>
                  <Badge>{assessment.risk_category}</Badge>
                </div>
                <p className="text-sm">{assessment.diagnosis_summary}</p>
                {assessment.package_name && <p className="text-sm font-medium">Recommended: {assessment.package_name}</p>}
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {assessment.recommendations?.map((r) => <li key={r.id}>{r.title}</li>)}
                </ul>
              </div>
            ) : (
              <Button onClick={() => void runPreScreen()} disabled={isLoading} className="w-full">
                {isLoading ? 'Running AI assessment...' : 'Run AI Pre-Screening'}
              </Button>
            )}
            {assessment && (
              <Button onClick={() => setStep('booking')} className="w-full">Continue to Home Visit Booking</Button>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'booking' && (
        <Card>
          <CardHeader>
            <CardTitle>Book Home Visit</CardTitle>
            <CardDescription>Schedule a technician visit for vitals, Liver Fibrosis Scan, and blood sample collection.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleBookVisit(e)} className="space-y-4">
              <div className="space-y-2">
                <Label>Visit Address</Label>
                <Textarea readOnly value={journey?.addresses[0] ? `${journey.addresses[0].line1}, ${journey.addresses[0].pincode ?? ''}` : 'Complete profile first'} />
              </div>
              <div className="space-y-2">
                <Label>Preferred Date & Time</Label>
                <Input type="datetime-local" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !defaultAddressId}>
                {isLoading ? 'Booking...' : 'Book Home Visit'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle>Journey Step Complete</CardTitle>
            <CardDescription>
              Status: <Badge>{journey?.patient.journey_status ?? 'registered'}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your home visit is booked. A technician will collect vitals, Liver Fibrosis Scan, and blood samples.
              After lab reports are uploaded, an AI draft prescription will be generated for doctor review.
            </p>
            {journey?.visits[0] && (
              <p className="text-sm">Next visit: {new Date(journey.visits[0].scheduled_at).toLocaleString()}</p>
            )}
            <Button onClick={() => navigate('/dashboard')}>Enter app</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
