# Journey Schema Validation System - Usage Examples

Practical examples showing how to use the Journey Schema Validation System in your components.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [React Components](#react-components)
3. [Form Integration](#form-integration)
4. [Database Operations](#database-operations)
5. [Advanced Patterns](#advanced-patterns)

---

## Basic Usage

### Example 1: Check if Journey is Blocked

```typescript
import { useJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';
import { getJourneySchema } from '@/data/journeySchemas';

function JourneyStatus() {
  // Get schema directly for non-React context
  const schema = getJourneySchema('finance');

  // In React component
  const { isBlocked, completionPercentage } = useJourneyValidation('finance', userData);

  console.log(`Is blocked: ${isBlocked}`);
  console.log(`Progress: ${completionPercentage}%`);

  return isBlocked ? <LockedState /> : <UnlockedState />;
}
```

### Example 2: Get Missing Fields

```typescript
import { useJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';

function MissingFieldsList({ journeyId, userData }) {
  const { missingFields, nextRequiredField } = useJourneyValidation(journeyId, userData);

  return (
    <div>
      <h3>Complete Your Profile</h3>
      {nextRequiredField && (
        <p>
          Next required field: <strong>{nextRequiredField.label}</strong>
        </p>
      )}
      {missingFields.length > 0 && (
        <ul>
          {missingFields.map(field => (
            <li key={field.key}>
              {field.label}
              {field.required && <span className="required">*</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Example 3: Display Progress Bar

```typescript
import { useJourneyProgress } from '@/modules/journey/hooks/useJourneyValidation';

function JourneyProgressBar({ journeyId, userData }) {
  const {
    completionPercentage,
    requiredCompletionPercentage,
    filledFieldsCount,
    totalFieldsCount,
    progressLabel,
  } = useJourneyProgress(journeyId, userData);

  return (
    <div className="progress-container">
      <div className="progress-header">
        <h4>{progressLabel}</h4>
        <span className="percentage">{completionPercentage}%</span>
      </div>

      <div className="progress-bar-container">
        {/* Overall progress */}
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Required fields progress */}
        <div className="required-progress">
          <small>Required: {requiredCompletionPercentage}%</small>
        </div>
      </div>

      <div className="progress-stats">
        <span>{filledFieldsCount} of {totalFieldsCount} fields completed</span>
      </div>
    </div>
  );
}
```

---

## React Components

### Example 4: Context Card with Blocking Status

```typescript
import React from 'react';
import { useJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';
import { getJourneySchema } from '@/data/journeySchemas';

interface ContextCardProps {
  journeyId: string;
  userData?: Record<string, any>;
  onComplete?: () => void;
}

export function ContextCard({ journeyId, userData = {}, onComplete }: ContextCardProps) {
  const {
    schema,
    isBlocked,
    missingFields,
    nextRequiredField,
    completionPercentage,
  } = useJourneyValidation(journeyId, userData);

  if (!schema) {
    return <div>Journey not found</div>;
  }

  return (
    <div className="context-card">
      <header>
        <h2>
          <span className="icon">{schema.icon}</span>
          {schema.journeyName}
        </h2>
        <p className="description">{schema.description}</p>
      </header>

      <div className="content">
        {isBlocked ? (
          <div className="blocked-state">
            <div className="warning-icon">🔒</div>
            <h3>Journey Blocked</h3>
            <p>Please complete the following fields to unlock this journey:</p>

            <div className="missing-fields">
              {missingFields.map(field => (
                <div key={field.key} className="field-item required">
                  <input
                    type="checkbox"
                    disabled
                    checked={false}
                  />
                  <div className="field-info">
                    <label>{field.label}</label>
                    {field.description && (
                      <small>{field.description}</small>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="next-action">
              <p>
                Start with: <strong>{nextRequiredField?.label}</strong>
              </p>
              <button className="primary">Fill Context</button>
            </div>
          </div>
        ) : (
          <div className="unlocked-state">
            <div className="success-icon">✓</div>
            <h3>Context Complete</h3>
            <p>You've unlocked {schema.journeyName}!</p>

            <div className="progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="percentage">{completionPercentage}%</p>
            </div>

            <button className="primary" onClick={onComplete}>
              Continue to Modules
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Example 5: All Journeys Status Dashboard

```typescript
import { useMultipleJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';
import { JOURNEY_SCHEMAS } from '@/data/journeySchemas';

interface AllJourneysStatusProps {
  userContextData: Record<string, Record<string, any>>;
}

export function AllJourneysStatus({ userContextData }: AllJourneysStatusProps) {
  const journeyIds = Object.keys(JOURNEY_SCHEMAS);

  const {
    validations,
    allBlocked,
    blockedJourneys,
    overallCompletion,
    totalMissingFields,
  } = useMultipleJourneyValidation(journeyIds, userContextData);

  return (
    <div className="all-journeys-dashboard">
      <header>
        <h2>Your Journey Progress</h2>
        <div className="overview">
          <div className="stat">
            <span className="label">Overall Progress</span>
            <span className="value">{overallCompletion}%</span>
          </div>
          <div className="stat">
            <span className="label">Blocked Journeys</span>
            <span className="value">{blockedJourneys.length}/{journeyIds.length}</span>
          </div>
          <div className="stat">
            <span className="label">Fields to Complete</span>
            <span className="value">{totalMissingFields}</span>
          </div>
        </div>
      </header>

      {allBlocked && (
        <div className="warning-banner">
          <span className="icon">⚠️</span>
          <p>
            {blockedJourneys.length} of {journeyIds.length} journeys are blocked.
            Complete the required fields to proceed.
          </p>
        </div>
      )}

      <div className="journeys-grid">
        {validations.map(validation => (
          <JourneyCard key={validation.journeyId} validation={validation} />
        ))}
      </div>

      <div className="summary">
        <p>
          You have {totalMissingFields} fields to complete before you can access all modules.
        </p>
      </div>
    </div>
  );
}

function JourneyCard({ validation }: { validation: any }) {
  const { schema, isBlocked, completionPercentage } = validation;

  return (
    <div className={`journey-card ${isBlocked ? 'blocked' : 'unlocked'}`}>
      <div className="header">
        <span className="icon">{schema?.icon}</span>
        <h3>{schema?.journeyName}</h3>
      </div>

      <div className="status">
        {isBlocked ? (
          <span className="badge blocked">🔒 Blocked</span>
        ) : (
          <span className="badge unlocked">✓ Unlocked</span>
        )}
      </div>

      <div className="progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p>{completionPercentage}%</p>
      </div>
    </div>
  );
}
```

---

## Form Integration

### Example 6: Field-Level Validation

```typescript
import { useFieldValidation } from '@/modules/journey/hooks/useJourneyValidation';

interface FormFieldProps {
  journeyId: string;
  fieldKey: string;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
}

export function FormField({
  journeyId,
  fieldKey,
  value,
  onChange,
  onBlur,
}: FormFieldProps) {
  const {
    field,
    isValid,
    isFilled,
    hasErrors,
    errors,
    isRequired,
  } = useFieldValidation(journeyId, fieldKey, value);

  if (!field) {
    return null;
  }

  return (
    <div className="form-field">
      <label>
        {field.label}
        {isRequired && <span className="required">*</span>}
      </label>

      {field.helpText && (
        <small className="help-text">{field.helpText}</small>
      )}

      {field.inputType === 'currency' ? (
        <CurrencyInput
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={field.placeholder}
          className={hasErrors && isFilled ? 'error' : ''}
        />
      ) : field.inputType === 'select' ? (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={hasErrors && isFilled ? 'error' : ''}
        >
          <option value="">Select {field.label}</option>
          {field.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.inputType === 'multiselect' ? (
        <MultiSelect
          values={Array.isArray(value) ? value : []}
          onChange={onChange}
          options={field.options}
          className={hasErrors && isFilled ? 'error' : ''}
        />
      ) : field.inputType === 'textarea' ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          className={hasErrors && isFilled ? 'error' : ''}
        />
      ) : (
        <input
          type={field.inputType || 'text'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          className={hasErrors && isFilled ? 'error' : ''}
        />
      )}

      {hasErrors && isFilled && (
        <div className="field-errors">
          {errors.map((error, i) => (
            <p key={i} className="error-message">
              {error}
            </p>
          ))}
        </div>
      )}

      {isValid && isFilled && (
        <p className="success-message">✓ Valid</p>
      )}
    </div>
  );
}
```

### Example 7: Complete Context Form

```typescript
import { useState } from 'react';
import { useJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';
import { journeyValidator } from '@/services/journeyValidator';
import { supabase } from '@/lib/supabase';

interface ContextFormProps {
  journeyId: string;
  userId: string;
  initialData?: Record<string, any>;
  onSaveComplete?: () => void;
}

export function ContextForm({
  journeyId,
  userId,
  initialData = {},
  onSaveComplete,
}: ContextFormProps) {
  const [formData, setFormData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    schema,
    isBlocked,
    completionPercentage,
    validate,
    sanitizeData,
  } = useJourneyValidation(journeyId, formData);

  if (!schema) {
    return <div>Schema not found</div>;
  }

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);

      // Validate before saving
      const validation = validate(formData);

      if (!validation?.isValid && validation?.isBlocked) {
        setSaveError('Please complete all required fields');
        return;
      }

      // Sanitize data (remove unknown fields)
      const cleanData = sanitizeData(formData);

      // Save to Supabase
      const { error } = await supabase
        .from('journey_contexts')
        .upsert(
          {
            user_id: userId,
            journey_id: journeyId,
            context_data: cleanData,
            is_blocked: validation?.isBlocked ?? false,
            completion_percentage: validation?.completionPercentage ?? 0,
            validation_status: validation?.isValid ? 'valid' : 'invalid',
            validation_errors: validation?.errorSummary,
            last_validated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,journey_id',
          }
        );

      if (error) {
        setSaveError(error.message);
        return;
      }

      onSaveComplete?.();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="context-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <header>
        <h2>Complete Your {schema.journeyName} Profile</h2>
        <p>{schema.description}</p>
      </header>

      <div className="form-fields">
        {schema.fields.map(field => (
          <FormField
            key={field.key}
            journeyId={journeyId}
            fieldKey={field.key}
            value={formData[field.key]}
            onChange={(value) => handleFieldChange(field.key, value)}
          />
        ))}
      </div>

      <div className="form-progress">
        <p>Progress: {completionPercentage}%</p>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {isBlocked && (
        <div className="warning">
          ⚠️ Please complete all required fields before saving.
        </div>
      )}

      {saveError && (
        <div className="error-message">
          Error saving: {saveError}
        </div>
      )}

      <div className="form-actions">
        <button
          type="submit"
          disabled={isSaving || isBlocked}
          className="primary"
        >
          {isSaving ? 'Saving...' : 'Save Context'}
        </button>
      </div>
    </form>
  );
}
```

---

## Database Operations

### Example 8: Fetch and Display User Context

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';

interface UserContextDisplayProps {
  userId: string;
  journeyId: string;
}

export function UserContextDisplay({ userId, journeyId }: UserContextDisplayProps) {
  const [dbData, setDbData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { schema, isBlocked, completionPercentage } = useJourneyValidation(
    journeyId,
    dbData?.context_data
  );

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const { data, error } = await supabase
          .from('journey_contexts')
          .select('*')
          .eq('user_id', userId)
          .eq('journey_id', journeyId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Not found
            setDbData(null);
          } else {
            throw error;
          }
        } else {
          setDbData(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, [userId, journeyId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  if (!dbData) {
    return <div>No context saved for this journey yet</div>;
  }

  return (
    <div>
      <h2>{schema?.journeyName}</h2>
      <div className="status">
        <p>Status: {isBlocked ? 'BLOCKED' : 'UNLOCKED'}</p>
        <p>Progress: {completionPercentage}%</p>
      </div>

      <div className="data-display">
        <h3>Your Context Data</h3>
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {schema?.fields.map(field => (
              <tr key={field.key}>
                <td>{field.label}</td>
                <td>
                  {dbData.context_data[field.key] !== null
                    ? String(dbData.context_data[field.key])
                    : <em>Not set</em>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="metadata">
        <p>Last updated: {new Date(dbData.updated_at).toLocaleDateString()}</p>
        <p>Last validated: {new Date(dbData.last_validated_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
```

### Example 9: Validate and Update Multiple Journeys

```typescript
import { supabase } from '@/lib/supabase';
import { getJourneySchema } from '@/data/journeySchemas';
import { journeyValidator } from '@/services/journeyValidator';

async function validateAndUpdateAllJourneys(
  userId: string,
  contextDataMap: Record<string, Record<string, any>>
) {
  const results: Array<{
    journeyId: string;
    success: boolean;
    isBlocked: boolean;
    completionPercentage: number;
    error?: string;
  }> = [];

  for (const [journeyId, contextData] of Object.entries(contextDataMap)) {
    try {
      const schema = getJourneySchema(journeyId);
      if (!schema) {
        results.push({
          journeyId,
          success: false,
          isBlocked: false,
          completionPercentage: 0,
          error: 'Schema not found',
        });
        continue;
      }

      // Validate
      const validation = journeyValidator.validateJourneyContext(schema, contextData);

      // Save to database
      await supabase.from('journey_contexts').upsert({
        user_id: userId,
        journey_id: journeyId,
        context_data: contextData,
        is_blocked: validation.isBlocked,
        completion_percentage: validation.completionPercentage,
        validation_status: validation.isValid ? 'valid' : 'invalid',
      });

      results.push({
        journeyId,
        success: true,
        isBlocked: validation.isBlocked,
        completionPercentage: validation.completionPercentage,
      });
    } catch (error) {
      results.push({
        journeyId,
        success: false,
        isBlocked: false,
        completionPercentage: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
```

---

## Advanced Patterns

### Example 10: Auto-Fill from User Profile

```typescript
import { useEffect, useState } from 'react';
import { useJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';
import { getUserProfile } from '@/services/userService';

interface AutoFillProps {
  journeyId: string;
  userId: string;
}

export function AutoFillContextFromProfile({ journeyId, userId }: AutoFillProps) {
  const [autoFilledData, setAutoFilledData] = useState<Record<string, any>>({});

  const { schema, mergeData } = useJourneyValidation(journeyId, autoFilledData);

  useEffect(() => {
    const autoFill = async () => {
      try {
        const profile = await getUserProfile(userId);

        // Map profile fields to schema fields
        const filled: Record<string, any> = {};

        if (journeyId === 'finance') {
          // Try to fill from profile
          if (profile.monthly_income) filled.monthly_income = profile.monthly_income;
          if (profile.employment_status) filled.financial_status = profile.employment_status;
        }

        if (journeyId === 'health-physical') {
          if (profile.height_cm) filled.height = profile.height_cm;
          if (profile.weight_kg) filled.weight = profile.weight_kg;
          if (profile.exercise_frequency) filled.activity_level = profile.exercise_frequency;
        }

        // Show what was auto-filled
        console.log('Auto-filled fields:', Object.keys(filled));
        setAutoFilledData(filled);
      } catch (error) {
        console.error('Failed to auto-fill:', error);
      }
    };

    autoFill();
  }, [journeyId, userId]);

  return (
    <div className="auto-filled-notice">
      <p>
        We've pre-filled some of your information from your profile.
        Please review and adjust as needed.
      </p>
    </div>
  );
}
```

### Example 11: Bulk Import from CSV

```typescript
import { journeyValidator } from '@/services/journeyValidator';
import { supabase } from '@/lib/supabase';
import { getJourneySchema } from '@/data/journeySchemas';

async function importJourneyContextsFromCSV(
  userId: string,
  csvFile: File
) {
  const text = await csvFile.text();
  const rows = text.split('\n').map(row => row.split(','));
  const headers = rows[0];

  const errors: string[] = [];
  const successful: string[] = [];

  // CSV format: journey_id, field1, field2, field3, ...
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length === 0) continue;

    const journeyId = rows[i][0];
    const schema = getJourneySchema(journeyId);

    if (!schema) {
      errors.push(`Row ${i}: Journey "${journeyId}" not found`);
      continue;
    }

    // Build context from CSV row
    const contextData: Record<string, any> = {};
    for (let j = 1; j < headers.length; j++) {
      const fieldKey = headers[j].trim();
      const fieldValue = rows[i][j]?.trim();

      if (fieldValue) {
        contextData[fieldKey] = fieldValue;
      }
    }

    // Validate
    const validation = journeyValidator.validateJourneyContext(schema, contextData);

    if (!validation.isValid) {
      errors.push(
        `Row ${i}: ${validation.errorSummary || 'Invalid data'}`
      );
      continue;
    }

    // Save
    try {
      await supabase.from('journey_contexts').upsert({
        user_id: userId,
        journey_id: journeyId,
        context_data: contextData,
        is_blocked: validation.isBlocked,
        completion_percentage: validation.completionPercentage,
        validation_status: 'valid',
      });

      successful.push(journeyId);
    } catch (error) {
      errors.push(
        `Row ${i}: Failed to save - ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return { successful, errors };
}
```

---

**End of Examples**
