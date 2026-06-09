import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminShell } from '@/app/layouts/AdminShell';
import { OnboardingShell } from '@/app/layouts/OnboardingShell';
import { ProtectedRoute, PublicRoute } from '@/app/routes/ProtectedRoute';
import { PatientOnboardingRoute } from '@/app/routes/PatientOnboardingRoute';
import { StaffOnboardingRoute } from '@/app/routes/StaffOnboardingRoute';
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
import { TechnicianOrdersPage } from '@/app/pages/technician/orders/TechnicianOrdersPage';
import { TechnicianOrderDetailPage } from '@/app/pages/technician/orders/TechnicianOrderDetailPage';
import { DoctorConsultationsPage } from '@/app/pages/doctor/consultations/DoctorConsultationsPage';
import { DoctorConsultationDetailPage } from '@/app/pages/doctor/consultations/DoctorConsultationDetailPage';
import { AdminOperationsHubPage } from '@/app/pages/admin/operations/AdminOperationsHubPage';
import { NotificationLogPage } from '@/app/pages/admin/appointments/NotificationLogPage';
import { AdminAnalyticsPage } from '@/app/pages/admin/appointments/AdminAnalyticsPage';
import { AdminBookAppointmentPage } from '@/app/pages/admin/appointments/AdminBookAppointmentPage';
import { AdminAppointmentDetailPage } from '@/app/pages/admin/appointments/AdminAppointmentDetailPage';
import { TeleconsultationJoinPage } from '@/app/pages/appointments/TeleconsultationJoinPage';
import { TreatmentPlansPage } from '@/app/pages/treatment-plans/TreatmentPlansPage';
import { ADMIN_ROLES } from '@/app/config/productRoles';
import { LIVER_CARE_ROUTE_ROLES } from '@/app/config/liverCareRouteRoles';
import { AdminStaffHubPage, AdminStaffHubRedirect } from '@/app/pages/admin/staff/AdminStaffHubPage';
import { AdminStaffPerformancePage } from '@/app/pages/admin/staff/AdminStaffPerformancePage';
import { AdminStaffMemberDetailPage } from '@/app/pages/admin/staff/AdminStaffMemberDetailPage';
import { AdminStaffOnboardPage } from '@/app/pages/admin/staff/AdminStaffOnboardPage';
import { StaffOnboardInvitePage } from '@/app/pages/staff/onboarding/StaffOnboardInvitePage';
import { StaffRegisterPage } from '@/app/pages/staff/onboarding/StaffRegisterPage';
import { StaffOnboardingPage } from '@/app/pages/staff/onboarding/StaffOnboardingPage';
import { TechnicianProfilePage } from '@/app/pages/technician/profile/TechnicianProfilePage';
import { StaffSelfProfilePage } from '@/app/pages/staff/profile/StaffSelfProfilePage';
import { PrescriptionsPage } from '@/app/pages/prescriptions/PrescriptionsPage';
import { DeliveryPage } from '@/app/pages/delivery/DeliveryPage';
import { CoachingPage } from '@/app/pages/coaching/CoachingPage';
import { SettingsPage } from '@/app/pages/settings/SettingsPage';
import { PatientJourneyPage } from '@/app/pages/patient-journey/PatientJourneyPage';
import { NotFoundPage } from '@/app/pages/not-found/NotFoundPage';
import { PublicLayout } from '@/app/layouts/PublicLayout';
import { LandingPage } from '@/app/pages/public/LandingPage';
import { PackagesPage } from '@/app/pages/public/PackagesPage';
import { PackageDetailPage } from '@/app/pages/public/PackageDetailPage';
import { EnquirePage } from '@/app/pages/public/EnquirePage';
import { EnquireThanksPage } from '@/app/pages/public/EnquireThanksPage';
import { EnquiryDetailPage } from '@/app/pages/admin/enquiries/EnquiryDetailPage';
import { LiverCareOrderDetailPage } from '@/app/pages/admin/orders/LiverCareOrderDetailPage';
import { AdminPartnerLabDetailPage } from '@/app/pages/admin/labs/AdminPartnerLabDetailPage';
import { AdminPartnerLabsPage } from '@/app/pages/admin/labs/AdminPartnerLabsPage';
import {
  RedirectLegacyLabPartnerDetail,
  RedirectLegacyLabPartnerList,
} from '@/app/pages/admin/labs/redirectLabPartnerRoutes';
import { AdminPackagesPage } from '@/app/pages/admin/packages/AdminPackagesPage';
import { AdminPackageDetailPage } from '@/app/pages/admin/packages/AdminPackageDetailPage';
import { AdminLiverCareNotificationsPage } from '@/app/pages/admin/notifications/AdminLiverCareNotificationsPage';
import { AdminAuditLogPage } from '@/app/pages/admin/audit/AdminAuditLogPage';
import { AdminIntegrationsPage } from '@/app/pages/admin/settings/AdminIntegrationsPage';
import { PatientPortalLayout } from '@/app/layouts/PatientPortalLayout';
import { PatientLoginPage } from '@/app/pages/patient-portal/PatientLoginPage';
import { PatientDashboardPage } from '@/app/pages/patient-portal/PatientDashboardPage';
import { PatientOrderDetailPage } from '@/app/pages/patient-portal/PatientOrderDetailPage';
import { PatientPayCheckoutPage } from '@/app/pages/patient-portal/PatientPayCheckoutPage';
import { PatientReportPage } from '@/app/pages/patient-portal/PatientReportPage';
import { PatientPrescriptionPage } from '@/app/pages/patient-portal/PatientPrescriptionPage';
import { PatientProfilePage } from '@/app/pages/patient-portal/PatientProfilePage';
import { PatientNotificationsPage } from '@/app/pages/patient-portal/PatientNotificationsPage';
import { StaffNotificationsPage } from '@/app/pages/notifications/StaffNotificationsPage';
import { PatientDownloadsPage } from '@/app/pages/patient-portal/PatientDownloadsPage';
import { AppRole } from '@/types';


export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/packages/:code" element={<PackageDetailPage />} />
        <Route path="/enquire" element={<EnquirePage />} />
        <Route path="/enquire/thanks" element={<EnquireThanksPage />} />
      </Route>

      <Route path="/patient/login" element={<PatientLoginPage />} />

      <Route element={<PatientPortalLayout />}>
        <Route path="/patient" element={<PatientDashboardPage />} />
        <Route path="/patient/profile" element={<PatientProfilePage />} />
        <Route path="/patient/notifications" element={<PatientNotificationsPage />} />
        <Route path="/patient/downloads" element={<PatientDownloadsPage />} />
        <Route path="/patient/orders/:id" element={<PatientOrderDetailPage />} />
        <Route path="/patient/orders/:id/pay" element={<PatientPayCheckoutPage />} />
        <Route path="/patient/orders/:id/report" element={<PatientReportPage />} />
        <Route path="/patient/orders/:id/prescription" element={<PatientPrescriptionPage />} />
      </Route>

      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route path="/staff/onboard/:token" element={<StaffOnboardInvitePage />} />
      <Route path="/staff/register" element={<StaffRegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<PatientOnboardingRoute requireComplete={false} />}>
          <Route element={<OnboardingShell />}>
            <Route path="/patient-journey" element={<PatientJourneyPage />} />
          </Route>
        </Route>

        <Route element={<PatientOnboardingRoute requireComplete />}>
          <Route element={<StaffOnboardingRoute />}>
            <Route element={<AdminShell />}>
              <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.dashboard]} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.staffNotifications]} />}>
                <Route path="/notifications" element={<StaffNotificationsPage />} />
              </Route>
              <Route path="/staff/onboarding" element={<StaffOnboardingPage />} />

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.staffProfile]} />}>
              <Route path="/staff/profile" element={<StaffSelfProfilePage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.patients]} />}>
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/patients/:id" element={<PatientDetailPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[AppRole.PATIENT]} />}>
              <Route path="/appointments" element={<AppointmentsPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[AppRole.PATIENT]} />}>
              <Route path="/appointments/book" element={<BookAppointmentWizardPage />} />
            </Route>
            <Route path="/appointments/:id/tracking" element={<TechnicianTrackingPage />} />
            <Route path="/appointments/:id/tele" element={<TeleconsultationJoinPage />} />
            <Route path="/appointments/:id" element={<AppointmentDetailPage />} />

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.doctorConsultations]} />}>
              <Route path="/doctor/consultations" element={<DoctorConsultationsPage />} />
              <Route path="/doctor/consultations/:id" element={<DoctorConsultationDetailPage />} />
              <Route path="/doctor/patients" element={<Navigate to="/doctor/consultations" replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.doctorAppointments]} />}>
              <Route path="/doctor/appointments" element={<Navigate to="/doctor/consultations" replace />} />
              <Route path="/doctor/appointments/:id/tele" element={<TeleconsultationJoinPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.adminOperations]} />}>
              <Route path="/admin/operations" element={<AdminOperationsHubPage />} />
              <Route path="/admin/enquiries" element={<Navigate to="/admin/operations?tab=enquiries" replace />} />
              <Route path="/admin/enquiries/:id" element={<EnquiryDetailPage />} />
              <Route path="/admin/orders/:id" element={<LiverCareOrderDetailPage />} />
              <Route path="/admin/notifications" element={<AdminLiverCareNotificationsPage />} />
              <Route path="/admin/appointments" element={<Navigate to="/admin/operations?tab=appointments" replace />} />
              <Route path="/admin/sample-collections" element={<Navigate to="/admin/operations?tab=partner-lab" replace />} />
              <Route path="/admin/appointments/book" element={<AdminBookAppointmentPage />} />
              <Route path="/admin/appointments/routes" element={<Navigate to="/admin/operations?tab=appointments" replace />} />
              <Route path="/admin/appointments/missed" element={<Navigate to="/admin/operations?tab=appointments&status=missed" replace />} />
              <Route path="/admin/appointments/notifications" element={<NotificationLogPage />} />
              <Route path="/admin/appointments/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/admin/staff" element={<AdminStaffHubRedirect />} />
              <Route path="/admin/staff-performance" element={<AdminStaffPerformancePage />} />
              <Route path="/admin/staff/lab-partners/:id" element={<AdminPartnerLabDetailPage />} />
              <Route path="/admin/staff/lab-partners" element={<AdminPartnerLabsPage />} />
              <Route path="/admin/lab-partners/:id" element={<RedirectLegacyLabPartnerDetail />} />
              <Route path="/admin/lab-partners" element={<RedirectLegacyLabPartnerList />} />
              <Route path="/admin/staff/:roleSlug/onboard" element={<AdminStaffOnboardPage />} />
              <Route path="/admin/staff/:roleSlug/:memberId" element={<AdminStaffMemberDetailPage />} />
              <Route path="/admin/staff/:roleSlug" element={<AdminStaffHubPage />} />
              <Route path="/admin/appointments/:id" element={<AdminAppointmentDetailPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.adminPackages]} />}>
              <Route path="/admin/packages" element={<AdminPackagesPage />} />
              <Route path="/admin/packages/:id" element={<AdminPackageDetailPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]} />}>
              <Route path="/admin/audit" element={<AdminAuditLogPage />} />
              <Route path="/admin/integrations" element={<AdminIntegrationsPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.technician]} />}>
              <Route path="/technician/orders" element={<TechnicianOrdersPage />} />
              <Route path="/technician/orders/:id" element={<TechnicianOrderDetailPage />} />
              <Route path="/technician/schedule" element={<Navigate to="/technician/orders" replace />} />
              <Route path="/technician/schedule/:id" element={<Navigate to="/technician/orders" replace />} />
              <Route path="/technician/profile" element={<TechnicianProfilePage />} />
              <Route path="/technician/sample-collections" element={<Navigate to="/technician/orders" replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.treatmentPlans]} />}>
              <Route path="/treatment-plans" element={<TreatmentPlansPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.prescriptions]} />}>
              <Route path="/prescriptions" element={<PrescriptionsPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[AppRole.PATIENT]} />}>
              <Route path="/delivery" element={<DeliveryPage />} />
              <Route path="/coaching" element={<CoachingPage />} />
            </Route>

            <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
