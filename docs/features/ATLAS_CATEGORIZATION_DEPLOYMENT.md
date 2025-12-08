# Atlas Auto-Categorization - Deployment Guide

## Pre-requisites

1. Supabase project configured
2. Gemini backend (Edge Function) deployed
3. Frontend build pipeline working
4. Database access for migrations

## Deployment Steps

### Step 1: Apply Database Migration

Run the migration to add the `category` column to `work_items`:

```bash
# Using Supabase CLI
supabase db push

# Or manually via Supabase Dashboard
# Navigate to: Database > SQL Editor
# Copy and paste content from:
# supabase/migrations/20251206_add_category_to_work_items.sql
```

**Verification**:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'work_items' AND column_name = 'category';
```

Expected output:
```
 column_name | data_type
-------------+-----------
 category    | text
```

### Step 2: Verify Backend Action

The `categorize_task` action should already exist in the Gemini backend:

**Location**: `supabase/functions/gemini-chat/index.ts`

**Verification**:
```bash
# Check if edge function is deployed
supabase functions list

# Test the function
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/gemini-chat' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "categorize_task",
    "payload": {
      "taskDescription": "Consulta médica"
    },
    "model": "fast"
  }'
```

Expected response:
```json
{
  "result": "Saúde"
}
```

### Step 3: Build Frontend

No additional build configuration needed. The feature is integrated into existing components.

```bash
npm run build
```

### Step 4: Deploy Frontend

Deploy to your hosting provider (Vercel, Netlify, etc.):

```bash
# Example: Vercel
vercel --prod

# Example: Netlify
netlify deploy --prod
```

## Verification Checklist

After deployment, verify:

- [ ] Migration applied successfully
- [ ] `work_items` table has `category` column
- [ ] Edge function responds to `categorize_task` action
- [ ] Frontend loads without errors
- [ ] Task creation form shows categorization UI
- [ ] Creating a task with category saves to database
- [ ] Category badge appears after AI suggestion
- [ ] Accept/reject buttons work correctly

## Testing in Production

### Test 1: Create Work Task
1. Navigate to Atlas (Meu Dia)
2. Start typing: "Reunião com cliente"
3. Wait 1 second
4. Verify: "Categoria sugerida: Trabalho" appears
5. Click checkmark to accept
6. Submit task
7. Verify task appears in list with category

### Test 2: Create Health Task
1. Type: "Consulta com dentista"
2. Verify: "Categoria sugerida: Saúde"
3. Accept and submit
4. Check database:
```sql
SELECT title, category FROM work_items WHERE title LIKE '%dentista%';
```

### Test 3: Reject Suggestion
1. Type: "Comprar pão"
2. Wait for suggestion
3. Click X to reject
4. Submit task
5. Verify: Task created without category (category IS NULL)

## Rollback Plan

If issues occur, rollback in this order:

### 1. Disable Feature (Frontend Only)
**Quick fix** - no database changes:

Edit `src/modules/atlas/components/TaskCreationInput.tsx`:
```typescript
// Comment out categorization logic
/*
const {
  suggestedCategory,
  isLoading: isCategorizing,
  debouncedCategorize,
  clearSuggestion
} = useTaskCategorization();
*/

// Comment out CategorySuggestion component in JSX
```

Redeploy frontend.

### 2. Revert Migration (Full Rollback)
**Nuclear option** - removes column:

```sql
-- Remove index
DROP INDEX IF EXISTS idx_work_items_category;

-- Remove column
ALTER TABLE public.work_items DROP COLUMN IF EXISTS category;
```

## Monitoring

### Key Metrics to Track

1. **Categorization Success Rate**
```sql
SELECT
  COUNT(*) FILTER (WHERE category IS NOT NULL) * 100.0 / COUNT(*) as categorized_percentage
FROM work_items
WHERE created_at > NOW() - INTERVAL '7 days';
```

2. **Category Distribution**
```sql
SELECT category, COUNT(*) as count
FROM work_items
WHERE category IS NOT NULL
GROUP BY category
ORDER BY count DESC;
```

3. **Error Rate**
Check Supabase logs for errors:
```bash
supabase functions logs gemini-chat --tail
```

Look for:
- `Error categorizing task`
- `Invalid category received`
- API rate limits (429 errors)

### Performance Metrics

Monitor in browser console:
- Time from input to suggestion: Should be < 2 seconds
- API call frequency: Should debounce to max 1 call per second
- UI responsiveness: No blocking during categorization

## Troubleshooting

### Issue: No suggestions appearing

**Check**:
1. Open browser console - look for errors
2. Verify GeminiClient is initialized
3. Check Supabase auth token is valid
4. Test edge function directly (see Step 2)

**Fix**:
```typescript
// Add debug logging in useTaskCategorization.ts
console.log('[Categorization] Input:', taskDescription);
console.log('[Categorization] Response:', response);
```

### Issue: Wrong categories suggested

**Check**:
1. Verify backend prompt in `gemini-chat/index.ts`
2. Test with various task descriptions
3. Check if AI model is overloaded

**Fix**:
Update prompt in backend to be more specific or add examples.

### Issue: Database constraint violation

**Error**: `new row for relation "work_items" violates check constraint`

**Cause**: Invalid category value

**Fix**:
```typescript
// In useTaskCategorization.ts
const validCategories: TaskCategory[] = [
  'Trabalho', 'Pessoal', 'Saúde', 'Educação', 'Finanças', 'Outros'
];

if (!validCategories.includes(category as TaskCategory)) {
  setSuggestedCategory('Outros'); // Fallback
}
```

### Issue: Too many API calls

**Symptom**: Rate limit errors (429)

**Fix**:
Increase debounce delay:
```typescript
const debouncedCategorize = useDebounce(categorizeTask, 2000); // 2 seconds
```

## Support

For production issues:
1. Check Supabase dashboard logs
2. Review browser console errors
3. Test edge function independently
4. Contact development team with:
   - User ID
   - Task description
   - Timestamp
   - Error message (if any)

## Success Criteria

Feature is considered successfully deployed when:
- ✅ Migration applied without errors
- ✅ 95%+ of tasks get valid category suggestions
- ✅ Response time < 2 seconds
- ✅ No increase in error rate
- ✅ Users can accept/reject suggestions
- ✅ Categories saved correctly to database
