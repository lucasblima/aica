/**
 * useAutoSave - Hook for debounced auto-save functionality
 * Saves workspace state to Supabase with configurable delay
 */

import { useEffect, useRef, useCallback } from 'react';
import type { EditalWorkspaceState } from '../types/workspace';
import {
  saveBriefing,
  saveResponse,
  updateOpportunity,
} from '../services/grantService';

interface UseAutoSaveOptions {
  state: EditalWorkspaceState;
  enabled?: boolean;
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

interface UseAutoSaveResult {
  isSaving: boolean;
  lastSaved: Date | null;
  saveNow: () => Promise<void>;
}

/**
 * Hook for auto-saving workspace state with debouncing
 */
export function useAutoSave({
  state,
  enabled = true,
  debounceMs = 2000,
  onSaveStart,
  onSaveSuccess,
  onSaveError,
}: UseAutoSaveOptions): UseAutoSaveResult {
  const isSavingRef = useRef(false);
  const lastSavedRef = useRef<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousStateRef = useRef<EditalWorkspaceState | null>(null);

  /**
   * Core save function
   */
  const performSave = useCallback(async (stateToSave: EditalWorkspaceState) => {
    if (isSavingRef.current) return;

    try {
      isSavingRef.current = true;
      onSaveStart?.();

      const { projectId, opportunityId } = stateToSave;
      const previousState = previousStateRef.current;

      // Save briefing context if changed
      if (
        !previousState ||
        JSON.stringify(previousState.briefingContext) !== JSON.stringify(stateToSave.briefingContext)
      ) {
        await saveBriefing(projectId, { briefing_data: stateToSave.briefingContext });
        console.log('[AutoSave] Briefing saved');
      }

      // Save responses if changed
      if (previousState) {
        const prevResponses = previousState.drafting.responses;
        const currResponses = stateToSave.drafting.responses;

        for (const [fieldId, response] of Object.entries(currResponses)) {
          const prevResponse = prevResponses[fieldId];
          if (!prevResponse || prevResponse.content !== response.content || prevResponse.status !== response.status) {
            await saveResponse(projectId, fieldId, response.content, response.status);
            console.log(`[AutoSave] Response saved for field ${fieldId}`);
          }
        }
      }

      // Save form fields if changed (update opportunity)
      if (
        previousState &&
        JSON.stringify(previousState.formFields.fields) !== JSON.stringify(stateToSave.formFields.fields)
      ) {
        await updateOpportunity(opportunityId, {
          form_fields: stateToSave.formFields.fields,
        });
        console.log('[AutoSave] Form fields saved');
      }

      lastSavedRef.current = new Date();
      previousStateRef.current = stateToSave;
      onSaveSuccess?.();
    } catch (error) {
      console.error('[AutoSave] Error saving:', error);
      onSaveError?.(error instanceof Error ? error : new Error('Erro ao salvar'));
    } finally {
      isSavingRef.current = false;
    }
  }, [onSaveStart, onSaveSuccess, onSaveError]);

  /**
   * Debounced save effect
   */
  useEffect(() => {
    if (!enabled || !state.isDirty) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      performSave(state);
    }, debounceMs);

    // Cleanup on unmount or state change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, state, state.isDirty, debounceMs, performSave]);

  /**
   * Initialize previous state reference
   */
  useEffect(() => {
    if (!previousStateRef.current) {
      previousStateRef.current = state;
    }
  }, [state]);

  /**
   * Save immediately (bypass debounce)
   */
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await performSave(state);
  }, [state, performSave]);

  return {
    isSaving: isSavingRef.current,
    lastSaved: lastSavedRef.current,
    saveNow,
  };
}

export default useAutoSave;
