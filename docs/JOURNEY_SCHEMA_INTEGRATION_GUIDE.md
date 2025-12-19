# Journey Schema Validation System - Integration Guide

**Quick Start Guide for Integrating the Validation System into Existing Components**

## Files Created

1. **Type Definitions**
   - `src/types/journeySchemas.ts` - All TypeScript interfaces

2. **Validator Service**
   - `src/services/journeyValidator.ts` - Core validation logic (singleton)

3. **Schemas Definition**
   - `src/data/journeySchemas.ts` - All 5 trail schemas with fields

4. **React Hooks**
   - `src/modules/journey/hooks/useJourneyValidation.ts` - 3 custom hooks

5. **Database Migration**
   - `docs/sql/20251217_create_journey_context_tables.sql` - DB tables & triggers

6. **Documentation**
   - `docs/JOURNEY_SCHEMA_VALIDATION_SYSTEM.md` - Complete reference
   - `docs/examples/JOURNEY_SCHEMA_VALIDATION_EXAMPLES.md` - Code examples
   - `docs/JOURNEY_SCHEMA_INTEGRATION_GUIDE.md` - This file

---

## Step-by-Step Integration

### Step 1: Apply Database Migration

Before using the system, create the database tables:

```bash
# Using Supabase CLI
supabase migration up

# OR manually run the SQL in Supabase SQL Editor
# Copy contents of: docs/sql/20251217_create_journey_context_tables.sql
```

Tables created:
- `journey_contexts` - Store user context data
- `journey_context_history` - Audit log of changes

### Step 2: Export Validators to Singleton

The validator is already exported as a singleton:

```typescript
// src/services/journeyValidator.ts
export const journeyValidator = new JourneyValidator();
export { JourneyValidator };
```

This is ready to use globally.

### Step 3: Use in React Components

#### Option A: Simple Check (Recommended for ContextCard)

```typescript
import { useJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';

function MyContextCard({ journeyId, userData }) {
  const { isBlocked, missingFields } = useJourneyValidation(journeyId, userData);

  if (isBlocked) {
    return <BlockedMessage fields={missingFields} />;
  }

  return <UnlockedContent />;
}
```

#### Option B: With Progress (Recommended for Dashboards)

```typescript
import { useJourneyProgress } from '@/modules/journey/hooks/useJourneyValidation';

function ProgressIndicator({ journeyId, userData }) {
  const { completionPercentage, progressLabel } = useJourneyProgress(journeyId, userData);

  return (
    <div>
      <label>{progressLabel}</label>
      <progress value={completionPercentage} max={100} />
    </div>
  );
}
```

#### Option C: Form Validation (For Input Fields)

```typescript
import { useFieldValidation } from '@/modules/journey/hooks/useJourneyValidation';

function IncomeField({ journeyId, value, onChange }) {
  const { isValid, errorMessage } = useFieldValidation(
    journeyId,
    'monthly_income',
    value
  );

  return (
    <div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={!isValid ? 'error' : ''}
      />
      {errorMessage && <span className="error">{errorMessage}</span>}
    </div>
  );
}
```

---

## Common Integration Scenarios

### Scenario 1: ContextCard Component (Most Common)

**Goal:** Show if a journey is blocked, list missing fields

**Solution:**

```typescript
// src/components/ContextCard.tsx
import { useJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';

export function ContextCard({ journeyId, userData }) {
  const {
    schema,
    isBlocked,
    missingFields,
    nextRequiredField,
    completionPercentage,
  } = useJourneyValidation(journeyId, userData);

  return (
    <div className="context-card">
      <h3>{schema?.journeyName}</h3>

      {isBlocked ? (
        <div className="blocked">
          <p>Complete these fields to unlock:</p>
          <ul>
            {missingFields.map(f => (
              <li key={f.key}>{f.label}</li>
            ))}
          </ul>
          <button>Fill {nextRequiredField?.label}</button>
        </div>
      ) : (
        <div className="unlocked">
          <p>✓ Context complete!</p>
          <button>Access Modules</button>
        </div>
      )}
    </div>
  );
}
```

### Scenario 2: User Enters Context Form

**Goal:** Validate as user fills fields, show progress

**Solution:**

```typescript
import { useState } from 'react';
import { useJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';
import { getJourneySchema } from '@/data/journeySchemas';

export function ContextForm({ journeyId, userId }) {
  const [data, setData] = useState({});
  const schema = getJourneySchema(journeyId);

  const {
    completionPercentage,
    isBlocked,
    validate,
    sanitizeData,
  } = useJourneyValidation(journeyId, data);

  const handleSave = async () => {
    // Validate
    const validation = validate(data);
    if (!validation?.isValid) {
      alert('Please fix errors');
      return;
    }

    // Save to database
    const clean = sanitizeData(data);
    await supabase.from('journey_contexts').upsert({
      user_id: userId,
      journey_id: journeyId,
      context_data: clean,
      is_blocked: validation.isBlocked,
      completion_percentage: validation.completionPercentage,
    });
  };

  return (
    <form>
      {schema?.fields.map(field => (
        <FieldInput
          key={field.key}
          field={field}
          value={data[field.key]}
          onChange={(val) => setData(prev => ({ ...prev, [field.key]: val }))}
        />
      ))}

      <progress value={completionPercentage} max={100} />
      <button onClick={handleSave} disabled={isBlocked}>
        Save {completionPercentage}%
      </button>
    </form>
  );
}
```

### Scenario 3: Dashboard with All Journeys

**Goal:** Show blocked/unlocked status for all 5 trails

**Solution:**

```typescript
import { useMultipleJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';
import { ALL_SCHEMAS } from '@/data/journeySchemas';

export function JourneysDashboard({ userContextData }) {
  const journeyIds = ALL_SCHEMAS.map(s => s.journeyId);

  const {
    validations,
    allBlocked,
    blockedJourneys,
    overallCompletion,
  } = useMultipleJourneyValidation(journeyIds, userContextData);

  return (
    <div>
      <h2>Overall Progress: {overallCompletion}%</h2>

      {allBlocked && (
        <warning>
          {blockedJourneys.length} journeys blocked.
          Complete the required fields.
        </warning>
      )}

      <div className="grid">
        {validations.map(v => (
          <JourneyCard key={v.journeyId} validation={v} />
        ))}
      </div>
    </div>
  );
}
```

### Scenario 4: Update Journey Context in Database

**Goal:** Fetch from DB, validate, and update

**Solution:**

```typescript
import { supabase } from '@/lib/supabase';
import { getJourneySchema } from '@/data/journeySchemas';
import { journeyValidator } from '@/services/journeyValidator';

async function updateJourneyContext(
  userId: string,
  journeyId: string,
  newData: Record<string, any>
) {
  const schema = getJourneySchema(journeyId);
  if (!schema) throw new Error('Schema not found');

  // Validate
  const validation = journeyValidator.validateJourneyContext(schema, newData);

  // Clean data
  const clean = journeyValidator.sanitizeData(schema, newData);

  // Save to DB
  const { error } = await supabase
    .from('journey_contexts')
    .upsert({
      user_id: userId,
      journey_id: journeyId,
      context_data: clean,
      is_blocked: validation.isBlocked,
      completion_percentage: validation.completionPercentage,
      validation_status: validation.isValid ? 'valid' : 'invalid',
      last_validated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,journey_id'
    });

  if (error) throw error;

  return validation;
}
```

---

## Wiring to Existing Services

### Integrate with Supabase Service

Add these helpers to `src/services/supabaseService.ts`:

```typescript
import { supabase } from './supabaseClient';
import { getJourneySchema } from '@/data/journeySchemas';
import { journeyValidator } from './journeyValidator';

/**
 * Fetch journey context for a user
 */
export async function getJourneyContext(
  userId: string,
  journeyId: string
) {
  const { data, error } = await supabase
    .from('journey_contexts')
    .select('*')
    .eq('user_id', userId)
    .eq('journey_id', journeyId)
    .single();

  if (error?.code === 'PGRST116') {
    return null; // Not found
  }

  if (error) throw error;
  return data;
}

/**
 * Save and validate journey context
 */
export async function saveJourneyContext(
  userId: string,
  journeyId: string,
  contextData: Record<string, any>
) {
  const schema = getJourneySchema(journeyId);
  if (!schema) throw new Error(`Schema not found: ${journeyId}`);

  // Validate
  const validation = journeyValidator.validateJourneyContext(schema, contextData);

  // Save to database
  const { data, error } = await supabase
    .from('journey_contexts')
    .upsert({
      user_id: userId,
      journey_id: journeyId,
      context_data: journeyValidator.sanitizeData(schema, contextData),
      is_blocked: validation.isBlocked,
      completion_percentage: validation.completionPercentage,
      validation_status: validation.isValid ? 'valid' : 'invalid',
      validation_errors: validation.errorSummary,
      last_validated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,journey_id'
    });

  if (error) throw error;
  return { data, validation };
}

/**
 * Get all journey contexts for a user
 */
export async function getAllJourneyContexts(userId: string) {
  const { data, error } = await supabase
    .from('journey_contexts')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

/**
 * Get blocked journeys for a user
 */
export async function getBlockedJourneys(userId: string) {
  const { data, error } = await supabase
    .from('journey_contexts')
    .select('journey_id, completion_percentage')
    .eq('user_id', userId)
    .eq('is_blocked', true);

  if (error) throw error;
  return data || [];
}
```

### Integrate with Auth Context

If using Auth context, add journey validation to user state:

```typescript
// In your Auth context/hook
const [user, setUser] = useState(null);
const [journeyContexts, setJourneyContexts] = useState({});
const [blockedJourneys, setBlockedJourneys] = useState([]);

useEffect(() => {
  if (!user) return;

  const loadContexts = async () => {
    const contexts = await getAllJourneyContexts(user.id);
    setJourneyContexts(
      contexts.reduce((acc, ctx) => ({
        ...acc,
        [ctx.journey_id]: ctx.context_data
      }), {})
    );

    const blocked = await getBlockedJourneys(user.id);
    setBlockedJourneys(blocked.map(b => b.journey_id));
  };

  loadContexts();
}, [user]);
```

---

## API Endpoint (Optional - for Backend)

If you have a backend API, create an endpoint:

```typescript
// pages/api/journey-contexts/[journeyId].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { getJourneySchema } from '@/data/journeySchemas';
import { journeyValidator } from '@/services/journeyValidator';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { journeyId } = req.query;

  if (req.method === 'GET') {
    // Fetch journey context
    const { data, error } = await supabase
      .from('journey_contexts')
      .select('*')
      .eq('user_id', user.id)
      .eq('journey_id', journeyId)
      .single();

    if (error?.code !== 'PGRST116' && error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data || null);
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    // Validate and save
    const schema = getJourneySchema(journeyId as string);
    if (!schema) {
      return res.status(400).json({ error: 'Invalid journey ID' });
    }

    const validation = journeyValidator.validateJourneyContext(
      schema,
      req.body
    );

    const { error } = await supabase
      .from('journey_contexts')
      .upsert({
        user_id: user.id,
        journey_id: journeyId,
        context_data: journeyValidator.sanitizeData(schema, req.body),
        is_blocked: validation.isBlocked,
        completion_percentage: validation.completionPercentage,
        validation_status: validation.isValid ? 'valid' : 'invalid',
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      validation: {
        isBlocked: validation.isBlocked,
        completionPercentage: validation.completionPercentage,
      }
    });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
```

---

## Testing the System

### Unit Test Example

```typescript
// src/services/__tests__/journeyValidator.test.ts
import { journeyValidator } from '../journeyValidator';
import { getJourneySchema } from '@/data/journeySchemas';

describe('JourneyValidator', () => {
  it('should detect blocked journey when required field is missing', () => {
    const schema = getJourneySchema('finance');
    const userData = {
      // missing financial_status
      monthly_income: 3000,
      financial_priorities: ['debt']
    };

    const result = journeyValidator.validateJourneyContext(schema, userData);

    expect(result.isBlocked).toBe(true);
    expect(result.missingFields.length).toBeGreaterThan(0);
  });

  it('should unlock journey when all required fields are filled', () => {
    const schema = getJourneySchema('finance');
    const userData = {
      financial_status: 'stressed',
      monthly_income: 3000,
      financial_priorities: ['debt', 'emergency']
    };

    const result = journeyValidator.validateJourneyContext(schema, userData);

    expect(result.isBlocked).toBe(false);
    expect(result.completionPercentage).toBeGreaterThan(0);
  });
});
```

### E2E Test Example (with Playwright)

```typescript
// tests/e2e/journey-validation.spec.ts
import { test, expect } from '@playwright/test';

test('should show blocking message when context incomplete', async ({ page }) => {
  await page.goto('/journey/finance');

  // Should see blocking message
  const blockingMessage = page.getByText('Journey Blocked');
  await expect(blockingMessage).toBeVisible();

  // Should list missing fields
  const missingFields = page.getByText('Complete these fields:');
  await expect(missingFields).toBeVisible();
});

test('should enable access when context is complete', async ({ page }) => {
  // Assume user has filled context
  await page.goto('/journey/finance?complete=true');

  // Should see unlock message
  const unlockMessage = page.getByText('Context complete');
  await expect(unlockMessage).toBeVisible();

  // Should have access button
  const accessButton = page.getByRole('button', { name: /access modules/i });
  await expect(accessButton).toBeEnabled();
});
```

---

## Migration Checklist

- [ ] Run SQL migration to create tables
- [ ] Add Supabase helpers to `supabaseService.ts`
- [ ] Update Auth context to load journey contexts
- [ ] Create/update ContextCard component
- [ ] Add journey validation to relevant pages
- [ ] Test blocking behavior
- [ ] Test with real user data
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production

---

## Performance Considerations

1. **Caching:** The hook caches validation results (5 seconds by default)
2. **Database Indexes:** Created on `user_id`, `journey_id`, and `is_blocked`
3. **JSONB Queries:** Fast GIN index on `context_data` for searching
4. **Denormalization:** `is_blocked` and `completion_percentage` are cached on row

For very large datasets:
- Consider pagination for history table
- Archive old records to separate table
- Use read replicas for analytics queries

---

## Next Steps

1. **For Frontend:** See `docs/examples/JOURNEY_SCHEMA_VALIDATION_EXAMPLES.md`
2. **For API Integration:** See the endpoint examples above
3. **For Advanced Usage:** See `docs/JOURNEY_SCHEMA_VALIDATION_SYSTEM.md`

---

**Ready to integrate? Start with Scenario 1 (ContextCard Component)!**
