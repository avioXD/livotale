import { Route, Routes } from 'react-router-dom';
import { AdminShell } from '@/app/layouts/AdminShell';
import { OnboardingShell } from '@/app/layouts/OnboardingShell';
import { ProtectedRoute, PublicRoute } from '@/app/routes/ProtectedRoute';
import { PatientOnboardingRoute } from '@/app/routes/PatientOnboardingRoute';
import { PostAuthRedirect } from '@/app/routes/PostAuthRedirect';
import { LoginPage } from '@/app/pages/auth/LoginPage';
import { RegisterPage } from '@/app/pages/auth/RegisterPage';
import { ResetPasswordPage } from '@/app/pages/auth/ResetPasswordPage';
import { DashboardPage } from '@/app/pages/dashboard/DashboardPage';
import { PatientsPage } from '@/app/pages/patients/PatientsPage';
import { PatientDetailPage } from '@/app/pages/patients/PatientDetailPage';
import { AppointmentsPage } from '@/app/pages/appointments/AppointmentsPage';
import { AppointmentDetailPage } from '@/app/pages/appointments/AppointmentDetailPage';
import { BookAppointmentWizardPage } from '@/app/pages/appointments/BookAppointmentWizardPage';
import { TechnicianTrackingPage } from '@/app/pages/appointments/TechnicianTrackingPage';
import { TechnicianSchedulePage } from '@/app/pages/technician/schedule/TechnicianSchedulePage';
import { TechnicianVisitDetailPage } from '@/app/pages/technician/schedule/TechnicianVisitDetailPage';
import { DoctorAppointmentsPage } from '@/app/pages/doctor/appointments/DoctorAppointmentsPage';
import { AdminAppointmentsDashboardPage } from '@/app/pages/admin/appointments/AdminAppointmentsDashboardPage';
import { RouteMonitoringPage } from '@/app/pages/admin/appointments/RouteMonitoringPage';
import { MissedAppointmentsPage } from '@/app/pages/admin/appointments/MissedAppointmentsPage';
import { NotificationLogPage } from '@/app/pages/admin/appointments/NotificationLogPage';
import { AdminAnalyticsPage } from '@/app/pages/admin/appointments/AdminAnalyticsPage';
import { AdminBookAppointmentPage } from '@/app/pages/admin/appointments/AdminBookAppointmentPage';
import { TeleconsultationJoinPage } from '@/app/pages/appointments/TeleconsultationJoinPage';
import { FibroScanPage } from '@/app/pages/fibroscan/FibroScanPage';
import { ReportsPage } from '@/app/pages/reports/ReportsPage';
import { ReportDetailPage } from '@/app/pages/reports/ReportDetailPage';
import { TreatmentPlansPage } from '@/app/pages/treatment-plans/TreatmentPlansPage';
import { LabSamplesPage } from '@/app/pages/lab-samples/LabSamplesPage';
import { PrescriptionsPage } from '@/app/pages/prescriptions/PrescriptionsPage';
import { DeliveryPage } from '@/app/pages/delivery/DeliveryPage';
import { CoachingPage } from '@/app/pages/coaching/CoachingPage';
import { SettingsPage } from '@/app/pages/settings/SettingsPage';
import { PatientJourneyPage } from '@/app/pages/patient-journey/PatientJourneyPage';
import { NotFoundPage } from '@/app/pages/not-found/NotFoundPage';
import { AppRole } from '@/types';

const CLINICAL_STAFF = [
  AppRole.DOCTOR,
  AppRole.TECHNICIAN,
  AppRole.DIETICIAN,
  AppRole.HEALTH_COACH,
  AppRole.OPERATIONS,
  AppRole.CITY_MANAGER,
  AppRole.SUPER_ADMIN,
] as const;

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<PatientOnboardingRoute requireComplete={false} />}>
          <Route element={<OnboardingShell />}>
            <Route path="/patient-journey" element={<PatientJourneyPage />} />
          </Route>
        </Route>

        <Route element={<PatientOnboardingRoute requireComplete />}>
          <Route element={<AdminShell />}>
            <Route index element={<PostAuthRedirect />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route element={<ProtectedRoute allowedRoles={[...CLINICAL_STAFF]} />}>
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/patients/:id" element={<PatientDetailPage />} />
            </Route>

            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/appointments/book" element={<BookAppointmentWizardPage />} />
            <Route path="/appointments/:id/tracking" element={<TechnicianTrackingPage />} />
            <Route path="/appointments/:id/tele" element={<TeleconsultationJoinPage />} />
            <Route path="/appointments/:id" element={<AppointmentDetailPage />} />

            <Route element={<ProtectedRoute allowedRoles={[AppRole.DOCTOR]} />}>
              <Route path="/doctor/appointments" element={<DoctorAppointmentsPage />} />
              <Route path="/doctor/appointments/:id/tele" element={<TeleconsultationJoinPage />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={[AppRole.OPERATIONS, AppRole.CITY_MANAGER, AppRole.SUPER_ADMIN]} />
              }
            >
              <Route path="/admin/appointments" element={<AdminAppointmentsDashboardPage />} />
              <Route path="/admin/appointments/book" element={<AdminBookAppointmentPage />} />
              <Route path="/admin/appointments/routes" element={<RouteMonitoringPage />} />
              <Route path="/admin/appointments/missed" element={<MissedAppointmentsPage />} />
              <Route path="/admin/appointments/notifications" element={<NotificationLogPage />} />
              <Route path="/admin/appointments/analytics" element={<AdminAnalyticsPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[AppRole.TECHNICIAN]} />}>
              <Route path="/technician/schedule" element={<TechnicianSchedulePage />} />
              <Route path="/technician/schedule/:id" element={<TechnicianVisitDetailPage />} />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[
                    AppRole.TECHNICIAN,
                    AppRole.DOCTOR,
                    AppRole.LAB_PARTNER,
                    AppRole.SUPER_ADMIN,
                    AppRole.CITY_MANAGER,
                  ]}
                />
              }
            >
              <Route path="/fibroscan" element={<FibroScanPage />} />
              <Route path="/lab-samples" element={<LabSamplesPage />} />
            </Route>

            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/:reportKey" element={<ReportDetailPage />} />
            <Route path="/treatment-plans" element={<TreatmentPlansPage />} />

            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[AppRole.DOCTOR, AppRole.PHARMACY, AppRole.SUPER_ADMIN]}
                />
              }
            >
              <Route path="/prescriptions" element={<PrescriptionsPage />} />
            </Route>

            <Route path="/delivery" element={<DeliveryPage />} />

            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[
                    AppRole.HEALTH_COACH,
                    AppRole.DIETICIAN,
                    AppRole.DOCTOR,
                    AppRole.SUPER_ADMIN,
                  ]}
                />
              }
            >
              <Route path="/coaching" element={<CoachingPage />} />
            </Route>

            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
