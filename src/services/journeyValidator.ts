/**
 * Journey Validator Service
 *
 * Validates journey context against schemas to determine if a trail is blocked.
 * Provides methods for checking field completion, calculating progress, and validating data.
 *
 * Core Responsibilities:
 * 1. Validate user data against journey schemas
 * 2. Detect when journeys are "blocked" (missing required context)
 * 3. Calculate completion percentages
 * 4. Generate validation reports
 * 5. Identify missing fields for UI guidance
 *
 * @see src/types/journeySchemas.ts
 */

import {
  FieldSchema,
  FieldType,
  FieldValidationResult,
  JourneyContextData,
  JourneySchema,
  JourneyValidationResult,
  ValidationOptions,
  ValidationRule,
} from '../types/journeySchemas';

class JourneyValidator {
  /**
   * Main validation method
   * Checks if user data is valid against a journey schema
   *
   * Returns:
   * - isValid: true if all validation passes
   * - isBlocked: true if required fields are missing (journey cannot proceed)
   * - missingFields: list of fields that must be filled
   * - completionPercentage: 0-100 progress indicator
   */
  validateJourneyContext(
    schema: JourneySchema,
    userData: JourneyContextData | Record<string, any>,
    options: ValidationOptions = {}
  ): JourneyValidationResult {
    const {
      checkRequired = true,
      checkTypes = true,
      checkRules = true,
    } = options;

    // Extract data from context object if needed
    const data = userData && 'data' in userData ? userData.data : userData;

    const fieldResults: FieldValidationResult[] = [];
    const missingFields: FieldSchema[] = [];
    const errors: string[] = [];

    // Validate each field in the schema
    for (const field of schema.fields) {
      const result = this.validateField(
        field,
        data[field.key],
        data,
        {
          checkRequired,
          checkTypes,
          checkRules,
        }
      );

      fieldResults.push(result);

      // Track missing required fields
      if (field.required && !result.isFilled) {
        missingFields.push(field);
      }

      // Collect all errors
      if (!result.isValid) {
        errors.push(`${field.label}: ${result.errors.join(', ')}`);
      }
    }

    // Determine if journey is blocked
    // Journey is blocked if ANY required field is missing
    const isBlocked = missingFields.length > 0;

    // Calculate completion percentage
    const filledFieldsCount = fieldResults.filter(r => r.isFilled).length;
    const completionPercentage = Math.round(
      (filledFieldsCount / schema.fields.length) * 100
    );

    // Overall validity
    const isValid = errors.length === 0 && !isBlocked;

    return {
      journeyId: schema.journeyId,
      isValid,
      isBlocked,
      completionPercentage,
      missingFields,
      fieldResults,
      errorSummary: errors.join('; '),
      nextRequiredField: missingFields[0],
    };
  }

  /**
   * Validate a single field
   * @private
   */
  private validateField(
    field: FieldSchema,
    value: any,
    allData: Record<string, any>,
    options: ValidationOptions
  ): FieldValidationResult {
    const errors: string[] = [];
    const isFilled = value !== null && value !== undefined && value !== '';

    // Check required
    if (options.checkRequired && field.required && !isFilled) {
      errors.push(`${field.label} é obrigatório`);
      return {
        fieldKey: field.key,
        isValid: false,
        value,
        errors,
        isRequired: field.required,
        isFilled: false,
      };
    }

    // If not filled but not required, it's valid
    if (!isFilled) {
      return {
        fieldKey: field.key,
        isValid: true,
        value: null,
        errors: [],
        isRequired: field.required,
        isFilled: false,
      };
    }

    // Check type
    if (options.checkTypes) {
      const typeError = this.validateType(value, field.type);
      if (typeError) {
        errors.push(typeError);
      }
    }

    // Check validation rules
    if (options.checkRules && field.validationRules) {
      for (const rule of field.validationRules) {
        const ruleError = this.validateRule(value, rule, field);
        if (ruleError) {
          errors.push(ruleError);
        }
      }
    }

    return {
      fieldKey: field.key,
      isValid: errors.length === 0,
      value,
      errors,
      isRequired: field.required,
      isFilled,
    };
  }

  /**
   * Validate field type
   * @private
   */
  private validateType(value: any, type: FieldType): string | null {
    if (value === null || value === undefined) return null;

    const checks: Record<FieldType, () => boolean> = {
      string: () => typeof value === 'string',
      number: () => typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value))),
      decimal: () => typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value))),
      date: () => value instanceof Date || (typeof value === 'string' && !isNaN(new Date(value).getTime())),
      boolean: () => typeof value === 'boolean' || value === 'true' || value === 'false',
      array: () => Array.isArray(value),
    };

    if (!checks[type]()) {
      return `Valor deve ser do tipo ${type}`;
    }

    return null;
  }

  /**
   * Validate a custom rule
   * @private
   */
  private validateRule(value: any, rule: ValidationRule, field: FieldSchema): string | null {
    switch (rule.type) {
      case 'required':
        return value ? null : rule.message;

      case 'minLength':
        return typeof value === 'string' && value.length < rule.value
          ? rule.message
          : null;

      case 'maxLength':
        return typeof value === 'string' && value.length > rule.value
          ? rule.message
          : null;

      case 'min':
        return Number(value) < rule.value ? rule.message : null;

      case 'max':
        return Number(value) > rule.value ? rule.message : null;

      case 'pattern':
        return !new RegExp(rule.value).test(String(value))
          ? rule.message
          : null;

      case 'custom':
        // Custom rules would be handled by caller
        return null;

      default:
        return null;
    }
  }

  /**
   * Check if a journey is blocked (missing required context)
   */
  isJourneyBlocked(
    schema: JourneySchema,
    userData: JourneyContextData | Record<string, any>
  ): boolean {
    const result = this.validateJourneyContext(schema, userData);
    return result.isBlocked;
  }

  /**
   * Get list of missing required fields
   */
  getMissingFields(
    schema: JourneySchema,
    userData: JourneyContextData | Record<string, any>
  ): FieldSchema[] {
    const result = this.validateJourneyContext(schema, userData);
    return result.missingFields;
  }

  /**
   * Get the first missing required field
   * Useful for prompting user to complete the most critical field
   */
  getNextRequiredField(
    schema: JourneySchema,
    userData: JourneyContextData | Record<string, any>
  ): FieldSchema | null {
    const result = this.validateJourneyContext(schema, userData);
    return result.nextRequiredField || null;
  }

  /**
   * Calculate completion percentage (0-100)
   */
  getCompletionPercentage(
    schema: JourneySchema,
    userData: JourneyContextData | Record<string, any>
  ): number {
    const result = this.validateJourneyContext(schema, userData);
    return result.completionPercentage;
  }

  /**
   * Get filled field count
   */
  getFilledFieldCount(
    schema: JourneySchema,
    userData: JourneyContextData | Record<string, any>
  ): number {
    const data = userData && 'data' in userData ? userData.data : userData;
    return schema.fields.filter(
      f => data[f.key] !== null && data[f.key] !== undefined && data[f.key] !== ''
    ).length;
  }

  /**
   * Get all field validation results
   */
  getFieldResults(
    schema: JourneySchema,
    userData: JourneyContextData | Record<string, any>
  ): FieldValidationResult[] {
    const result = this.validateJourneyContext(schema, userData);
    return result.fieldResults;
  }

  /**
   * Check if a specific field has value and is valid
   */
  isFieldValid(
    schema: JourneySchema,
    userData: JourneyContextData | Record<string, any>,
    fieldKey: string
  ): boolean {
    const result = this.validateJourneyContext(schema, userData);
    const fieldResult = result.fieldResults.find(f => f.fieldKey === fieldKey);
    return fieldResult ? fieldResult.isValid && fieldResult.isFilled : false;
  }

  /**
   * Get human-readable validation summary
   */
  getValidationSummary(
    schema: JourneySchema,
    userData: JourneyContextData | Record<string, any>
  ): string {
    const result = this.validateJourneyContext(schema, userData);

    if (result.isValid) {
      return `Contexto completo: ${result.completionPercentage}% preenchido`;
    }

    if (result.isBlocked) {
      const fieldNames = result.missingFields
        .slice(0, 3)
        .map(f => f.label)
        .join(', ');
      const moreCount = result.missingFields.length - 3;
      const moreText = moreCount > 0 ? ` e mais ${moreCount}` : '';
      return `Faltam campos: ${fieldNames}${moreText}`;
    }

    return result.errorSummary;
  }

  /**
   * Merge multiple field values into a context
   */
  mergeContext(
    schema: JourneySchema,
    existingData: Record<string, any>,
    newData: Record<string, any>
  ): Record<string, any> {
    const merged = { ...existingData };

    // Only merge fields that exist in schema
    for (const field of schema.fields) {
      if (field.key in newData) {
        merged[field.key] = newData[field.key];
      }
    }

    return merged;
  }

  /**
   * Sanitize user data to only include schema-defined fields
   */
  sanitizeData(
    schema: JourneySchema,
    data: Record<string, any>
  ): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const field of schema.fields) {
      if (field.key in data) {
        let value = data[field.key];

        // Type coercion if needed
        if (value !== null && value !== undefined) {
          if (field.type === 'number' || field.type === 'decimal') {
            value = Number(value);
          } else if (field.type === 'boolean') {
            value = Boolean(value);
          } else if (field.type === 'date') {
            value = new Date(value).toISOString();
          }
        }

        sanitized[field.key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Get progress message for UI display
   */
  getProgressMessage(
    schema: JourneySchema,
    userData: JourneyContextData | Record<string, any>
  ): string {
    const percentage = this.getCompletionPercentage(schema, userData);

    if (percentage === 0) {
      return 'Comece preenchendo seu contexto';
    } else if (percentage < 33) {
      return 'Você está no começo. Continue!';
    } else if (percentage < 66) {
      return 'Progresso bom! Quase lá';
    } else if (percentage < 100) {
      return 'Faltam poucos campos';
    } else {
      return 'Contexto completo!';
    }
  }
}

/**
 * Export singleton instance
 */
export const journeyValidator = new JourneyValidator();

/**
 * Export class for testing or custom instantiation
 */
export { JourneyValidator };
