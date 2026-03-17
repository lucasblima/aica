/**
 * useOrganizationProgress Hook
 * Issue #100 - Wizard gamificado para cadastro completo de organizações
 *
 * Calculates and tracks organization profile completion progress.
 */

import { useMemo } from 'react';
import type { Organization } from '../types/organizations';
import {
  WIZARD_STEPS,
  COMPLETION_LEVELS,
  getCompletionLevel,
  calculateCompletionPercentage,
  calculateTotalXpPotential,
  type CompletionLevelConfig,
  type WizardStep,
} from '../types/wizard';

export interface OrganizationProgress {
  // Completion metrics
  completionPercentage: number;
  completionLevel: CompletionLevelConfig;
  previousLevel: CompletionLevelConfig | null;
  nextLevel: CompletionLevelConfig | null;
  percentageToNextLevel: number;

  // Field counts
  filledFieldsCount: number;
  totalFieldsCount: number;
  requiredFieldsCount: number;
  filledRequiredCount: number;

  // XP metrics
  xpEarned: number;
  xpPotential: number;
  xpPercentage: number;

  // Step progress
  completedStepsCount: number;
  totalStepsCount: number;
  currentStepProgress: number[];

  // Helpers
  isComplete: boolean;
  hasMinimumRequired: boolean;
}

/**
 * Hook to calculate organization profile completion progress
 */
export function useOrganizationProgress(
  formData: Partial<Organization>,
  fieldXpMap: Record<string, boolean> = {},
  steps: WizardStep[] = WIZARD_STEPS
): OrganizationProgress {
  return useMemo(() => {
    // Calculate all fields
    const allFields = steps.flatMap(step => step.fields);
    const requiredFields = allFields.filter(f => f.required);
    const totalFieldsCount = allFields.length;
    const requiredFieldsCount = requiredFields.length;

    // Count filled fields
    let filledFieldsCount = 0;
    let filledRequiredCount = 0;

    allFields.forEach(field => {
      const value = formData[field.name];
      const isFilled = value !== undefined && value !== null && value !== '' &&
        !(Array.isArray(value) && value.length === 0);

      if (isFilled) {
        filledFieldsCount++;
        if (field.required) {
          filledRequiredCount++;
        }
      }
    });

    // Calculate completion percentage
    const completionPercentage = calculateCompletionPercentage(formData, steps);

    // Get completion level
    const completionLevel = getCompletionLevel(completionPercentage);
    const levelIndex = COMPLETION_LEVELS.findIndex(l => l.level === completionLevel.level);
    const previousLevel = levelIndex > 0 ? COMPLETION_LEVELS[levelIndex - 1] : null;
    const nextLevel = levelIndex < COMPLETION_LEVELS.length - 1 ? COMPLETION_LEVELS[levelIndex + 1] : null;

    // Calculate percentage to next level
    const percentageToNextLevel = nextLevel
      ? Math.max(0, Math.min(100,
          ((completionPercentage - completionLevel.minPercentage) /
           (nextLevel.minPercentage - completionLevel.minPercentage)) * 100
        ))
      : 100;

    // Calculate XP
    let xpEarned = 0;
    allFields.forEach(field => {
      if (fieldXpMap[field.name as string]) {
        xpEarned += field.xpValue;
      }
    });

    // Add step completion bonuses (estimate based on completion)
    const completedStepsCount = steps.filter((step, index) => {
      const stepFields = step.fields;
      if (stepFields.length === 0) return completionPercentage >= 80;

      const filledInStep = stepFields.filter(field => {
        const value = formData[field.name];
        return value !== undefined && value !== null && value !== '' &&
          !(Array.isArray(value) && value.length === 0);
      }).length;

      const requiredInStep = stepFields.filter(f => f.required);
      const filledRequiredInStep = requiredInStep.filter(field => {
        const value = formData[field.name];
        return value !== undefined && value !== null && value !== '';
      }).length;

      // Step is complete if all required fields are filled
      return requiredInStep.length === 0 || filledRequiredInStep === requiredInStep.length;
    }).length;

    // Calculate step completion bonuses
    const stepBonuses = steps
      .slice(0, completedStepsCount)
      .reduce((sum, step) => sum + step.xpReward, 0);
    xpEarned += stepBonuses;

    const xpPotential = calculateTotalXpPotential(steps);
    const xpPercentage = Math.round((xpEarned / xpPotential) * 100);

    // Calculate per-step progress
    const currentStepProgress = steps.map(step => {
      if (step.fields.length === 0) return completionPercentage >= 80 ? 100 : 0;

      const filledInStep = step.fields.filter(field => {
        const value = formData[field.name];
        return value !== undefined && value !== null && value !== '' &&
          !(Array.isArray(value) && value.length === 0);
      }).length;

      return Math.round((filledInStep / step.fields.length) * 100);
    });

    // Check completion status
    const isComplete = completionPercentage >= 80;
    const hasMinimumRequired = filledRequiredCount === requiredFieldsCount;

    return {
      completionPercentage,
      completionLevel,
      previousLevel,
      nextLevel,
      percentageToNextLevel,
      filledFieldsCount,
      totalFieldsCount,
      requiredFieldsCount,
      filledRequiredCount,
      xpEarned,
      xpPotential,
      xpPercentage,
      completedStepsCount,
      totalStepsCount: steps.length,
      currentStepProgress,
      isComplete,
      hasMinimumRequired,
    };
  }, [formData, fieldXpMap, steps]);
}

/**
 * Get motivational message based on progress
 */
export function getProgressMessage(progress: OrganizationProgress): string {
  if (progress.isComplete) {
    return 'Parabens! Seu perfil esta completo e pronto para brilhar!';
  }

  if (progress.completionPercentage >= 80) {
    return 'Quase la! Complete os ultimos detalhes para o nivel Diamante!';
  }

  if (progress.completionPercentage >= 50) {
    return 'Otimo progresso! Continue preenchendo para desbloquear mais recursos.';
  }

  if (progress.completionPercentage >= 25) {
    return 'Bom comeco! Adicione mais informações para destacar sua organizacao.';
  }

  return 'Comece a preencher seu perfil para ganhar XP e desbloquear recursos!';
}

/**
 * Get next recommended field to fill
 */
export function getNextRecommendedField(
  formData: Partial<Organization>,
  steps: WizardStep[]
): { stepIndex: number; fieldName: string } | null {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // First check required fields
    for (const field of step.fields.filter(f => f.required)) {
      const value = formData[field.name];
      if (value === undefined || value === null || value === '' ||
          (Array.isArray(value) && value.length === 0)) {
        return { stepIndex: i, fieldName: field.name as string };
      }
    }
  }

  // Then check optional fields with highest XP value
  let bestField: { stepIndex: number; fieldName: string; xp: number } | null = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    for (const field of step.fields.filter(f => !f.required)) {
      const value = formData[field.name];
      if (value === undefined || value === null || value === '' ||
          (Array.isArray(value) && value.length === 0)) {
        if (!bestField || field.xpValue > bestField.xp) {
          bestField = { stepIndex: i, fieldName: field.name as string, xp: field.xpValue };
        }
      }
    }
  }

  return bestField ? { stepIndex: bestField.stepIndex, fieldName: bestField.fieldName } : null;
}

export default useOrganizationProgress;
