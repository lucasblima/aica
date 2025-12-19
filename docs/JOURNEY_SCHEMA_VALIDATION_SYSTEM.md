# Journey Schema Validation System (GAP 4)

**Status:** Complete Implementation
**Version:** 1.0.0
**Last Updated:** 2025-12-17

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Core Components](#core-components)
5. [Usage Guide](#usage-guide)
6. [Examples](#examples)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [FAQ](#faq)

---

## Overview

The Journey Schema Validation System detects when a user's trail (contextual journey) is **blocked** due to missing required context. It enables the Aica Life OS to guide users through completing their journey context before unlocking modules and progression.

### Problem Solved

When a user starts a trail (e.g., Financial Recovery), certain context is essential:
- Total debts
- Monthly income
- Current financial status

If these fields are empty (`null`), the trail is **blocked**. Users must complete them before accessing trail-specific modules.

This system:
1. Defines which fields are required per trail
2. Validates user data against schema
3. Reports which fields are missing
4. Calculates progress (0-100%)
5. Integrates with UI to show blocking status

### Key Concepts

**Journey** = A contextual trail (e.g., 'finance', 'health-emotional')
**Schema** = Definition of required/optional fields for a journey
**Context Data** = User-provided values for journey fields
**Blocked** = Journey cannot proceed (missing required fields)
**Completion %** = Progress toward filling all fields (0-100%)

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend Component (e.g., ContextCard)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ useJourneyValidation Hook                                   │
│ - Validates user data against schema                        │
│ - Caches results for performance                            │
│ - Exposes validation state to component                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ JourneyValidator Service                                    │
│ - validateJourneyContext()                                  │
│ - getMissingFields()                                        │
│ - getCompletionPercentage()                                 │
│ - sanitizeData()                                            │
│ - ... other utility methods                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
   │ journeySchema│ │ userData     │ │ Validation  │
   │ ts           │ │ (from DB)    │ │ Options     │
   │ (JOURNEY_   │ │              │ │             │
   │  SCHEMAS)   │ │              │ │             │
   └─────────────┘ └──────────────┘ └──────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │ Supabase Database                  │
        │ - journey_contexts table           │
        │ - journey_context_history table    │
        └────────────────────────────────────┘
```

### Data Flow Example

1. **User opens ContextCard** for Finance trail
2. **Hook calls validator** with user's current finance data
3. **Validator checks schema** against data:
   - ✓ monthly_income: 3000 (filled)
   - ✓ financial_status: 'stressed' (filled)
   - ✗ total_debts: null (MISSING!)
4. **Validator returns** `isBlocked=true`, `missingFields=[total_debts]`
5. **Component shows** blocking message: "Please fill in Total Debts to proceed"
6. **User fills field** → Hook revalidates → isBlocked becomes false

---

## File Structure

```
src/
├── types/
│   └── journeySchemas.ts           ← Type definitions (FieldSchema, JourneySchema, etc)
│
├── data/
│   └── journeySchemas.ts           ← All 5 trail schemas with fields
│
├── services/
│   └── journeyValidator.ts         ← Core validation logic (singleton)
│
├── modules/journey/hooks/
│   └── useJourneyValidation.ts     ← React hooks for components
│
docs/
├── sql/
│   └── 20251217_create_journey_context_tables.sql  ← DB migration
│
└── JOURNEY_SCHEMA_VALIDATION_SYSTEM.md ← This file
```

---

## Core Components

### 1. Types: `journeySchemas.ts`

Defines TypeScript interfaces for the validation system:

```typescript
// Single field definition
interface FieldSchema {
  key: string;                  // 'total_debts'
  type: FieldType;              // 'decimal', 'string', etc
  required: boolean;            // Is this field blocking?
  label: string;                // 'Total de Dívidas'
  description?: string;
  inputType?: string;           // 'currency', 'number', 'select'
  validationRules?: ValidationRule[];
}

// Complete schema for a journey
interface JourneySchema {
  journeyId: string;            // 'finance'
  journeyName: string;          // 'Financeiro e Prosperidade'
  fields: FieldSchema[];        // Array of all fields
  requiredFieldsCount: number;
}

// Validation result
interface JourneyValidationResult {
  journeyId: string;
  isValid: boolean;             // No errors
  isBlocked: boolean;           // Missing required fields
  completionPercentage: number; // 0-100
  missingFields: FieldSchema[]; // What's missing
  nextRequiredField?: FieldSchema; // Prompt user to fill this
  errorSummary: string;
}
```

### 2. Validator Service: `journeyValidator.ts`

Core business logic:

```typescript
class JourneyValidator {
  // Main validation method
  validateJourneyContext(
    schema: JourneySchema,
    userData: Record<string, any>
  ): JourneyValidationResult

  // Check if journey is blocked
  isJourneyBlocked(schema, userData): boolean

  // Get missing fields
  getMissingFields(schema, userData): FieldSchema[]

  // Get next field user should fill
  getNextRequiredField(schema, userData): FieldSchema | null

  // Calculate 0-100 progress
  getCompletionPercentage(schema, userData): number

  // Validate single field
  isFieldValid(schema, userData, fieldKey): boolean

  // Clean user data (only keep schema fields)
  sanitizeData(schema, data): Record<string, any>
}

// Export singleton
export const journeyValidator = new JourneyValidator();
```

### 3. React Hook: `useJourneyValidation.ts`

Integrates validator into React components:

```typescript
// Main hook
const {
  schema,                      // The JourneySchema
  isBlocked,                   // boolean
  missingFields,               // FieldSchema[]
  nextRequiredField,           // FieldSchema | null
  completionPercentage,        // 0-100
  filledFieldsCount,           // number
  totalFieldsCount,            // number
  validate,                    // (data) => JourneyValidationResult
  checkFieldValid,             // (fieldKey) => boolean
  getFieldValidationMessage,   // (fieldKey) => string
  getProgressMessage,          // () => string
} = useJourneyValidation('finance', userData);

// Multi-journey hook
const {
  validations,                 // Array of results
  allBlocked,                  // boolean
  blockedJourneys,             // string[]
  overallCompletion,           // 0-100
} = useMultipleJourneyValidation(['finance', 'health-emotional'], userData);

// Field-level hook (for form inputs)
const {
  field,
  isValid,
  isFilled,
  hasErrors,
  errors,
  isRequired,
} = useFieldValidation('finance', 'total_debts', userValue);

// Progress tracking hook
const {
  completionPercentage,
  requiredCompletionPercentage,
  filledFieldsCount,
  progressLabel,
} = useJourneyProgress('finance', userData);
```

### 4. Schemas: `journeySchemas.ts`

Defines all 5 trail schemas:

```typescript
// Example: Finance Trail
const financeSchema: JourneySchema = {
  journeyId: 'finance',
  journeyName: 'Financeiro e Prosperidade',
  fields: [
    {
      key: 'financial_status',
      type: 'string',
      required: true,  // BLOCKING
      label: 'Status Financeiro',
      inputType: 'select',
      options: [
        { value: 'secure', label: 'Seguro' },
        { value: 'stressed', label: 'Estressado' },
      ],
    },
    {
      key: 'monthly_income',
      type: 'decimal',
      required: true,  // BLOCKING
      label: 'Renda Mensal',
      inputType: 'currency',
      validationRules: [
        { type: 'min', value: 0, message: 'Must be positive' },
      ],
    },
    {
      key: 'total_debts',
      type: 'decimal',
      required: false,  // OPTIONAL
      label: 'Total de Dívidas',
      inputType: 'currency',
    },
  ],
  requiredFieldsCount: 2,
};
```

All 5 trails:
- `health-emotional`: 4 required fields
- `health-physical`: 3 required fields
- `finance`: 3 required fields
- `relationships`: 2 required fields
- `growth`: 3 required fields

### 5. Database Tables: `20251217_create_journey_context_tables.sql`

**Table: `journey_contexts`**
- Stores user's context data as JSONB
- Tracks validation status (valid/invalid)
- Calculates completion percentage
- Denormalizes `is_blocked` flag for fast queries

**Table: `journey_context_history`**
- Audit log of all changes
- Enables data recovery
- Tracks field-level changes

---

## Usage Guide

### Basic Usage: Check if Journey is Blocked

```typescript
import { useJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';

function ContextCard({ journeyId, userData }) {
  const { isBlocked, missingFields, nextRequiredField } =
    useJourneyValidation(journeyId, userData);

  if (isBlocked) {
    return (
      <div className="block-message">
        <h3>Journey Blocked</h3>
        <p>Please complete: {nextRequiredField?.label}</p>
        <ul>
          {missingFields.map(field => (
            <li key={field.key}>{field.label}</li>
          ))}
        </ul>
      </div>
    );
  }

  return <div>Journey is unlocked!</div>;
}
```

### With Progress Tracking

```typescript
function JourneyProgressCard({ journeyId, userData }) {
  const {
    completionPercentage,
    filledFieldsCount,
    totalFieldsCount,
    getProgressMessage
  } = useJourneyValidation(journeyId, userData);

  return (
    <div>
      <h3>{getProgressMessage()}</h3>
      <progress value={completionPercentage} max={100} />
      <p>{filledFieldsCount}/{totalFieldsCount} fields completed</p>
    </div>
  );
}
```

### Form Field Validation

```typescript
import { useFieldValidation } from '@/modules/journey/hooks/useJourneyValidation';

function MonthlyIncomeField({ journeyId, value, onChange }) {
  const { isValid, isFilled, errors, errorMessage, isRequired } =
    useFieldValidation(journeyId, 'monthly_income', value);

  return (
    <div>
      <label>Monthly Income {isRequired && '*'}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={!isValid && isFilled ? 'error' : ''}
      />
      {errorMessage && <p className="error">{errorMessage}</p>}
    </div>
  );
}
```

### Multi-Journey Status

```typescript
function AllJourneysStatus({ journeyIds, userContextData }) {
  const { allBlocked, blockedJourneys, overallCompletion } =
    useMultipleJourneyValidation(journeyIds, userContextData);

  return (
    <div>
      {allBlocked && (
        <warning>
          {blockedJourneys.length} journeys are blocked.
          Please complete them.
        </warning>
      )}
      <progress value={overallCompletion} max={100} />
    </div>
  );
}
```

---

## Examples

### Example 1: Finance Context Blocking

**User Data:**
```json
{
  "financial_status": "stressed",
  "monthly_income": 3000,
  "total_debts": null,
  "monthly_expenses": null
}
```

**Validation:**
```typescript
const schema = getJourneySchema('finance');
const validation = journeyValidator.validateJourneyContext(schema, userData);

// Result:
{
  isBlocked: true,
  completionPercentage: 50,
  missingFields: [
    { key: 'total_debts', label: 'Total de Dívidas', required: false },
    // Note: total_debts is optional, but:
  ],
  nextRequiredField: null,
  errorSummary: ''
}
```

Wait - looking at finance schema again:
- Required: financial_status ✓, financial_priorities ✓, monthly_income ✓
- Optional: total_debts, monthly_expenses, etc

So actually this is **NOT blocked** - all required fields are filled.

**Correct Example:**

```json
{
  "financial_status": null,
  "financial_priorities": [],
  "monthly_income": null
}
```

```typescript
// Result:
{
  isBlocked: true,
  completionPercentage: 0,
  missingFields: [
    { key: 'financial_status', label: 'Status Financeiro Atual' },
    { key: 'financial_priorities', label: 'Prioridades Financeiras' },
    { key: 'monthly_income', label: 'Renda Mensal Aproximada' }
  ],
  nextRequiredField: { key: 'financial_status', ... },
  errorSummary: ''
}
```

### Example 2: Health-Emotional Progress

**User completes step by step:**

```typescript
// Step 1: Only current_emotional_state
let data = { current_emotional_state: 'anxious' };
journeyValidator.getCompletionPercentage(schema, data); // 16% (1/6 fields)

// Step 2: Add emotional_focus_areas
data.emotional_focus_areas = ['stress_management', 'resilience'];
journeyValidator.getCompletionPercentage(schema, data); // 33% (2/6 fields)

// Step 3: Add reflection_frequency
data.reflection_frequency = 'daily';
journeyValidator.getCompletionPercentage(schema, data); // 50% (3/6 fields)

// Step 4: Add primary_emotional_goal
data.primary_emotional_goal = 'reduce_stress';
journeyValidator.getCompletionPercentage(schema, data); // 66% (4/6 fields)
// NOTE: All 4 required fields are now filled, so isBlocked = false

// User optionally adds more:
data.meditation_experience = 'beginner';
journeyValidator.getCompletionPercentage(schema, data); // 83% (5/6 fields)

data.therapy_or_counseling = true;
journeyValidator.getCompletionPercentage(schema, data); // 100% (6/6 fields)
```

### Example 3: Custom Validation Rule

```typescript
// In a schema field:
{
  key: 'custom_field',
  type: 'string',
  required: true,
  label: 'Custom Field',
  validationRules: [
    {
      type: 'pattern',
      value: '^[A-Z][a-z]+$',  // Must start with capital letter
      message: 'Must start with capital letter'
    },
  ],
}

// Validation:
const result = journeyValidator.validateJourneyContext(schema, {
  custom_field: 'invalid'  // Lowercase 'i'
});
// result.fieldResults[n].errors = ['Must start with capital letter']
// result.isValid = false
```

---

## Database Schema

### Table: `journey_contexts`

```sql
-- User's context data for a single journey
CREATE TABLE journey_contexts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  journey_id TEXT NOT NULL,  -- 'finance', 'health-emotional', etc

  -- Core context data (flexible JSONB)
  context_data JSONB,  -- { "field_key": value, ... }

  -- Validation metadata (denormalized for performance)
  is_complete BOOLEAN,
  is_blocked BOOLEAN,
  completion_percentage INT,
  validation_status TEXT,
  validation_errors TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_validated_at TIMESTAMPTZ,

  UNIQUE (user_id, journey_id)
);

-- Indexes
CREATE INDEX idx_journey_contexts_user_id ON journey_contexts(user_id);
CREATE INDEX idx_journey_contexts_is_blocked ON journey_contexts(user_id, is_blocked);
CREATE INDEX idx_journey_contexts_data ON journey_contexts USING GIN (context_data);
```

### Table: `journey_context_history`

```sql
-- Audit log of changes
CREATE TABLE journey_context_history (
  id UUID PRIMARY KEY,
  journey_context_id UUID REFERENCES journey_contexts(id),
  user_id UUID REFERENCES auth.users(id),
  journey_id TEXT,

  -- Before/after states
  previous_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],

  -- Metadata
  change_reason TEXT,
  created_at TIMESTAMPTZ
);
```

---

## API Reference

### JourneyValidator Class

#### `validateJourneyContext(schema, userData, options?)`

**Parameters:**
- `schema: JourneySchema` - The schema to validate against
- `userData: Record<string, any>` - User's data
- `options?: ValidationOptions` - Validation options

**Returns:** `JourneyValidationResult`

**Example:**
```typescript
const result = journeyValidator.validateJourneyContext(schema, userData, {
  checkRequired: true,
  checkTypes: true,
  checkRules: true,
});
```

#### `isJourneyBlocked(schema, userData)`

Returns `true` if any required field is missing.

```typescript
if (journeyValidator.isJourneyBlocked(schema, userData)) {
  // Journey cannot proceed
}
```

#### `getMissingFields(schema, userData)`

Returns array of required fields that are empty.

```typescript
const missing = journeyValidator.getMissingFields(schema, userData);
// [{ key: 'total_debts', label: 'Total de Dívidas', ... }]
```

#### `getCompletionPercentage(schema, userData)`

Returns 0-100 progress indicator.

```typescript
const progress = journeyValidator.getCompletionPercentage(schema, userData);
// 65
```

#### `getNextRequiredField(schema, userData)`

Returns the first missing required field (for prompting user).

```typescript
const nextField = journeyValidator.getNextRequiredField(schema, userData);
// { key: 'total_debts', label: 'Total de Dívidas', ... }
```

#### `getFieldValidationMessage(schema, userData, fieldKey)`

Returns error message for a field.

```typescript
const message = journeyValidator.getFieldValidationMessage(schema, userData, 'monthly_income');
// "Monthly income must be a positive number"
```

#### `sanitizeData(schema, data)`

Removes fields not in schema (prevents injection).

```typescript
const clean = journeyValidator.sanitizeData(schema, {
  monthly_income: 3000,
  unknown_field: 'bad',  // Will be removed
});
// { monthly_income: 3000 }
```

### useJourneyValidation Hook

**Returns object with:**

| Property | Type | Description |
|----------|------|-------------|
| `schema` | `JourneySchema \| null` | The journey schema |
| `isBlocked` | `boolean` | Is journey blocked (missing required fields) |
| `missingFields` | `FieldSchema[]` | Required fields that are empty |
| `nextRequiredField` | `FieldSchema \| null` | First missing field |
| `completionPercentage` | `number` | 0-100 progress |
| `filledFieldsCount` | `number` | How many fields are filled |
| `totalFieldsCount` | `number` | Total fields in schema |
| `requiredFieldsCount` | `number` | Required fields count |
| `validate(data)` | `() => JourneyValidationResult` | Manual validation |
| `checkFieldValid(fieldKey)` | `() => boolean` | Is field valid |

---

## FAQ

### Q: How do I know if a journey is blocked?

**A:** Use the hook:
```typescript
const { isBlocked, nextRequiredField } = useJourneyValidation(journeyId, userData);
if (isBlocked) {
  console.log('Please complete:', nextRequiredField.label);
}
```

### Q: What counts as a "filled" field?

**A:** A field is filled if:
- `value !== null`
- `value !== undefined`
- `value !== ''` (empty string)

Note: `0`, `false`, and `[]` (empty array) are valid values.

### Q: Can I add custom validation rules?

**A:** Currently supports: `required`, `minLength`, `maxLength`, `min`, `max`, `pattern`

For custom rules, you can extend the `JourneyValidator` class:
```typescript
class MyValidator extends JourneyValidator {
  validateRule(value, rule, field) {
    if (rule.type === 'custom_rule_type') {
      return value === expectedValue ? null : rule.message;
    }
    return super.validateRule(value, rule, field);
  }
}
```

### Q: How do I save user context to the database?

**A:** After validation passes, save to Supabase:
```typescript
const cleanData = journeyValidator.sanitizeData(schema, userData);

const { error } = await supabase
  .from('journey_contexts')
  .upsert({
    user_id: userId,
    journey_id: journeyId,
    context_data: cleanData,
    is_blocked: false,
    completion_percentage: 100,
    validation_status: 'valid',
  }, {
    onConflict: 'user_id,journey_id'
  });
```

### Q: Can I have conditional fields?

**A:** Yes, use `dependsOn`:
```typescript
{
  key: 'emergency_fund_amount',
  dependsOn: 'has_emergency_fund',  // Only show if true
  ...
}
```

But validation doesn't check this automatically - you need frontend logic to hide/show fields.

### Q: How do I migrate existing user data to this system?

**A:** Create a migration script:
```typescript
async function migrateUserContexts() {
  // Get user's trail responses from onboarding
  const trailResponses = await getTrailResponses(userId);

  // For each trail, create journey_context
  for (const trail of trails) {
    const context_data = extractFieldsFromResponses(trailResponses, trail);

    await supabase.from('journey_contexts').upsert({
      user_id: userId,
      journey_id: trail.id,
      context_data,
      validation_status: 'valid',
    });
  }
}
```

### Q: Should I validate on every keystroke?

**A:** No, validate on:
1. Form submission
2. Field blur (for single field)
3. Save button click

The hook handles caching for performance.

### Q: What if a schema changes (new required field)?

**A:** Update `journeySchemas.ts` and increment `version`. Existing users will have `isBlocked=true` until they fill new field.

For soft migrations, make the field optional initially.

---

## Next Steps

### Short Term
1. Integrate with ContextCard component
2. Add UI for blocking message
3. Create context form for each journey
4. Test with real user flows

### Medium Term
1. Add field-level permissions (some fields only editable by user)
2. Implement conditional fields
3. Add schema versioning/migrations
4. Export context data as PDF

### Long Term
1. AI-powered field suggestions
2. Auto-fill from financial APIs
3. Context sharing between journeys
4. Historical trend analysis

---

## Support

For questions or issues:
1. Check the FAQ section
2. Review the examples
3. Check the TypeScript types in `src/types/journeySchemas.ts`
4. Check validator implementation in `src/services/journeyValidator.ts`

---

**End of Documentation**
