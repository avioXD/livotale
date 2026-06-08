import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import type {
  AiAssessment,
  BookVisitPayload,
  HomeVisit,
  JourneyState,
  OnboardingPayload,
  PatientAddress,
  PatientDashboardData,
  PendingPrescription,
  Questionnaire,
  QuestionnaireAnswerInput,
  ReportUploadPayload,
  TechnicianVisit,
  VisitDetail,
} from '@/types';
import {
  mockApprovePrescription,
  mockBookHomeVisit,
  mockCaptureConsent,
  mockCaptureLiverFibrosisScan,
  mockCaptureVitals,
  mockCollectSample,
  mockCompleteOnboarding,
  mockCompleteVisit,
  mockEditPrescription,
  mockGetAssessment,
  mockGetDashboardAnalytics,
  mockGetJourney,
  mockGetOnboardingStatus,
  mockGetPendingPrescriptions,
  mockGetPrescription,
  mockGetQuestionnaire,
  mockGetTechnicianVisit,
  mockGetTechnicianVisitsToday,
  mockListAddresses,
  mockListHomeVisits,
  mockRunPreScreen,
  mockSubmitQuestionnaire,
  mockUploadReport,
} from './journey.mock';

class JourneyService extends BaseApiService {
  async getOnboardingStatus(): Promise<{ onboardingComplete: boolean; journeyStatus: string; currentStep: string }> {
    return mockOrApi(
      () => mockGetOnboardingStatus(),
      () => this.get('/patient/onboarding/status'),
    );
  }

  async getDashboardAnalytics(): Promise<PatientDashboardData> {
    return mockOrApi(
      () => mockGetDashboardAnalytics(),
      () => this.get<PatientDashboardData>('/patient/dashboard/analytics'),
    );
  }

  async getJourney(): Promise<JourneyState> {
    return mockOrApi(
      () => mockGetJourney(),
      () => this.get<JourneyState>('/patient/journey'),
    );
  }

  async getQuestionnaire(code: string): Promise<Questionnaire> {
    return mockOrApi(
      () => mockGetQuestionnaire(code),
      () => this.get<Questionnaire>(`/patient/questionnaires/${code}`),
    );
  }

  async submitQuestionnaire(code: string, answers: QuestionnaireAnswerInput[]) {
    return mockOrApi(
      () => mockSubmitQuestionnaire(code, answers),
      () => this.post(`/patient/questionnaires/${code}/responses`, { answers }),
    );
  }

  async completeOnboarding(payload: OnboardingPayload) {
    return mockOrApi(
      () => mockCompleteOnboarding(payload),
      () => this.post('/patient/onboarding/complete', payload),
    );
  }

  async uploadReport(payload: ReportUploadPayload) {
    return mockOrApi(
      () => mockUploadReport(payload),
      () => this.post('/patient/reports/upload', payload),
    );
  }

  async runPreScreen() {
    return mockOrApi(
      () => mockRunPreScreen(),
      () => this.post('/patient/ai/prescreen'),
    );
  }

  async getAssessment(): Promise<AiAssessment | null> {
    return mockOrApi(
      () => mockGetAssessment(),
      () => this.get<AiAssessment | null>('/patient/ai/assessment'),
    );
  }

  async listAddresses(): Promise<PatientAddress[]> {
    return mockOrApi(
      () => mockListAddresses(),
      () => this.get<PatientAddress[]>('/patient/addresses'),
    );
  }

  async listHomeVisits(): Promise<HomeVisit[]> {
    return mockOrApi(
      () => mockListHomeVisits(),
      () => this.get<HomeVisit[]>('/patient/home-visits'),
    );
  }

  async bookHomeVisit(payload: BookVisitPayload): Promise<HomeVisit> {
    return mockOrApi(
      () => mockBookHomeVisit(payload),
      () => this.post<HomeVisit>('/patient/home-visits', payload),
    );
  }

  async getPendingPrescriptions(): Promise<PendingPrescription[]> {
    return mockOrApi(
      () => mockGetPendingPrescriptions(),
      () => this.get<PendingPrescription[]>('/doctor/prescriptions/pending'),
    );
  }

  async getPrescription(id: string) {
    return mockOrApi(
      () => mockGetPrescription(id),
      () =>
        this.get<PendingPrescription & { diet_plan: string; exercise_plan: string; monitoring_plan: string; items: unknown[] }>(
          `/doctor/prescriptions/${id}`,
        ),
    );
  }

  async approvePrescription(id: string, doctorNotes?: string) {
    return mockOrApi(
      () => mockApprovePrescription(id, doctorNotes),
      () => this.post(`/doctor/prescriptions/${id}/approve`, { doctorNotes }),
    );
  }

  async editPrescription(id: string, payload: Record<string, unknown>) {
    return mockOrApi(
      () => mockEditPrescription(id, payload),
      () => this.put(`/doctor/prescriptions/${id}`, payload),
    );
  }

  async getTechnicianVisitsToday(): Promise<TechnicianVisit[]> {
    return mockOrApi(
      () => mockGetTechnicianVisitsToday(),
      () => this.get<TechnicianVisit[]>('/technician/visits/today'),
    );
  }

  async getTechnicianVisit(id: string): Promise<VisitDetail> {
    return mockOrApi(
      () => mockGetTechnicianVisit(id),
      () => this.get<VisitDetail>(`/technician/visits/${id}`),
    );
  }

  async captureConsent(visitId: string) {
    return mockOrApi(
      () => mockCaptureConsent(visitId),
      () => this.post(`/technician/visits/${visitId}/consent`, { consentType: 'home_visit', accepted: true }),
    );
  }

  async captureVitals(visitId: string, payload: Record<string, unknown>) {
    return mockOrApi(
      () => mockCaptureVitals(visitId, payload),
      () => this.post(`/technician/visits/${visitId}/vitals`, payload),
    );
  }

  async captureLiverFibrosisScan(visitId: string, payload: Record<string, unknown>) {
    return mockOrApi(
      () => mockCaptureLiverFibrosisScan(visitId, payload),
      () => this.post(`/technician/visits/${visitId}/liver-fibrosis-scan`, payload),
    );
  }

  async collectSample(visitId: string, payload: Record<string, unknown>) {
    return mockOrApi(
      () => mockCollectSample(visitId, payload),
      () => this.post(`/technician/visits/${visitId}/sample-collected`, payload),
    );
  }

  async completeVisit(visitId: string) {
    return mockOrApi(
      () => mockCompleteVisit(visitId),
      () => this.post(`/technician/visits/${visitId}/complete`),
    );
  }
}

export const journeyService = new JourneyService();
