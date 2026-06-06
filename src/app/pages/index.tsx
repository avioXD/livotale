import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_TAGLINE } from '@/utils/constants';

interface PagePlaceholderProps {
  title: string;
  description: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This module will connect to the backend API via the class-based service layer.
        </p>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">{APP_TAGLINE}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Active Patients', value: '—', color: 'text-livotel-pink' },
          { label: 'Pending Reports', value: '—', color: 'text-livotel-teal' },
          { label: 'Home Visits Today', value: '—', color: 'text-livotel-pink' },
          { label: 'Prescriptions Awaiting', value: '—', color: 'text-livotel-teal' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className={stat.color}>{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ecosystem Overview</CardTitle>
          <CardDescription>End-to-end liver care workflow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. Technician collects FibroScan + blood samples at patient&apos;s home</p>
          <p>2. Reports uploaded into the app</p>
          <p>3. AI generates preliminary treatment plan</p>
          <p>4. Doctor verifies &amp; approves prescription</p>
          <p>5. Health coach + dietician provide structured follow-up</p>
          <p>6. Medicines &amp; supplements delivered at home</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function PatientsPage() {
  return (
    <PagePlaceholder
      title="Patients"
      description="Manage patient records, home visit schedules, and care journeys."
    />
  );
}

export function AppointmentsPage() {
  return (
    <PagePlaceholder
      title="Appointments"
      description="Schedule and track home visits, consultations, and follow-ups."
    />
  );
}

export function FibroScanPage() {
  return (
    <PagePlaceholder
      title="FibroScan"
      description="Upload and review FibroScan results collected during home visits."
    />
  );
}

export function ReportsPage() {
  return (
    <PagePlaceholder
      title="Reports"
      description="View lab reports, FibroScan summaries, and AI-generated insights."
    />
  );
}

export function TreatmentPlansPage() {
  return (
    <PagePlaceholder
      title="Treatment Plans"
      description="AI-generated preliminary plans pending doctor verification."
    />
  );
}

export function LabSamplesPage() {
  return (
    <PagePlaceholder
      title="Lab Samples"
      description="Track blood sample collection, chain of custody, and lab results."
    />
  );
}

export function PrescriptionsPage() {
  return (
    <PagePlaceholder
      title="Prescriptions"
      description="Doctor-approved prescriptions for medicines and supplements."
    />
  );
}

export function DeliveryPage() {
  return (
    <PagePlaceholder
      title="Home Delivery"
      description="Track medicine and supplement deliveries to patient homes."
    />
  );
}

export function CoachingPage() {
  return (
    <PagePlaceholder
      title="Health Coaching"
      description="Structured follow-up from health coaches and dieticians."
    />
  );
}

export function SettingsPage() {
  return (
    <PagePlaceholder
      title="Settings"
      description="Account preferences, notifications, and profile management."
    />
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-2xl font-bold">Page not found</h2>
      <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      <Link to="/dashboard" className="text-primary hover:underline">
        Go to Dashboard
      </Link>
    </div>
  );
}
