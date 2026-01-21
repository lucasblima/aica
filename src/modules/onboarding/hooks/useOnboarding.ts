/**
 * useOnboarding Hook
 * Sprint: "Ordem ao Caos do WhatsApp"
 *
 * Hook for managing onboarding state and step navigation.
 *
 * @example
 * const { currentStep, goToNextStep, complete } = useOnboarding()
 *
 * @see PR #120 - WhatsApp Onboarding Flow
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useOnboarding');
import {
  getUserProfile,
  getWhatsAppSession,
  getUserCredits,
  updateOnboardingStep,
  completeOnboarding as completeOnboardingService,
  initializeOnboardingData,
} from '../services/onboardingService';
import type {
  OnboardingStep,
  UserProfile,
  WhatsAppSession,
  UserCredits,
  UseOnboardingReturn,
} from '../types';
import { ONBOARDING_STEPS } from '../types';

export function useOnboarding(): UseOnboardingReturn {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);

  // Derived state
  const currentStep = profile?.onboarding_step || 'welcome';
  const stepIndex = ONBOARDING_STEPS.indexOf(currentStep);
  const totalSteps = ONBOARDING_STEPS.length;
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  // Load onboarding data
  const loadData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to get existing profile
      let userProfile = await getUserProfile(user.id);

      // If no profile exists, initialize everything
      if (!userProfile) {
        const data = await initializeOnboardingData(user.id);
        userProfile = data.profile;
        setCredits(data.credits);
      } else {
        // Load session and credits
        const [sessionData, creditsData] = await Promise.all([
          getWhatsAppSession(user.id),
          getUserCredits(user.id),
        ]);
        setSession(sessionData);
        setCredits(creditsData);
      }

      setProfile(userProfile);
    } catch (err) {
      log.error('Error loading onboarding data:', err);
      setError('Falha ao carregar dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigate to step
  const goToStep = useCallback(
    async (step: OnboardingStep) => {
      if (!user?.id) return;

      setError(null);
      const success = await updateOnboardingStep(user.id, step);

      if (success) {
        setProfile((prev) =>
          prev ? { ...prev, onboarding_step: step } : null
        );
      } else {
        setError('Falha ao atualizar progresso. Tente novamente.');
      }
    },
    [user?.id]
  );

  // Go to next step
  const goToNextStep = useCallback(async () => {
    if (isLastStep) return;

    const nextStep = ONBOARDING_STEPS[stepIndex + 1];
    await goToStep(nextStep);
  }, [stepIndex, isLastStep, goToStep]);

  // Go to previous step
  const goToPreviousStep = useCallback(async () => {
    if (isFirstStep) return;

    const prevStep = ONBOARDING_STEPS[stepIndex - 1];
    await goToStep(prevStep);
  }, [stepIndex, isFirstStep, goToStep]);

  // Complete onboarding
  const complete = useCallback(async () => {
    if (!user?.id) return;

    setError(null);
    const success = await completeOnboardingService(user.id);

    if (success) {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              onboarding_step: 'ready',
              onboarding_completed_at: new Date().toISOString(),
            }
          : null
      );
      // Navigate to main app
      navigate('/meu-dia', { replace: true });
    } else {
      setError('Falha ao completar onboarding. Tente novamente.');
    }
  }, [user?.id, navigate]);

  // Skip onboarding
  const skip = useCallback(async () => {
    if (!user?.id) return;

    setError(null);
    const success = await completeOnboardingService(user.id);

    if (success) {
      navigate('/meu-dia', { replace: true });
    } else {
      setError('Falha ao pular onboarding. Tente novamente.');
    }
  }, [user?.id, navigate]);

  // Refresh data
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    currentStep,
    stepIndex,
    totalSteps,
    progress,
    isFirstStep,
    isLastStep,
    isLoading,
    error,
    profile,
    session,
    credits,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    complete,
    skip,
    refresh,
  };
}

export default useOnboarding;
