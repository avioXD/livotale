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

class JourneyService extends BaseApiService {
  async getOnboardingStatus(): Promise<{ onboardingComplete: boolean; journeyStatus: string; currentStep: string }> {
    return this.get('/patient/onboarding/status');
  }

  async getDashboardAnalytics(): Promise<PatientDashboardData> {
    return this.get<PatientDashboardData>('/patient/dashboard/analytics');
  }

  async getJourney(): Promise<JourneyState> {
    return this.get<JourneyState>('/patient/journey');
  }

  async getQuestionnaire(code: string): Promise<Questionnaire> {
    return this.get<Questionnaire>(`/patient/questionnaires/${code}`);
  }

  async submitQuestionnaire(code: string, answers: QuestionnaireAnswerInput[]) {
    return this.post(`/patient/questionnaires/${code}/responses`, { answers });
  }

  async completeOnboarding(payload: OnboardingPayload) {
    return this.post('/patient/onboarding/complete', payload);
  }

  async uploadReport(payload: ReportUploadPayload) {
    return this.post('/patient/reports/upload', payload);
  }

  async runPreScreen() {
    return this.post('/patient/ai/prescreen');
  }

  async getAssessment(): Promise<AiAssessment | null> {
    return this.get<AiAssessment | null>('/patient/ai/assessment');
  }

  async listAddresses(): Promise<PatientAddress[]> {
    return this.get<PatientAddress[]>('/patient/addresses');
  }

  async listHomeVisits(): Promise<HomeVisit[]> {
    return this.get<HomeVisit[]>('/patient/home-visits');
  }

  async bookHomeVisit(payload: BookVisitPayload): Promise<HomeVisit> {
    return this.post<HomeVisit>('/patient/home-visits', payload);
  }

  async getPendingPrescriptions(): Promise<PendingPrescription[]> {
    return this.get<PendingPrescription[]>('/doctor/prescriptions/pending');
  }

  async getPrescription(id: string) {
    return this.get<PendingPrescription & { diet_plan: string; exercise_plan: string; monitoring_plan: string; items: unknown[] }>(`/doctor/prescriptions/${id}`);
  }

  async approvePrescription(id: string, doctorNotes?: string) {
    return this.post(`/doctor/prescriptions/${id}/approve`, { doctorNotes });
  }

  async editPrescription(id: string, payload: Record<string, unknown>) {
    return this.put(`/doctor/prescriptions/${id}`, payload);
  }

  async getTechnicianVisitsToday(): Promise<TechnicianVisit[]> {
    return this.get<TechnicianVisit[]>('/technician/visits/today');
  }

  async getTechnicianVisit(id: string): Promise<VisitDetail> {
    return this.get<VisitDetail>(`/technician/visits/${id}`);
  }

  async captureConsent(visitId: string) {
    return this.post(`/technician/visits/${visitId}/consent`, { consentType: 'home_visit', accepted: true });
  }

  async captureVitals(visitId: string, payload: Record<string, unknown>) {
    return this.post(`/technician/visits/${visitId}/vitals`, payload);
  }

  async captureLiver Fibrosis Scan(visitId: string, payload: Record<string, unknown>) {
    return this.post(`/technician/visits/${visitId}/Liver Fibrosis Scan`, payload);
  }

  async collectSample(visitId: string, payload: Record<string, unknown>) {
    return this.post(`/technician/visits/${visitId}/sample-collected`, payload);
  }

  async completeVisit(visitId: string) {
    return this.post(`/technician/visits/${visitId}/complete`);
  }
}

export const journeyService = new JourneyService();
