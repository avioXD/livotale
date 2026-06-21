import { create } from 'zustand';
import { journeyService } from '@/services/journey';
import { isPatientOnboardingComplete } from '@/utils/journeyHelpers';
import type {
  AiAssessment,
  BookVisitPayload,
  JourneyState,
  OnboardingPayload,
  Questionnaire,
  QuestionnaireAnswerInput,
  ReportUploadPayload,
} from '@/types';

export const JOURNEY_STEPS = [
  'profile',
  'symptoms',
  'risk',
  'reports',
  'prescreen',
  'booking',
  'complete',
] as const;

export type JourneyStep = (typeof JOURNEY_STEPS)[number];

interface JourneyStoreState {
  step: JourneyStep;
  journey: JourneyState | null;
  onboardingComplete: boolean;
  onboardingLoaded: boolean;
  symptomsQuestionnaire: Questionnaire | null;
  riskQuestionnaire: Questionnaire | null;
  symptomsAnswers: Record<string, string | boolean>;
  riskAnswers: Record<string, string | boolean>;
  assessment: AiAssessment | null;
  isLoading: boolean;
  error: string | null;
  setStep: (step: JourneyStep) => void;
  loadJourney: () => Promise<void>;
  loadOnboardingStatus: () => Promise<void>;
  loadQuestionnaires: () => Promise<void>;
  setAnswer: (questionnaire: 'symptoms' | 'risk', questionId: string, answer: string | boolean) => void;
  submitProfile: (payload: OnboardingPayload) => Promise<void>;
  submitSymptoms: () => Promise<void>;
  submitRisk: () => Promise<void>;
  uploadReport: (payload: ReportUploadPayload) => Promise<void>;
  runPreScreen: () => Promise<void>;
  bookVisit: (payload: BookVisitPayload) => Promise<void>;
  clearError: () => void;
}

function answersToPayload(answers: Record<string, string | boolean>): QuestionnaireAnswerInput[] {
  return Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));
}

function inferStep(journey: JourneyState | null): JourneyStep {
  if (!journey) return 'profile';
  if (journey.currentStep && JOURNEY_STEPS.includes(journey.currentStep as JourneyStep)) {
    return journey.currentStep as JourneyStep;
  }
  if (isPatientOnboardingComplete(journey)) return 'complete';
  return 'profile';
}

export const useJourneyStore = create<JourneyStoreState>((set, get) => ({
  step: 'profile',
  journey: null,
  onboardingComplete: false,
  onboardingLoaded: false,
  symptomsQuestionnaire: null,
  riskQuestionnaire: null,
  symptomsAnswers: {},
  riskAnswers: {},
  assessment: null,
  isLoading: false,
  error: null,

  setStep: (step) => set({ step }),

  loadJourney: async () => {
    set({ isLoading: true, error: null });
    try {
      const journey = await journeyService.getJourney();
      const onboardingComplete = isPatientOnboardingComplete(journey);
      set({
        journey,
        step: inferStep(journey),
        assessment: journey.assessment,
        onboardingComplete,
        onboardingLoaded: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load journey' });
    }
  },

  loadOnboardingStatus: async () => {
    try {
      const status = await journeyService.getOnboardingStatus();
      set({
        onboardingComplete: status.onboardingComplete,
        onboardingLoaded: true,
        step: JOURNEY_STEPS.includes(status.currentStep as JourneyStep)
          ? (status.currentStep as JourneyStep)
          : get().step,
      });
    } catch {
      set({ onboardingComplete: false, onboardingLoaded: true });
    }
  },

  loadQuestionnaires: async () => {
    set({ isLoading: true, error: null });
    try {
      const [symptomsQuestionnaire, riskQuestionnaire] = await Promise.all([
        journeyService.getQuestionnaire('LIVER_SYMPTOMS'),
        journeyService.getQuestionnaire('LIVER_RISK'),
      ]);
      set({ symptomsQuestionnaire, riskQuestionnaire, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load questionnaires' });
    }
  },

  setAnswer: (questionnaire, questionId, answer) => {
    if (questionnaire === 'symptoms') {
      set({ symptomsAnswers: { ...get().symptomsAnswers, [questionId]: answer } });
    } else {
      set({ riskAnswers: { ...get().riskAnswers, [questionId]: answer } });
    }
  },

  submitProfile: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await journeyService.completeOnboarding(payload);
      await get().loadJourney();
      set({ step: 'symptoms', isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to save profile' });
      throw err;
    }
  },

  submitSymptoms: async () => {
    set({ isLoading: true, error: null });
    try {
      await journeyService.submitQuestionnaire('LIVER_SYMPTOMS', answersToPayload(get().symptomsAnswers));
      set({ step: 'risk', isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to submit symptoms' });
      throw err;
    }
  },

  submitRisk: async () => {
    set({ isLoading: true, error: null });
    try {
      await journeyService.submitQuestionnaire('LIVER_RISK', answersToPayload(get().riskAnswers));
      set({ step: 'reports', isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to submit risk assessment' });
      throw err;
    }
  },

  uploadReport: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await journeyService.uploadReport(payload);
      set({ isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to upload report' });
      throw err;
    }
  },

  runPreScreen: async () => {
    set({ isLoading: true, error: null });
    try {
      await journeyService.runPreScreen();
      const assessment = await journeyService.getAssessment();
      await get().loadJourney();
      set({ assessment, step: 'booking', isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'AI pre-screening failed' });
      throw err;
    }
  },

  bookVisit: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await journeyService.bookHomeVisit(payload);
      await get().loadJourney();
      set({ step: 'complete', onboardingComplete: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to book visit' });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
