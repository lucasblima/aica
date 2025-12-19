/**
 * useJourneyValidation Hook
 *
 * React hook for validating journey context against schemas
 * Used in components to display validation status, missing fields, and progress
 *
 * Features:
 * - Real-time validation as user updates context
 * - Caching of validation results
 * - Automatic blocking of locked journeys
 * - Field-level validation feedback
 * - Progress tracking and reporting
 *
 * @example
 * const { isBlocked, missingFields, completionPercentage } = useJourneyValidation('finance');
 *
 * @see src/services/journeyValidator.ts
 * @see src/types/journeySchemas.ts
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { getJourneySchema } from '../../../data/journeySchemas';
import { journeyValidator, JourneyValidator } from '../../../services/journeyValidator';
import type {
  JourneySchema,
  JourneyValidationResult,
  FieldSchema,
  ValidationOptions,
  JourneyContextStatus,
} from '../../../types/journeySchemas';

interface UseJourneyValidationOptions {
  autoValidate?: boolean;
  cacheResults?: boolean;
  cacheDuration?: number; // milliseconds
  throwOnError?: boolean;
}

/**
 * Hook to validate journey context data
 *
 * @param journeyId - The ID of the journey/trail (e.g., 'finance', 'health-emotional')
 * @param userData - User's context data (optional, defaults to empty)
 * @param options - Validation options
 * @returns Validation results and utility functions
 */
export function useJourneyValidation(
  journeyId: string,
  userData?: Record<string, any> | null,
  options: UseJourneyValidationOptions = {}
) {
  const {
    autoValidate = true,
    cacheResults = true,
    cacheDuration = 5000,
    throwOnError = false,
  } = options;

  // Get schema
  const schema = useMemo(() => {
    return getJourneySchema(journeyId);
  }, [journeyId]);

  // State for caching
  const [cachedResult, setCachedResult] = useState<JourneyValidationResult | null>(null);
  const [cacheTime, setCacheTime] = useState<number | null>(null);

  // Validate function
  const validate = useCallback(
    (data: Record<string, any> | null | undefined, opts?: ValidationOptions): JourneyValidationResult | null => {
      if (!schema) {
        if (throwOnError) {
          throw new Error(`Schema not found for journey: ${journeyId}`);
        }
        return null;
      }

      // Return cached result if valid
      if (cacheResults && cachedResult && cacheTime) {
        const now = Date.now();
        if (now - cacheTime < cacheDuration) {
          return cachedResult;
        }
      }

      // Perform validation
      const result = journeyValidator.validateJourneyContext(
        schema,
        data || {},
        opts
      );

      // Cache result
      if (cacheResults) {
        setCachedResult(result);
        setCacheTime(Date.now());
      }

      return result;
    },
    [schema, journeyId, cacheResults, cachedResult, cacheTime, cacheDuration, throwOnError]
  );

  // Main validation result (auto-validate if enabled)
  const validationResult = useMemo(() => {
    if (!autoValidate) return null;
    return validate(userData);
  }, [autoValidate, userData, validate]);

  // Derived values
  const isBlocked = useMemo(() => {
    return validationResult?.isBlocked ?? false;
  }, [validationResult]);

  const missingFields = useMemo(() => {
    return validationResult?.missingFields ?? [];
  }, [validationResult]);

  const nextRequiredField = useMemo(() => {
    return validationResult?.nextRequiredField ?? null;
  }, [validationResult]);

  const completionPercentage = useMemo(() => {
    return validationResult?.completionPercentage ?? 0;
  }, [validationResult]);

  const filledFieldsCount = useMemo(() => {
    if (!schema || !userData) return 0;
    return schema.fields.filter(
      f => userData[f.key] !== null && userData[f.key] !== undefined && userData[f.key] !== ''
    ).length;
  }, [schema, userData]);

  const totalFieldsCount = useMemo(() => {
    return schema?.fields.length ?? 0;
  }, [schema]);

  const requiredFieldsCount = useMemo(() => {
    return schema?.requiredFieldsCount ?? 0;
  }, [schema]);

  // Status object
  const status = useMemo<JourneyContextStatus | null>(() => {
    if (!schema || !validationResult) return null;

    return {
      journeyId,
      userId: '', // Would be set if we had access to auth context
      hasContext: completionPercentage > 0,
      isBlocked,
      completionPercentage,
      lastUpdated: new Date(),
      missingFieldsCount: missingFields.length,
    };
  }, [journeyId, schema, validationResult, completionPercentage, isBlocked, missingFields]);

  // Utility functions
  const checkFieldValid = useCallback(
    (fieldKey: string): boolean => {
      if (!schema) return false;
      return journeyValidator.isFieldValid(schema, userData || {}, fieldKey);
    },
    [schema, userData]
  );

  const getFieldValidationMessage = useCallback(
    (fieldKey: string): string => {
      if (!validationResult) return '';
      const fieldResult = validationResult.fieldResults.find(f => f.fieldKey === fieldKey);
      return fieldResult?.errors.join('; ') ?? '';
    },
    [validationResult]
  );

  const getProgressMessage = useCallback((): string => {
    if (!schema) return '';
    return journeyValidator.getProgressMessage(schema, userData || {});
  }, [schema, userData]);

  const mergeData = useCallback(
    (newData: Record<string, any>): Record<string, any> => {
      if (!schema) return newData;
      return journeyValidator.mergeContext(schema, userData || {}, newData);
    },
    [schema, userData]
  );

  const sanitizeData = useCallback(
    (data: Record<string, any>): Record<string, any> => {
      if (!schema) return data;
      return journeyValidator.sanitizeData(schema, data);
    },
    [schema]
  );

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    setCachedResult(null);
    setCacheTime(null);
  }, []);

  return {
    // Schema info
    schema,
    journeyId,

    // Main results
    validationResult,
    isBlocked,
    missingFields,
    nextRequiredField,

    // Progress metrics
    completionPercentage,
    filledFieldsCount,
    totalFieldsCount,
    requiredFieldsCount,

    // Status
    status,

    // Utility functions
    validate,
    checkFieldValid,
    getFieldValidationMessage,
    getProgressMessage,
    mergeData,
    sanitizeData,
    invalidateCache,
  };
}

/**
 * Hook to validate multiple journeys at once
 *
 * @param journeyIds - Array of journey IDs to validate
 * @param userContextData - Map of journeyId -> context data
 * @returns Results for all journeys
 */
export function useMultipleJourneyValidation(
  journeyIds: string[],
  userContextData?: Record<string, Record<string, any>>
) {
  const validations = journeyIds.map(id => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useJourneyValidation(id, userContextData?.[id]);
  });

  // Aggregate results
  const allBlocked = useMemo(() => {
    return validations.some(v => v.isBlocked);
  }, [validations]);

  const blockedJourneys = useMemo(() => {
    return validations.filter(v => v.isBlocked).map(v => v.journeyId);
  }, [validations]);

  const overallCompletion = useMemo(() => {
    const totalPercentage = validations.reduce((sum, v) => sum + v.completionPercentage, 0);
    return Math.round(totalPercentage / validations.length);
  }, [validations]);

  const totalMissingFields = useMemo(() => {
    return validations.reduce((sum, v) => sum + v.missingFields.length, 0);
  }, [validations]);

  return {
    validations,
    allBlocked,
    blockedJourneys,
    overallCompletion,
    totalMissingFields,
    journeyCount: journeyIds.length,
  };
}

/**
 * Hook to validate a single field
 * Useful for form inputs that need real-time validation
 *
 * @param journeyId - Journey ID
 * @param fieldKey - Field key to validate
 * @param value - Current field value
 * @returns Field validation status
 */
export function useFieldValidation(
  journeyId: string,
  fieldKey: string,
  value: any
) {
  const schema = useMemo(() => {
    return getJourneySchema(journeyId);
  }, [journeyId]);

  const field = useMemo(() => {
    return schema?.fields.find(f => f.key === fieldKey) ?? null;
  }, [schema, fieldKey]);

  const validationResult = useMemo(() => {
    if (!schema || !field) return null;

    const testData = { [fieldKey]: value };
    const result = journeyValidator.validateJourneyContext(schema, testData);

    return result.fieldResults.find(f => f.fieldKey === fieldKey) ?? null;
  }, [schema, field, fieldKey, value]);

  const isValid = validationResult?.isValid ?? true;
  const isFilled = validationResult?.isFilled ?? false;
  const errors = validationResult?.errors ?? [];

  return {
    field,
    isValid,
    isFilled,
    hasErrors: errors.length > 0,
    errors,
    errorMessage: errors.join('; '),
    isRequired: field?.required ?? false,
  };
}

/**
 * Hook to track completion of journey fields
 * Returns progress for UI bars and indicators
 *
 * @param journeyId - Journey ID
 * @param userData - User context data
 * @returns Progress tracking data
 */
export function useJourneyProgress(
  journeyId: string,
  userData?: Record<string, any> | null
) {
  const { completionPercentage, filledFieldsCount, totalFieldsCount, requiredFieldsCount } =
    useJourneyValidation(journeyId, userData);

  const requiredFilledCount = useMemo(() => {
    const schema = getJourneySchema(journeyId);
    if (!schema || !userData) return 0;

    return schema.fields
      .filter(f => f.required)
      .filter(f => userData[f.key] !== null && userData[f.key] !== undefined && userData[f.key] !== '')
      .length;
  }, [journeyId, userData]);

  const requiredCompletionPercentage = useMemo(() => {
    if (requiredFieldsCount === 0) return 0;
    return Math.round((requiredFilledCount / requiredFieldsCount) * 100);
  }, [requiredFilledCount, requiredFieldsCount]);

  const progressLabel = useMemo(() => {
    if (completionPercentage === 0) {
      return 'Não iniciado';
    } else if (completionPercentage < 33) {
      return 'Começado';
    } else if (completionPercentage < 66) {
      return 'Em progresso';
    } else if (completionPercentage < 100) {
      return 'Quase completo';
    } else {
      return 'Completo';
    }
  }, [completionPercentage]);

  return {
    completionPercentage,
    requiredCompletionPercentage,
    filledFieldsCount,
    totalFieldsCount,
    requiredFilledCount,
    requiredFieldsCount,
    progressLabel,
  };
}
