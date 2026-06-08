import { PageHeader } from '@/components/common/PageHeader';
import { DoctorPatientsPanel } from '@/app/pages/doctor/consultations/components/DoctorPatientsPanel';

export function DoctorPatientsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My patients"
        description="Patients assigned to you through liver care consultation orders."
      />
      <DoctorPatientsPanel />
    </div>
  );
}
