/** @see ./README.md — all services use BaseApiService + mockOrApi(VITE_MOCK_MODE) */

export { BaseApiService, apiClient } from './base';
export { isMockMode, mockOrApi } from './mock';

// Auth
export { authService } from './auth';

// Legacy scheduling & patients (secondary to liver care orders)
export { patientsService, dashboardService } from './patients';
export { journeyService } from './journey';
export {
  appointmentsService,
  doctorAppointmentsService,
  technicianAppointmentsService,
  adminAppointmentsService,
  careAppointmentsService,
} from './appointments';
export { profileService } from './profile';

// Home-visit sample schedule (not partner lab pathology)
export { sampleCollectionService } from './sampleCollection';
export { opsAnalyticsService } from './opsAnalytics';

// Staff
export { staffDirectoryService } from './staff/StaffDirectoryService';
export { staffOnboardingService } from './staff/StaffOnboardingService';
export { staffProfileService } from './staff/StaffProfileService';
export { technicianProfileService } from './technician/TechnicianProfileService';

// Admin ops
export { adminOperationsService, auditLogService } from './admin';

// Push inbox
export {
  inboxNotificationService,
  notifyOps,
  notifyTechnician,
  notifyDoctor,
  notifyPatient,
} from './notifications';

// Liver care platform (primary domain)
export {
  packageService,
  enquiryService,
  liverCareOrderService,
  patientPortalService,
  technicianOrderService,
  partnerLabService,
  pathologyService,
  aiExtractionOrderService,
  finalReportService,
  doctorConsultationService,
  prescriptionOrderService,
  adminDashboardService,
} from './liverCare';

// External dummy integrations
export * from './external';
