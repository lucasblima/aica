/**
 * Journey Schemas System
 * Defines schema validation for Contextual Trails
 *
 * This system ensures that users complete context questions for each trail
 * before unlocking modules and progression.
 *
 * Schema Hierarchy:
 * 1. FieldSchema: Individual field requirements
 * 2. JourneySchema: Collection of fields per trail
 * 3. JourneyContextData: User-provided values for a schema
 *
 * @see docs/onboarding/TRILHAS_CONTEXTUAIS_E_PERGUNTAS.md
 */

// =====================================================
// FIELD SCHEMA TYPES
// =====================================================

/**
 * Supported field data types for validation
 */
export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'decimal' | 'array';

/**
 * Validation rule for a field
 */
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

/**
 * Definition of a single field in a journey schema
 *
 * Example:
 * {
 *   key: 'total_debts',
 *   type: 'decimal',
 *   required: true,
 *   label: 'Total de Dívidas',
 *   description: 'Soma de todas as suas dívidas',
 *   validationRules: [{ type: 'required', message: 'Campo obrigatório' }],
 *   inputType: 'currency',
 *   placeholder: 'R$ 0,00'
 * }
 */
export interface FieldSchema {
  key: string;
  type: FieldType;
  required: boolean;
  label: string;
  description?: string;
  placeholder?: string;
  helpText?: string;
  validationRules?: ValidationRule[];
  inputType?: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'select' | 'multiselect' | 'textarea';
  options?: Array<{ value: string | number; label: string }>;
  dependsOn?: string; // Field key it depends on (for conditional fields)
}

// =====================================================
// SCHEMA DEFINITION TYPES
// =====================================================

/**
 * Complete schema for a journey (contextual trail)
 * Maps directly to a trail ID (e.g., 'finance', 'health-emotional')
 */
export interface JourneySchema {
  journeyId: string;                   // Unique identifier (from trail ID)
  journeyName: string;                 // Human-readable name
  areaId: string;                      // Life area category (finance, health, etc.)
  description: string;                 // What this context captures
  version: number;                     // Schema version for migrations
  fields: FieldSchema[];               // All required/optional fields
  requiredFieldsCount: number;         // How many required fields must be filled
  estimatedCompletionTime?: number;    // Minutes to complete
  icon?: string;                       // Trail icon for UI
  color?: string;                      // Trail color for UI
}

/**
 * Raw user-provided data for a schema
 */
export interface JourneyContextData {
  journeyId: string;
  userId: string;
  data: Record<string, any>;           // Key-value pairs matching FieldSchema keys
  completedAt?: Date;
  updatedAt?: Date;
}

/**
 * Validation result for a single field
 */
export interface FieldValidationResult {
  fieldKey: string;
  isValid: boolean;
  value: any;
  errors: string[];
  isRequired: boolean;
  isFilled: boolean;
}

/**
 * Complete validation result for a journey context
 */
export interface JourneyValidationResult {
  journeyId: string;
  isValid: boolean;
  isBlocked: boolean;                  // true if required fields are missing
  completionPercentage: number;        // 0-100
  missingFields: FieldSchema[];        // Required fields not filled
  fieldResults: FieldValidationResult[];
  errorSummary: string;
  nextRequiredField?: FieldSchema;     // First missing required field
}

// =====================================================
// STATUS & PROGRESS TYPES
// =====================================================

/**
 * Status of a user's journey context
 */
export interface JourneyContextStatus {
  journeyId: string;
  userId: string;
  hasContext: boolean;
  isBlocked: boolean;
  completionPercentage: number;
  lastUpdated: Date;
  missingFieldsCount: number;
}

/**
 * Aggregated status across all journeys
 */
export interface AllJourneysContextStatus {
  userId: string;
  journeys: JourneyContextStatus[];
  overallCompletionPercentage: number;
  blockedJourneyCount: number;
  activeJourneyCount: number;
}

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Map of journey ID to its schema
 */
export type JourneySchemaMap = Record<string, JourneySchema>;

/**
 * Result from batch validation across multiple journeys
 */
export interface BatchValidationResult {
  journeyId: string;
  result: JourneyValidationResult;
}

/**
 * Options for validation behavior
 */
export interface ValidationOptions {
  checkRequired?: boolean;             // Validate required fields
  checkTypes?: boolean;                // Validate field types
  checkRules?: boolean;                // Validate custom rules
  throwOnError?: boolean;              // Throw error vs return result
}

/**
 * Configuration for schema system
 */
export interface SchemaConfig {
  enableAutoFill?: boolean;            // Auto-fill from user profile
  enablePartialCompletion?: boolean;   // Allow partial completion
  requiredFieldThreshold?: number;     // % of required fields needed
  cacheDuration?: number;              // Minutes to cache validation
}
