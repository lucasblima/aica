/**
 * useOrganizationDocumentUpload Hook
 * Issue #100 - Wizard gamificado para cadastro completo de organizacoes
 *
 * Orchestrates document upload and auto-fill flow for the organization wizard.
 * Integrates with useOrganizationWizard to populate fields and award XP.
 */

import { useState, useCallback } from 'react';
import type { Organization } from '../types/organizations';
import type {
  OrganizationFields,
  ProcessedDocumentResult,
} from '../services/organizationDocumentService';
import { mapFieldsToOrganization } from '../services/organizationDocumentService';

// =============================================================================
// TYPES
// =============================================================================

export interface AutoFilledField {
  fieldName: keyof Organization;
  value: unknown;
  confidence: number;
  previousValue?: unknown;
}

export interface UseOrganizationDocumentUploadReturn {
  // State
  isProcessing: boolean;
  lastResult: ProcessedDocumentResult | null;
  autoFilledFields: AutoFilledField[];
  error: string | null;

  // Actions
  handleFieldsExtracted: (
    fields: OrganizationFields,
    confidence: Record<string, number>,
    currentFormData: Partial<Organization>,
    updateField: (field: keyof Organization, value: unknown) => void
  ) => void;
  clearAutoFilled: () => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
}

// =============================================================================
// CONFIDENCE THRESHOLD
// =============================================================================

const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

// =============================================================================
// HOOK
// =============================================================================

export function useOrganizationDocumentUpload(
  confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): UseOrganizationDocumentUploadReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ProcessedDocumentResult | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<AutoFilledField[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle extracted fields from document processing
   */
  const handleFieldsExtracted = useCallback((
    fields: OrganizationFields,
    confidence: Record<string, number>,
    currentFormData: Partial<Organization>,
    updateField: (field: keyof Organization, value: unknown) => void
  ) => {
    // Map fields to organization schema with confidence filtering
    const mappedFields = mapFieldsToOrganization(fields, confidence, confidenceThreshold);

    // Track which fields were auto-filled
    const filledFields: AutoFilledField[] = [];

    // Apply each field
    for (const [key, value] of Object.entries(mappedFields)) {
      const fieldName = key as keyof Organization;
      const fieldConfidence = confidence[key] || 0;
      const previousValue = currentFormData[fieldName];

      // Only auto-fill if field is empty or has lower confidence data
      const shouldFill = previousValue === undefined ||
                        previousValue === null ||
                        previousValue === '' ||
                        (Array.isArray(previousValue) && previousValue.length === 0);

      if (shouldFill && value !== undefined && value !== null) {
        // Update the field (this also triggers XP award in the wizard)
        updateField(fieldName, value);

        filledFields.push({
          fieldName,
          value,
          confidence: fieldConfidence,
          previousValue,
        });
      }
    }

    setAutoFilledFields(filledFields);
    setLastResult({
      success: true,
      documentType: 'auto',
      fields,
      fieldConfidence: confidence,
      processingTimeMs: 0,
    });

    // Clear processing state
    setIsProcessing(false);
    setError(null);
  }, [confidenceThreshold]);

  /**
   * Clear auto-filled tracking
   */
  const clearAutoFilled = useCallback(() => {
    setAutoFilledFields([]);
    setLastResult(null);
    setError(null);
  }, []);

  /**
   * Set processing state
   */
  const setProcessing = useCallback((processing: boolean) => {
    setIsProcessing(processing);
    if (processing) {
      setError(null);
    }
  }, []);

  return {
    isProcessing,
    lastResult,
    autoFilledFields,
    error,
    handleFieldsExtracted,
    clearAutoFilled,
    setProcessing,
    setError,
  };
}

export default useOrganizationDocumentUpload;
