import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  ParQWizardStep,
  ParQRiskLevel,
  FollowUpCategory,
  ParQStatus,
  SubmitParQInput,
} from '../types/parq';
import { ParQService } from '../services/parqService';
import {
  PARQ_FOLLOWUP_CATEGORIES,
  calculateRiskFromFollowUps,
  riskToClearance,
} from '../components/parq/ParQQuestionConstants';

// ============================================
// TYPES
// ============================================

interface UseParQOptions {
  athleteId: string;
  filledByRole: 'athlete' | 'coach';
}

interface UseParQReturn {
  // Wizard state
  step: ParQWizardStep;
  classicAnswers: boolean[];
  followUpAnswers: Record<string, Record<string, boolean>>;
  activeFollowUpCategories: FollowUpCategory[];
  calculatedRisk: ParQRiskLevel | null;
  calculatedClearance: 'cleared' | 'cleared_with_restrictions' | 'blocked' | null;
  restrictions: string[];
  signatureText: string;
  isSubmitting: boolean;
  submitError: string | null;

  // PAR-Q status from DB
  parqStatus: ParQStatus | null;
  isLoadingStatus: boolean;

  // Actions
  setStep: (step: ParQWizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setClassicAnswer: (index: number, value: boolean) => void;
  setFollowUpAnswer: (category: FollowUpCategory, questionId: string, value: boolean) => void;
  setSignatureText: (text: string) => void;
  submitParQ: () => Promise<boolean>;
  resetWizard: () => void;
  refetchStatus: () => Promise<void>;
}

// ============================================
// CONSTANTS
// ============================================

const INITIAL_CLASSIC_ANSWERS: boolean[] = [false, false, false, false, false, false, false];

// Maps classic question index -> triggered follow-up categories
const CLASSIC_TO_FOLLOWUP_MAP: Record<number, FollowUpCategory[]> = {
  0: ['cardiovascular'],                       // q1: cardiac condition
  1: ['cardiovascular', 'respiratory'],         // q2: chest pain during activity
  2: ['cardiovascular', 'respiratory'],         // q3: chest pain at rest
  3: ['neurological', 'cardiovascular'],        // q4: dizziness / balance loss
  4: ['musculoskeletal', 'spinal'],             // q5: bone/joint problems
  5: ['cardiovascular'],                        // q6: blood pressure meds
  // q7 (index 6) triggers ALL categories - handled separately
};

const ALL_FOLLOWUP_CATEGORIES: FollowUpCategory[] = PARQ_FOLLOWUP_CATEGORIES.map(b => b.category);

// ============================================
// HOOK
// ============================================

export function useParQ({ athleteId, filledByRole }: UseParQOptions): UseParQReturn {
  // ----- Wizard state -----
  const [step, setStep] = useState<ParQWizardStep>('intro');
  const [classicAnswers, setClassicAnswers] = useState<boolean[]>([...INITIAL_CLASSIC_ANSWERS]);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, Record<string, boolean>>>({});
  const [signatureText, setSignatureText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ----- PAR-Q status from DB -----
  const [parqStatus, setParqStatus] = useState<ParQStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // ============================================
  // COMPUTED: Active follow-up categories
  // ============================================

  const activeFollowUpCategories = useMemo<FollowUpCategory[]>(() => {
    const categories = new Set<FollowUpCategory>();

    classicAnswers.forEach((answer, index) => {
      if (!answer) return;

      if (index === 6) {
        // q7 ("other reason") triggers ALL categories
        ALL_FOLLOWUP_CATEGORIES.forEach(cat => categories.add(cat));
      } else {
        const mapped = CLASSIC_TO_FOLLOWUP_MAP[index];
        if (mapped) {
          mapped.forEach(cat => categories.add(cat));
        }
      }
    });

    return Array.from(categories);
  }, [classicAnswers]);

  // ============================================
  // COMPUTED: Risk level & clearance
  // ============================================

  const { calculatedRisk, calculatedClearance, restrictions } = useMemo(() => {
    const hasAnyYes = classicAnswers.some(Boolean);

    if (!hasAnyYes) {
      return {
        calculatedRisk: 'low' as ParQRiskLevel,
        calculatedClearance: 'cleared' as const,
        restrictions: [] as string[],
      };
    }

    const result = calculateRiskFromFollowUps(activeFollowUpCategories, followUpAnswers);

    return {
      calculatedRisk: result.risk,
      calculatedClearance: riskToClearance(result.risk),
      restrictions: result.restrictions,
    };
  }, [classicAnswers, activeFollowUpCategories, followUpAnswers]);

  // ============================================
  // ACTIONS: Classic answers
  // ============================================

  const setClassicAnswer = useCallback((index: number, value: boolean) => {
    setClassicAnswers(prev => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  // ============================================
  // ACTIONS: Follow-up answers
  // ============================================

  const setFollowUpAnswer = useCallback(
    (category: FollowUpCategory, questionId: string, value: boolean) => {
      setFollowUpAnswers(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [questionId]: value,
        },
      }));
    },
    []
  );

  // ============================================
  // NAVIGATION: Step machine
  // ============================================

  const hasAnyClassicYes = useMemo(() => classicAnswers.some(Boolean), [classicAnswers]);

  const needsUploadStep = useMemo(
    () => calculatedClearance === 'blocked' || calculatedClearance === 'cleared_with_restrictions',
    [calculatedClearance]
  );

  const nextStep = useCallback(() => {
    setStep(current => {
      switch (current) {
        case 'intro':
          return 'classic';
        case 'classic':
          return hasAnyClassicYes ? 'followup' : 'result';
        case 'followup':
          return 'result';
        case 'result':
          return 'sign';
        case 'sign':
          return needsUploadStep ? 'upload' : 'upload'; // always go to upload as final step
        case 'upload':
          return 'upload'; // terminal
        default:
          return current;
      }
    });
  }, [hasAnyClassicYes, needsUploadStep]);

  const prevStep = useCallback(() => {
    setStep(current => {
      switch (current) {
        case 'classic':
          return 'intro';
        case 'followup':
          return 'classic';
        case 'result':
          return hasAnyClassicYes ? 'followup' : 'classic';
        case 'sign':
          return 'result';
        case 'upload':
          return 'sign';
        default:
          return current;
      }
    });
  }, [hasAnyClassicYes]);

  // ============================================
  // PAR-Q STATUS: Load from DB
  // ============================================

  const refetchStatus = useCallback(async () => {
    if (!athleteId) return;
    setIsLoadingStatus(true);
    try {
      const { data: status } = await ParQService.getParQStatus(athleteId);
      if (status) setParqStatus(status);
    } catch {
      // Status fetch failure is non-fatal; leave previous value
      console.warn('[useParQ] Failed to fetch PAR-Q status');
    } finally {
      setIsLoadingStatus(false);
    }
  }, [athleteId]);

  useEffect(() => {
    refetchStatus();
  }, [refetchStatus]);

  // ============================================
  // SUBMIT
  // ============================================

  const submitParQ = useCallback(async (): Promise<boolean> => {
    if (!athleteId || !calculatedRisk || !calculatedClearance) return false;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const input: SubmitParQInput = {
        athlete_id: athleteId,
        filled_by_role: filledByRole,
        classic_answers: classicAnswers,
        followup_answers: hasAnyClassicYes ? followUpAnswers : null,
        risk_level: calculatedRisk,
        clearance_status: calculatedClearance,
        restrictions,
        signature_text: signatureText,
      };

      const { error: submitErr } = await ParQService.submitParQResponse(input);
      if (submitErr) throw submitErr;
      await refetchStatus();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar PAR-Q. Tente novamente.';
      setSubmitError(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    athleteId,
    filledByRole,
    classicAnswers,
    followUpAnswers,
    hasAnyClassicYes,
    calculatedRisk,
    calculatedClearance,
    restrictions,
    signatureText,
    refetchStatus,
  ]);

  // ============================================
  // RESET
  // ============================================

  const resetWizard = useCallback(() => {
    setStep('intro');
    setClassicAnswers([...INITIAL_CLASSIC_ANSWERS]);
    setFollowUpAnswers({});
    setSignatureText('');
    setIsSubmitting(false);
    setSubmitError(null);
  }, []);

  // ============================================
  // RETURN
  // ============================================

  return {
    // Wizard state
    step,
    classicAnswers,
    followUpAnswers,
    activeFollowUpCategories,
    calculatedRisk,
    calculatedClearance,
    restrictions,
    signatureText,
    isSubmitting,
    submitError,

    // PAR-Q status from DB
    parqStatus,
    isLoadingStatus,

    // Actions
    setStep,
    nextStep,
    prevStep,
    setClassicAnswer,
    setFollowUpAnswer,
    setSignatureText,
    submitParQ,
    resetWizard,
    refetchStatus,
  };
}
