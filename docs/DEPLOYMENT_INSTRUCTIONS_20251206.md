# Journey Redesign - Deployment Instructions
**Date**: 2025-12-06
**Migration**: `20251206_journey_redesign.sql`
**Edge Function**: `gemini-chat`

## Pre-Deployment Checklist

Before starting, verify:
- [ ] Supabase CLI is installed: `npx supabase --version`
- [ ] You're authenticated: `npx supabase login`
- [ ] Project is linked: `npx supabase link --project-ref <your-project-ref>`
- [ ] Gemini API key is available

---

## Step 1: Apply Database Migration

### 1.1 Push Migration to Remote

```bash
cd C:\Users\lucas\repos\Aica_frontend\Aica_frontend
npx supabase db push
```

**Expected Output**:
```
Applying migration 20251206_journey_redesign.sql...
✓ Migration applied successfully
```

### 1.2 Verify Tables Created

Run this SQL query in Supabase SQL Editor:

```sql
-- Check all 6 tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'moments',
  'weekly_summaries',
  'daily_questions',
  'question_responses',
  'consciousness_points_log',
  'user_consciousness_stats'
)
ORDER BY table_name;
```

**Expected Result**: 6 rows

### 1.3 Verify Functions Created

```sql
-- Check all 3 functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'calculate_cp_level',
  'award_consciousness_points',
  'update_moment_streak'
)
ORDER BY routine_name;
```

**Expected Result**: 3 rows

### 1.4 Verify Daily Questions Seeded

```sql
-- Check 10 questions were seeded
SELECT COUNT(*) as question_count,
       COUNT(*) FILTER (WHERE active = true) as active_count
FROM daily_questions;
```

**Expected Result**:
- question_count: 10
- active_count: 10

### 1.5 Verify RLS Enabled on All Tables

```sql
-- Check RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'moments',
  'weekly_summaries',
  'daily_questions',
  'question_responses',
  'consciousness_points_log',
  'user_consciousness_stats'
)
ORDER BY tablename;
```

**Expected Result**: All rows should have `rls_enabled = true`

---

## Step 2: Create Storage Bucket for Audio

### 2.1 Create Bucket via Supabase Dashboard

1. Go to: **Storage** → **New Bucket**
2. Name: `moments-audio`
3. Public: **Yes** (check the box)
4. Click **Create Bucket**

### 2.2 Configure Storage RLS Policies

Run these SQL commands in Supabase SQL Editor:

```sql
-- Policy: Users can upload own audio
CREATE POLICY "Users can upload own audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moments-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read own audio
CREATE POLICY "Users can read own audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'moments-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update own audio
CREATE POLICY "Users can update own audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'moments-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete own audio
CREATE POLICY "Users can delete own audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'moments-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 2.3 Verify Storage Bucket

```sql
-- Check bucket exists and is public
SELECT id, name, public
FROM storage.buckets
WHERE name = 'moments-audio';
```

**Expected Result**: 1 row with `public = true`

---

## Step 3: Deploy Edge Function

### 3.1 Verify Edge Function Exists

```bash
# Check function file exists
ls -la supabase/functions/gemini-chat/index.ts
```

**Expected**: File exists with updated actions

### 3.2 Deploy Function

```bash
npx supabase functions deploy gemini-chat
```

**Expected Output**:
```
Deploying function gemini-chat...
✓ Function deployed successfully
Function URL: https://<project-ref>.supabase.co/functions/v1/gemini-chat
```

### 3.3 Set Secrets (if not already set)

```bash
# Check existing secrets
npx supabase secrets list

# If GEMINI_API_KEY is missing, set it
npx supabase secrets set GEMINI_API_KEY=<your-gemini-api-key>
```

---

## Step 4: Test Edge Function

### 4.1 Test Sentiment Analysis Action

```bash
npx supabase functions invoke gemini-chat --data '{
  "action": "analyze_moment_sentiment",
  "payload": {
    "content": "Hoje foi um dia incrível! Consegui finalizar o projeto e me sinto muito realizado."
  }
}'
```

**Expected Response**:
```json
{
  "result": {
    "timestamp": "2025-12-06T...",
    "sentiment": "very_positive",
    "sentimentScore": 0.8,
    "emotions": ["joy", "excitement", "gratitude"],
    "triggers": ["work", "personal_growth"],
    "energyLevel": 85
  },
  "success": true,
  "latencyMs": 1234
}
```

### 4.2 Test Weekly Summary Action

```bash
npx supabase functions invoke gemini-chat --data '{
  "action": "generate_weekly_summary",
  "payload": {
    "moments": [
      {
        "id": "test-1",
        "content": "Hoje me senti muito produtivo no trabalho",
        "emotion": "happy",
        "sentiment_data": {
          "sentiment": "positive",
          "sentimentScore": 0.7
        },
        "tags": ["trabalho"],
        "created_at": "2025-12-01T10:00:00Z"
      },
      {
        "id": "test-2",
        "content": "Tive um dia difícil, mas consegui superar os desafios",
        "emotion": "determined",
        "sentiment_data": {
          "sentiment": "neutral",
          "sentimentScore": 0.1
        },
        "tags": ["saude"],
        "created_at": "2025-12-03T14:00:00Z"
      }
    ]
  }
}'
```

**Expected Response**:
```json
{
  "result": {
    "emotionalTrend": "ascending",
    "dominantEmotions": ["determination", "joy"],
    "keyMoments": [...],
    "insights": [...],
    "suggestedFocus": "..."
  },
  "success": true,
  "latencyMs": 2345
}
```

---

## Step 5: Final Validation

### 5.1 Run Complete Schema Check

```sql
-- Comprehensive validation
DO $$
DECLARE
  table_count INT;
  function_count INT;
  question_count INT;
  bucket_count INT;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO table_count
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('moments', 'weekly_summaries', 'daily_questions',
                    'question_responses', 'consciousness_points_log',
                    'user_consciousness_stats');

  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('calculate_cp_level', 'award_consciousness_points',
                    'update_moment_streak');

  -- Count questions
  SELECT COUNT(*) INTO question_count
  FROM daily_questions
  WHERE active = true;

  -- Count storage buckets
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE name = 'moments-audio';

  -- Report
  RAISE NOTICE 'Tables created: %/6', table_count;
  RAISE NOTICE 'Functions created: %/3', function_count;
  RAISE NOTICE 'Active questions: %/10', question_count;
  RAISE NOTICE 'Storage bucket: %/1', bucket_count;

  -- Assert all conditions
  IF table_count = 6 AND function_count = 3 AND
     question_count = 10 AND bucket_count = 1 THEN
    RAISE NOTICE '✓ ALL VALIDATIONS PASSED';
  ELSE
    RAISE WARNING '✗ SOME VALIDATIONS FAILED';
  END IF;
END $$;
```

### 5.2 Test Database Functions

```sql
-- Test calculate_cp_level function
SELECT * FROM calculate_cp_level(0);    -- Should return (1, 'Observador')
SELECT * FROM calculate_cp_level(150);  -- Should return (2, 'Consciente')
SELECT * FROM calculate_cp_level(600);  -- Should return (3, 'Reflexivo')
SELECT * FROM calculate_cp_level(2000); -- Should return (4, 'Integrado')
SELECT * FROM calculate_cp_level(6000); -- Should return (5, 'Mestre')
```

### 5.3 Test Award Points Function (with authenticated user)

You'll need to run this as an authenticated user via your app or Supabase Dashboard:

```sql
-- This should work when called via authenticated context
SELECT award_consciousness_points(
  auth.uid(),           -- Current user
  5,                    -- Points to award
  'moment_registered',  -- Reason
  NULL,                 -- Reference ID
  NULL                  -- Reference type
);
```

**Expected Result**:
```json
{
  "success": true,
  "new_total": 5,
  "level": 1,
  "level_name": "Observador",
  "leveled_up": false
}
```

---

## Rollback Plan (Emergency)

If something goes wrong, you can rollback:

### Rollback Migration

```bash
npx supabase db reset
```

**WARNING**: This will delete all data!

### Safer Rollback (Manual)

```sql
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS consciousness_points_log CASCADE;
DROP TABLE IF EXISTS question_responses CASCADE;
DROP TABLE IF EXISTS weekly_summaries CASCADE;
DROP TABLE IF EXISTS moments CASCADE;
DROP TABLE IF EXISTS user_consciousness_stats CASCADE;
DROP TABLE IF EXISTS daily_questions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_moment_streak(UUID);
DROP FUNCTION IF EXISTS award_consciousness_points(UUID, INT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS calculate_cp_level(INT);
DROP FUNCTION IF EXISTS update_updated_at_column();
```

---

## Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution**: Tables already exist. Either:
1. Drop tables manually (see Rollback Plan)
2. Or modify migration to use `CREATE TABLE IF NOT EXISTS`

### Issue: Edge Function returns "API key not configured"

**Solution**:
```bash
npx supabase secrets set GEMINI_API_KEY=<your-key>
npx supabase functions deploy gemini-chat
```

### Issue: Storage bucket policies fail

**Solution**:
1. Ensure bucket is created first
2. Check `storage.foldername()` function exists
3. Verify policies reference correct bucket_id

### Issue: RLS blocks all access

**Solution**:
1. Check if user is authenticated: `SELECT auth.uid()`
2. Verify policies allow the operation
3. Use SECURITY DEFINER functions if needed

---

## Success Criteria

- ✅ 6 tables created with RLS enabled
- ✅ 3 PostgreSQL functions working
- ✅ 10 daily questions seeded and active
- ✅ Storage bucket created with RLS policies
- ✅ Edge Function deployed successfully
- ✅ Sentiment analysis action tested
- ✅ Weekly summary action tested
- ✅ All validation queries pass

---

## Next Steps After Deployment

1. **Update Frontend Code**:
   - Import new types from updated services
   - Test moment creation flow
   - Test weekly summary generation

2. **Monitor Edge Function Logs**:
   ```bash
   npx supabase functions logs gemini-chat --follow
   ```

3. **Set Up Monitoring**:
   - Create alerts for function errors
   - Monitor database performance
   - Track CP point distribution

4. **User Testing**:
   - Create test moments
   - Verify CP points awarded
   - Check weekly summary generation
   - Test storage upload/download

---

## Contact for Issues

If you encounter any issues during deployment:
1. Check Supabase logs: Dashboard → Database → Logs
2. Check function logs: `npx supabase functions logs gemini-chat`
3. Verify environment variables are set
4. Ensure database connection is stable

**Deployment Author**: Backend Architect Agent
**Deployment Date**: 2025-12-06
**Migration Version**: 20251206_journey_redesign
