/**
 * useOrganizationWizard Hook
 * Issue #100 - Wizard gamificado para cadastro completo de organizações
 *
 * State machine for the organization wizard with gamification.
 */

import React, { useReducer, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import type { Organization } from '../types/organizations';
import { createVentureFromOrganization } from '../services/organizationVenturesService';
import {
  WIZARD_STEPS,
  type WizardState,
  type WizardAction,
  type WizardStep,
  type WizardStepId,
} from '../types/wizard';
import { useOrganizationProgress, type OrganizationProgress } from './useOrganizationProgress';

// =============================================================================
// Initial State
// =============================================================================

const initialState: WizardState = {
  currentStepIndex: 0,
  completedSteps: [],
  formData: {
    is_active: true,
    areas_of_activity: [],
    brand_colors: {},
    social_links: {},
  },
  totalXpEarned: 0,
  fieldXpMap: {},
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
};

// =============================================================================
// Reducer
// =============================================================================

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        currentStepIndex: Math.max(0, Math.min(action.stepIndex, WIZARD_STEPS.length - 1)),
      };

    case 'NEXT_STEP':
      return {
        ...state,
        currentStepIndex: Math.min(state.currentStepIndex + 1, WIZARD_STEPS.length - 1),
      };

    case 'PREV_STEP':
      return {
        ...state,
        currentStepIndex: Math.max(state.currentStepIndex - 1, 0),
      };

    case 'UPDATE_FIELD':
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.field]: action.value,
        },
        isDirty: true,
      };

    case 'AWARD_FIELD_XP':
      if (state.fieldXpMap[action.field]) {
        return state; // XP already awarded for this field
      }
      return {
        ...state,
        fieldXpMap: {
          ...state.fieldXpMap,
          [action.field]: true,
        },
        totalXpEarned: state.totalXpEarned + action.xp,
      };

    case 'COMPLETE_STEP':
      if (state.completedSteps.includes(action.stepId)) {
        return state;
      }
      return {
        ...state,
        completedSteps: [...state.completedSteps, action.stepId],
      };

    case 'SET_SAVING':
      return {
        ...state,
        isSaving: action.isSaving,
      };

    case 'SET_SAVED':
      return {
        ...state,
        isSaving: false,
        isDirty: false,
        lastSavedAt: action.timestamp,
      };

    case 'LOAD_DATA': {
      // Calculate which fields already have values (for XP tracking)
      const loadedFieldXpMap: Record<string, boolean> = {};
      const allFields = WIZARD_STEPS.flatMap(step => step.fields);

      allFields.forEach(field => {
        const value = action.data[field.name];
        if (value !== undefined && value !== null && value !== '' &&
            !(Array.isArray(value) && value.length === 0)) {
          loadedFieldXpMap[field.name as string] = true;
        }
      });

      return {
        ...state,
        formData: {
          ...initialState.formData,
          ...action.data,
        },
        fieldXpMap: loadedFieldXpMap,
        isDirty: false,
      };
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// =============================================================================
// Hook
// =============================================================================

export interface UseOrganizationWizardReturn {
  // State
  state: WizardState;
  progress: OrganizationProgress;
  currentStep: WizardStep;
  isFirstStep: boolean;
  isLastStep: boolean;

  // Navigation
  goToStep: (index: number) => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;

  // Form
  updateField: (field: keyof Organization, value: unknown) => void;
  awardFieldXp: (field: string, xp: number) => void;
  completeStep: (stepId: WizardStepId) => void;

  // Persistence
  save: () => Promise<boolean>;
  load: (organizationId?: string) => Promise<void>;

  // Status
  isLoading: boolean;
  error: string | null;
}

export function useOrganizationWizard(
  organizationId?: string
): UseOrganizationWizardReturn {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate progress
  const progress = useOrganizationProgress(state.formData, state.fieldXpMap);

  // Current step info
  const currentStep = WIZARD_STEPS[state.currentStepIndex];
  const isFirstStep = state.currentStepIndex === 0;
  const isLastStep = state.currentStepIndex === WIZARD_STEPS.length - 1;

  // =============================================================================
  // Navigation
  // =============================================================================

  const goToStep = useCallback((index: number) => {
    dispatch({ type: 'SET_STEP', stepIndex: index });
  }, []);

  const goToNextStep = useCallback(() => {
    // Mark current step as completed if requirements met
    const step = WIZARD_STEPS[state.currentStepIndex];
    const requiredFields = step.fields.filter(f => f.required);
    const allRequiredFilled = requiredFields.every(field => {
      const value = state.formData[field.name];
      return value !== undefined && value !== null && value !== '' &&
        !(Array.isArray(value) && value.length === 0);
    });

    if (allRequiredFilled || requiredFields.length === 0) {
      dispatch({ type: 'COMPLETE_STEP', stepId: step.id });
    }

    dispatch({ type: 'NEXT_STEP' });
  }, [state.currentStepIndex, state.formData]);

  const goToPrevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  // =============================================================================
  // Form Management
  // =============================================================================

  const updateField = useCallback((field: keyof Organization, value: unknown) => {
    dispatch({ type: 'UPDATE_FIELD', field, value });

    // Award XP if field is now filled and wasn't before
    if (!state.fieldXpMap[field as string]) {
      const isFilled = value !== undefined && value !== null && value !== '' &&
        !(Array.isArray(value) && value.length === 0);

      if (isFilled) {
        const fieldConfig = WIZARD_STEPS
          .flatMap(step => step.fields)
          .find(f => f.name === field);

        if (fieldConfig) {
          dispatch({ type: 'AWARD_FIELD_XP', field: field as string, xp: fieldConfig.xpValue });
        }
      }
    }
  }, [state.fieldXpMap]);

  const awardFieldXp = useCallback((field: string, xp: number) => {
    dispatch({ type: 'AWARD_FIELD_XP', field, xp });
  }, []);

  const completeStep = useCallback((stepId: WizardStepId) => {
    dispatch({ type: 'COMPLETE_STEP', stepId });
  }, []);

  // =============================================================================
  // Persistence
  // =============================================================================

  const save = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError('Usuario não autenticado');
      return false;
    }

    dispatch({ type: 'SET_SAVING', isSaving: true });
    setError(null);

    try {
      const dataToSave = {
        ...state.formData,
        user_id: user.id,
        profile_completeness: progress.completionPercentage,
        updated_at: new Date().toISOString(),
      };

      let result;
      let isNewOrganization = false;

      if (organizationId) {
        // Update existing
        result = await supabase
          .from('organizations')
          .update(dataToSave)
          .eq('id', organizationId)
          .select()
          .single();
      } else {
        // Create new
        isNewOrganization = true;
        result = await supabase
          .from('organizations')
          .insert(dataToSave)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      // Se for uma nova organizacao, criar Venture automaticamente
      if (isNewOrganization && result.data?.id) {
        const newOrgId = result.data.id as string;

        const ventureResult = await createVentureFromOrganization(newOrgId);

        // Venture creation failure is non-blocking - operation continues
        // Error details available in ventureResult.error if needed for debugging
        void ventureResult;
      }

      dispatch({ type: 'SET_SAVED', timestamp: new Date().toISOString() });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
      dispatch({ type: 'SET_SAVING', isSaving: false });
      return false;
    }
  }, [user, state.formData, progress.completionPercentage, organizationId]);

  const load = useCallback(async (id?: string): Promise<void> => {
    const loadId = id || organizationId;
    if (!loadId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', loadId)
        .single();

      if (loadError) throw loadError;

      if (data) {
        dispatch({ type: 'LOAD_DATA', data });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  // =============================================================================
  // Auto-save
  // =============================================================================

  useEffect(() => {
    if (state.isDirty && !state.isSaving) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new auto-save timeout (5 seconds after last change)
      autoSaveTimeoutRef.current = setTimeout(() => {
        save();
      }, 5000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [state.isDirty, state.isSaving, save]);

  // =============================================================================
  // Initial Load
  // =============================================================================

  useEffect(() => {
    if (organizationId) {
      load(organizationId);
    }
  }, [organizationId, load]);

  return {
    state,
    progress,
    currentStep,
    isFirstStep,
    isLastStep,
    goToStep,
    goToNextStep,
    goToPrevStep,
    updateField,
    awardFieldXp,
    completeStep,
    save,
    load,
    isLoading,
    error,
  };
}

export default useOrganizationWizard;
