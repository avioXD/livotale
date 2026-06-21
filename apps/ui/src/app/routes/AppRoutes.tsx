import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RouteFallback } from '@/components/common';
import { ADMIN_ROLES } from '@/app/config/productRoles';
import { LIVER_CARE_ROUTE_ROLES } from '@/app/config/liverCareRouteRoles';
import { AppRole } from '@/types';

// Structural shells, guards, and tiny redirects stay eager — they wrap every route
// and lazy-loading them would only add empty suspense boundaries.
import { AdminShell } from '@/app/layouts/AdminShell';
import { OnboardingShell } from '@/app/layouts/OnboardingShell';
import { PublicLayout } from '@/app/layouts/PublicLayout';
import { PatientPortalLayout } from '@/app/layouts/PatientPortalLayout';
import { ProtectedRoute, PublicRoute } from '@/app/routes/ProtectedRoute';
import { PatientOnboardingRoute } from '@/app/routes/PatientOnboardingRoute';
import { StaffOnboardingRoute } from '@/app/routes/StaffOnboardingRoute';
import { LegacyOrgPathRedirect, OrgCityRedirect } from '@/app/routes/LegacyOrgPathRedirect';
import { orgPath } from '@/app/config/orgRoutes';
import {
  RedirectLegacyLabPartnerDetail,
  RedirectLegacyLabPartnerList,
} from '@/app/pages/admin/labs/redirectLabPartnerRoutes';

// Page components are code-split per route (Constitution VI: lazy loading).
const LoginPage = lazy(() => import('@/app/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/app/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ResetPasswordPage = lazy(() => import('@/app/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import('@/app/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const PatientsPage = lazy(() => import('@/app/pages/patients/PatientsPage').then((m) => ({ default: m.PatientsPage })));
const PatientDetailPage = lazy(() => import('@/app/pages/patients/PatientDetailPage').then((m) => ({ default: m.PatientDetailPage })));
const AppointmentsPage = lazy(() => import('@/app/pages/appointments/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })));
const AppointmentDetailPage = lazy(() => import('@/app/pages/appointments/AppointmentDetailPage').then((m) => ({ default: m.AppointmentDetailPage })));
const BookAppointmentWizardPage = lazy(() => import('@/app/pages/appointments/BookAppointmentWizardPage').then((m) => ({ default: m.BookAppointmentWizardPage })));
const TechnicianTrackingPage = lazy(() => import('@/app/pages/appointments/TechnicianTrackingPage').then((m) => ({ default: m.TechnicianTrackingPage })));
const TechnicianOrdersPage = lazy(() => import('@/app/pages/technician/orders/TechnicianOrdersPage').then((m) => ({ default: m.TechnicianOrdersPage })));
const TechnicianOrderDetailPage = lazy(() => import('@/app/pages/technician/orders/TechnicianOrderDetailPage').then((m) => ({ default: m.TechnicianOrderDetailPage })));
const DoctorConsultationsPage = lazy(() => import('@/app/pages/doctor/consultations/DoctorConsultationsPage').then((m) => ({ default: m.DoctorConsultationsPage })));
const DoctorConsultationDetailPage = lazy(() => import('@/app/pages/doctor/consultations/DoctorConsultationDetailPage').then((m) => ({ default: m.DoctorConsultationDetailPage })));
const DoctorPatientsPage = lazy(() => import('@/app/pages/doctor/patients/DoctorPatientsPage').then((m) => ({ default: m.DoctorPatientsPage })));
const AdminOperationsHubPage = lazy(() => import('@/app/pages/admin/operations/AdminOperationsHubPage').then((m) => ({ default: m.AdminOperationsHubPage })));
const NotificationLogPage = lazy(() => import('@/app/pages/admin/appointments/NotificationLogPage').then((m) => ({ default: m.NotificationLogPage })));
const AdminAnalyticsPage = lazy(() => import('@/app/pages/admin/appointments/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })));
const AdminAppointmentsDashboardPage = lazy(() =>
  import('@/app/pages/admin/appointments/AdminAppointmentsDashboardPage').then((m) => ({
    default: m.AdminAppointmentsDashboardPage,
  })),
);
const AdminBookAppointmentPage = lazy(() => import('@/app/pages/admin/appointments/AdminBookAppointmentPage').then((m) => ({ default: m.AdminBookAppointmentPage })));
const MissedAppointmentsPage = lazy(() => import('@/app/pages/admin/appointments/MissedAppointmentsPage').then((m) => ({ default: m.MissedAppointmentsPage })));
const RouteMonitoringPage = lazy(() => import('@/app/pages/admin/appointments/RouteMonitoringPage').then((m) => ({ default: m.RouteMonitoringPage })));
const AdminAppointmentDetailPage = lazy(() => import('@/app/pages/admin/appointments/AdminAppointmentDetailPage').then((m) => ({ default: m.AdminAppointmentDetailPage })));
const TeleconsultationJoinPage = lazy(() => import('@/app/pages/appointments/TeleconsultationJoinPage').then((m) => ({ default: m.TeleconsultationJoinPage })));
const TreatmentPlansPage = lazy(() => import('@/app/pages/treatment-plans/TreatmentPlansPage').then((m) => ({ default: m.TreatmentPlansPage })));
const AdminStaffHubPage = lazy(() => import('@/app/pages/admin/staff/AdminStaffHubPage').then((m) => ({ default: m.AdminStaffHubPage })));
const AdminStaffPerformancePage = lazy(() => import('@/app/pages/admin/staff/AdminStaffPerformancePage').then((m) => ({ default: m.AdminStaffPerformancePage })));
const AdminStaffMemberDetailPage = lazy(() => import('@/app/pages/admin/staff/AdminStaffMemberDetailPage').then((m) => ({ default: m.AdminStaffMemberDetailPage })));
const AdminStaffOnboardPage = lazy(() => import('@/app/pages/admin/staff/AdminStaffOnboardPage').then((m) => ({ default: m.AdminStaffOnboardPage })));
const StaffOnboardInvitePage = lazy(() => import('@/app/pages/staff/onboarding/StaffOnboardInvitePage').then((m) => ({ default: m.StaffOnboardInvitePage })));
const StaffRegisterPage = lazy(() => import('@/app/pages/staff/onboarding/StaffRegisterPage').then((m) => ({ default: m.StaffRegisterPage })));
const StaffOnboardingPage = lazy(() => import('@/app/pages/staff/onboarding/StaffOnboardingPage').then((m) => ({ default: m.StaffOnboardingPage })));
const TechnicianProfilePage = lazy(() => import('@/app/pages/technician/profile/TechnicianProfilePage').then((m) => ({ default: m.TechnicianProfilePage })));
const StaffSelfProfilePage = lazy(() => import('@/app/pages/staff/profile/StaffSelfProfilePage').then((m) => ({ default: m.StaffSelfProfilePage })));
const PrescriptionsPage = lazy(() => import('@/app/pages/prescriptions/PrescriptionsPage').then((m) => ({ default: m.PrescriptionsPage })));
const DeliveryPage = lazy(() => import('@/app/pages/delivery/DeliveryPage').then((m) => ({ default: m.DeliveryPage })));
const CoachingPage = lazy(() => import('@/app/pages/coaching/CoachingPage').then((m) => ({ default: m.CoachingPage })));
const SettingsPage = lazy(() => import('@/app/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const PatientJourneyPage = lazy(() => import('@/app/pages/patient-journey/PatientJourneyPage').then((m) => ({ default: m.PatientJourneyPage })));
const NotFoundPage = lazy(() => import('@/app/pages/not-found/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const LandingPage = lazy(() => import('@/app/pages/public/LandingPage').then((m) => ({ default: m.LandingPage })));
const PackagesPage = lazy(() => import('@/app/pages/public/PackagesPage').then((m) => ({ default: m.PackagesPage })));
const PackageDetailPage = lazy(() => import('@/app/pages/public/PackageDetailPage').then((m) => ({ default: m.PackageDetailPage })));
const EnquirePage = lazy(() => import('@/app/pages/public/EnquirePage').then((m) => ({ default: m.EnquirePage })));
const EnquireThanksPage = lazy(() => import('@/app/pages/public/EnquireThanksPage').then((m) => ({ default: m.EnquireThanksPage })));
const EnquiryDetailPage = lazy(() => import('@/app/pages/admin/enquiries/EnquiryDetailPage').then((m) => ({ default: m.EnquiryDetailPage })));
const LiverCareOrderDetailPage = lazy(() => import('@/app/pages/admin/orders/LiverCareOrderDetailPage').then((m) => ({ default: m.LiverCareOrderDetailPage })));
const AdminPartnerLabDetailPage = lazy(() => import('@/app/pages/admin/labs/AdminPartnerLabDetailPage').then((m) => ({ default: m.AdminPartnerLabDetailPage })));
const AdminPartnerLabsPage = lazy(() => import('@/app/pages/admin/labs/AdminPartnerLabsPage').then((m) => ({ default: m.AdminPartnerLabsPage })));
const AdminPackagesPage = lazy(() => import('@/app/pages/admin/packages/AdminPackagesPage').then((m) => ({ default: m.AdminPackagesPage })));
const AdminPackageDetailPage = lazy(() => import('@/app/pages/admin/packages/AdminPackageDetailPage').then((m) => ({ default: m.AdminPackageDetailPage })));
const AdminLiverCareNotificationsPage = lazy(() => import('@/app/pages/admin/notifications/AdminLiverCareNotificationsPage').then((m) => ({ default: m.AdminLiverCareNotificationsPage })));
const AdminAuditLogPage = lazy(() => import('@/app/pages/admin/audit/AdminAuditLogPage').then((m) => ({ default: m.AdminAuditLogPage })));
const AdminLoginLogsPage = lazy(() => import('@/app/pages/admin/audit/AdminLoginLogsPage').then((m) => ({ default: m.AdminLoginLogsPage })));
const AdminBankDetailsDirectoryPage = lazy(() => import('@/app/pages/admin/bank/AdminBankDetailsDirectoryPage').then((m) => ({ default: m.AdminBankDetailsDirectoryPage })));
const AdminIntegrationsPage = lazy(() => import('@/app/pages/admin/settings/integrations/AdminIntegrationsPage').then((m) => ({ default: m.AdminIntegrationsPage })));
const AdminPaymentConfigPage = lazy(() => import('@/app/pages/admin/settings/integrations/AdminPaymentConfigPage').then((m) => ({ default: m.AdminPaymentConfigPage })));
const AdminTwilioConfigPage = lazy(() => import('@/app/pages/admin/settings/integrations/AdminTwilioConfigPage').then((m) => ({ default: m.AdminTwilioConfigPage })));
const AdminEmailConfigPage = lazy(() => import('@/app/pages/admin/settings/integrations/AdminEmailConfigPage').then((m) => ({ default: m.AdminEmailConfigPage })));
const AdminAiConfigPage = lazy(() => import('@/app/pages/admin/settings/integrations/AdminAiConfigPage').then((m) => ({ default: m.AdminAiConfigPage })));
const AdminMessageTemplatesPage = lazy(() => import('@/app/pages/admin/settings/integrations/AdminMessageTemplatesPage').then((m) => ({ default: m.AdminMessageTemplatesPage })));
const AdminPdfTemplatesPage = lazy(() => import('@/app/pages/admin/settings/integrations/AdminPdfTemplatesPage').then((m) => ({ default: m.AdminPdfTemplatesPage })));
const AdminS3ConfigPage = lazy(() => import('@/app/pages/admin/settings/integrations/AdminS3ConfigPage').then((m) => ({ default: m.AdminS3ConfigPage })));
const AdminServiceZonesPage = lazy(() => import('@/app/pages/admin/serviceZones/AdminServiceZonesPage').then((m) => ({ default: m.AdminServiceZonesPage })));
const AdminServiceZoneDetailPage = lazy(() => import('@/app/pages/admin/serviceZones/AdminServiceZoneDetailPage').then((m) => ({ default: m.AdminServiceZoneDetailPage })));
const PatientLoginPage = lazy(() => import('@/app/pages/patient-portal/PatientLoginPage').then((m) => ({ default: m.PatientLoginPage })));
const PatientDashboardPage = lazy(() => import('@/app/pages/patient-portal/PatientDashboardPage').then((m) => ({ default: m.PatientDashboardPage })));
const PatientOrderDetailPage = lazy(() => import('@/app/pages/patient-portal/PatientOrderDetailPage').then((m) => ({ default: m.PatientOrderDetailPage })));
const PatientPayCheckoutPage = lazy(() => import('@/app/pages/patient-portal/PatientPayCheckoutPage').then((m) => ({ default: m.PatientPayCheckoutPage })));
const PatientReportPage = lazy(() => import('@/app/pages/patient-portal/PatientReportPage').then((m) => ({ default: m.PatientReportPage })));
const PatientPrescriptionPage = lazy(() => import('@/app/pages/patient-portal/PatientPrescriptionPage').then((m) => ({ default: m.PatientPrescriptionPage })));
const PatientProfilePage = lazy(() => import('@/app/pages/patient-portal/PatientProfilePage').then((m) => ({ default: m.PatientProfilePage })));
const PatientNotificationsPage = lazy(() => import('@/app/pages/patient-portal/PatientNotificationsPage').then((m) => ({ default: m.PatientNotificationsPage })));
const StaffNotificationsPage = lazy(() => import('@/app/pages/notifications/StaffNotificationsPage').then((m) => ({ default: m.StaffNotificationsPage })));
const PatientOrdersPage = lazy(() => import('@/app/pages/patient-portal/PatientOrdersPage').then((m) => ({ default: m.PatientOrdersPage })));
const PatientEnquiryDetailPage = lazy(() => import('@/app/pages/patient-portal/PatientEnquiryDetailPage').then((m) => ({ default: m.PatientEnquiryDetailPage })));
const PatientOnboardingPage = lazy(() => import('@/app/pages/patient-portal/PatientOnboardingPage').then((m) => ({ default: m.PatientOnboardingPage })));
const PatientDownloadsPage = lazy(() => import('@/app/pages/patient-portal/PatientDownloadsPage').then((m) => ({ default: m.PatientDownloadsPage })));


export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
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
        <Route path="/patient/onboarding" element={<PatientOnboardingPage />} />
        <Route path="/patient" element={<PatientDashboardPage />} />
        <Route path="/patient/orders" element={<PatientOrdersPage />} />
        <Route path="/patient/enquiries/:id" element={<PatientEnquiryDetailPage />} />
        <Route path="/patient/profile" element={<PatientProfilePage />} />
        <Route path="/patient/notifications" element={<PatientNotificationsPage />} />
        <Route path="/patient/downloads" element={<PatientDownloadsPage />} />
        <Route path="/patient/orders/:id" element={<PatientOrderDetailPage />} />
        <Route path="/patient/orders/:id/pay" element={<PatientPayCheckoutPage />} />
        <Route path="/patient/orders/:id/report" element={<PatientReportPage />} />
        <Route path="/patient/orders/:id/prescription" element={<PatientPrescriptionPage />} />
      </Route>

      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LegacyOrgPathRedirect />} />
        <Route path="/register" element={<LegacyOrgPathRedirect />} />
        <Route path="/reset-password" element={<LegacyOrgPathRedirect />} />
        <Route path="/org/login" element={<LoginPage />} />
        <Route path="/org/register" element={<RegisterPage />} />
        <Route path="/org/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route path="/staff/onboard/*" element={<LegacyOrgPathRedirect />} />
      <Route path="/staff/register" element={<LegacyOrgPathRedirect />} />
      <Route path="/org/staff/onboard/:token" element={<StaffOnboardInvitePage />} />
      <Route path="/org/staff/register" element={<StaffRegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<PatientOnboardingRoute requireComplete={false} />}>
          <Route element={<OnboardingShell />}>
            <Route path="/patient-journey" element={<PatientJourneyPage />} />
          </Route>
        </Route>

        <Route element={<PatientOnboardingRoute requireComplete />}>
          <Route element={<StaffOnboardingRoute />}>
            {/* Legacy staff app URLs → /org */}
            <Route path="/dashboard" element={<LegacyOrgPathRedirect />} />
            <Route path="/notifications" element={<LegacyOrgPathRedirect />} />
            <Route path="/staff/onboarding" element={<LegacyOrgPathRedirect />} />
            <Route path="/staff/profile" element={<LegacyOrgPathRedirect />} />
            <Route path="/patients/*" element={<LegacyOrgPathRedirect />} />
            <Route path="/appointments/*" element={<LegacyOrgPathRedirect />} />
            <Route path="/doctor/*" element={<LegacyOrgPathRedirect />} />
            <Route path="/admin/*" element={<LegacyOrgPathRedirect />} />
            <Route path="/technician/*" element={<LegacyOrgPathRedirect />} />
            <Route path="/treatment-plans" element={<LegacyOrgPathRedirect />} />
            <Route path="/prescriptions" element={<LegacyOrgPathRedirect />} />
            <Route path="/delivery" element={<LegacyOrgPathRedirect />} />
            <Route path="/coaching" element={<LegacyOrgPathRedirect />} />
            <Route path="/settings" element={<LegacyOrgPathRedirect />} />

            <Route element={<AdminShell />}>
              <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.dashboard]} />}>
                <Route path="/org/:city/dashboard" element={<DashboardPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.staffNotifications]} />}>
                <Route path="/org/:city/notifications" element={<StaffNotificationsPage />} />
              </Route>
              <Route path="/org/:city/staff/onboarding" element={<StaffOnboardingPage />} />

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.staffProfile]} />}>
              <Route path="/org/:city/staff/profile" element={<StaffSelfProfilePage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.patients]} />}>
              <Route path="/org/:city/patients" element={<PatientsPage />} />
              <Route path="/org/:city/patients/:id" element={<PatientDetailPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[AppRole.PATIENT]} />}>
              <Route path="/org/:city/appointments" element={<Navigate to="/patient" replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[AppRole.PATIENT]} />}>
              <Route path="/org/:city/appointments/book" element={<Navigate to="/patient" replace />} />
            </Route>
            <Route path="/org/:city/appointments/:id/tracking" element={<Navigate to="/patient" replace />} />
            <Route path="/org/:city/appointments/:id/tele" element={<Navigate to="/patient" replace />} />
            <Route path="/org/:city/appointments/:id" element={<Navigate to="/patient" replace />} />

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.doctorConsultations]} />}>
              <Route path="/org/:city/doctor/consultations" element={<DoctorConsultationsPage />} />
              <Route path="/org/:city/doctor/consultations/:id" element={<DoctorConsultationDetailPage />} />
              <Route path="/org/:city/doctor/patients" element={<DoctorPatientsPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.doctorAppointments]} />}>
              <Route path="/org/:city/doctor/appointments" element={<Navigate to={orgPath('/doctor/consultations')} replace />} />
              <Route path="/org/:city/doctor/appointments/:id/tele" element={<Navigate to={orgPath('/doctor/consultations')} replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.adminOperations]} />}>
              <Route path="/org/:city/admin/operations" element={<AdminOperationsHubPage />} />
              <Route path="/org/:city/admin/enquiries" element={<Navigate to={orgPath('/admin/operations?tab=enquiries')} replace />} />
              <Route path="/org/:city/admin/enquiries/:id" element={<EnquiryDetailPage />} />
              <Route path="/org/:city/admin/orders/:id" element={<LiverCareOrderDetailPage />} />
              <Route path="/org/:city/admin/notifications" element={<AdminLiverCareNotificationsPage />} />
              <Route path="/org/:city/admin/appointments" element={<Navigate to={orgPath('/admin/operations?tab=appointments')} replace />} />
              <Route path="/org/:city/admin/sample-collections" element={<Navigate to={orgPath('/admin/operations?tab=partner-lab')} replace />} />
              <Route path="/org/:city/admin/appointments/book" element={<AdminBookAppointmentPage />} />
              <Route path="/org/:city/admin/appointments/routes" element={<RouteMonitoringPage />} />
              <Route path="/org/:city/admin/appointments/missed" element={<MissedAppointmentsPage />} />
              <Route path="/org/:city/admin/appointments/notifications" element={<NotificationLogPage />} />
              <Route path="/org/:city/admin/appointments/dashboard" element={<AdminAppointmentsDashboardPage />} />
              <Route path="/org/:city/admin/appointments/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/org/:city/admin/staff" element={<Navigate to={orgPath('/admin/staff/technicians')} replace />} />
              <Route path="/org/:city/admin/staff-performance" element={<AdminStaffPerformancePage />} />
              <Route path="/org/:city/admin/staff/lab-partners/:id" element={<AdminPartnerLabDetailPage />} />
              <Route path="/org/:city/admin/staff/lab-partners" element={<AdminPartnerLabsPage />} />
              <Route path="/org/:city/admin/lab-partners/:id" element={<RedirectLegacyLabPartnerDetail />} />
              <Route path="/org/:city/admin/lab-partners" element={<RedirectLegacyLabPartnerList />} />
              <Route path="/org/:city/admin/staff/:roleSlug/onboard" element={<AdminStaffOnboardPage />} />
              <Route path="/org/:city/admin/staff/:roleSlug/:memberId" element={<AdminStaffMemberDetailPage />} />
              <Route path="/org/:city/admin/staff/:roleSlug" element={<AdminStaffHubPage />} />
              <Route path="/org/:city/admin/appointments/:id" element={<Navigate to={orgPath('/admin/operations?tab=appointments')} replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.adminPackages]} />}>
              <Route path="/org/:city/admin/packages" element={<AdminPackagesPage />} />
              <Route path="/org/:city/admin/packages/:id" element={<AdminPackageDetailPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[AppRole.SUPER_ADMIN]} />}>
              <Route path="/org/:city/admin/bank-details" element={<AdminBankDetailsDirectoryPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]} />}>
              <Route path="/org/:city/admin/audit" element={<AdminAuditLogPage />} />
              <Route path="/org/:city/admin/login-logs" element={<AdminLoginLogsPage />} />
              <Route path="/org/:city/admin/integrations" element={<AdminIntegrationsPage />} />
              <Route path="/org/:city/admin/integrations/templates" element={<AdminMessageTemplatesPage />} />
              <Route path="/org/:city/admin/service-zones" element={<AdminServiceZonesPage />} />
              <Route path="/org/:city/admin/service-zones/:id" element={<AdminServiceZoneDetailPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[AppRole.SUPER_ADMIN]} />}>
              <Route path="/org/:city/admin/integrations/payment" element={<AdminPaymentConfigPage />} />
              <Route path="/org/:city/admin/integrations/sms" element={<AdminTwilioConfigPage />} />
              <Route path="/org/:city/admin/integrations/email" element={<AdminEmailConfigPage />} />
              <Route path="/org/:city/admin/integrations/ai" element={<AdminAiConfigPage />} />
              <Route path="/org/:city/admin/integrations/pdf" element={<AdminPdfTemplatesPage />} />
              <Route path="/org/:city/admin/integrations/storage" element={<AdminS3ConfigPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.technician]} />}>
              <Route path="/org/:city/technician/orders" element={<TechnicianOrdersPage />} />
              <Route path="/org/:city/technician/orders/:id" element={<TechnicianOrderDetailPage />} />
              <Route path="/org/:city/technician/schedule" element={<Navigate to={orgPath('/technician/orders')} replace />} />
              <Route path="/org/:city/technician/schedule/:id" element={<Navigate to={orgPath('/technician/orders')} replace />} />
              <Route path="/org/:city/technician/profile" element={<TechnicianProfilePage />} />
              <Route path="/org/:city/technician/sample-collections" element={<Navigate to={orgPath('/technician/orders')} replace />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.treatmentPlans]} />}>
              <Route path="/org/:city/treatment-plans" element={<TreatmentPlansPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[...LIVER_CARE_ROUTE_ROLES.prescriptions]} />}>
              <Route path="/org/:city/prescriptions" element={<PrescriptionsPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[AppRole.PATIENT]} />}>
              <Route path="/org/:city/delivery" element={<DeliveryPage />} />
              <Route path="/org/:city/coaching" element={<CoachingPage />} />
            </Route>

            <Route path="/org/:city/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      {/* Bare /org/... links (missing the city segment) → canonical city path. */}
      <Route path="/org/*" element={<OrgCityRedirect />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}
