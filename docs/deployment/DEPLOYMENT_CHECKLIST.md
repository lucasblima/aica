# Journey Redesign Deployment Checklist

**Date**: 2025-12-06
**Migration Version**: `20251206_journey_redesign`
**Edge Function**: `gemini-chat` (updated)

---

## Pre-Deployment Preparation

### Environment Setup
- [ ] Supabase CLI installed (`npx supabase --version`)
- [ ] Authenticated with Supabase (`npx supabase login`)
- [ ] Project linked (`npx supabase link --project-ref <ref>`)
- [ ] Gemini API key available
- [ ] Backup of current database taken

### Documentation Review
- [ ] Read `docs/DEPLOYMENT_INSTRUCTIONS_20251206.md`
- [ ] Review migration file: `supabase/migrations/20251206_journey_redesign.sql`
- [ ] Review Edge Function: `supabase/functions/gemini-chat/index.ts`

---

## Step 1: Database Migration

### Apply Migration
```bash
cd C:\Users\lucas\repos\Aica_frontend\Aica_frontend
npx supabase db push
```

**Checkpoints**:
- [ ] Migration applied without errors
- [ ] No warnings about conflicting schemas
- [ ] Output confirms migration success

### Validate Tables Created
Run: `supabase/validation/post_deployment_validation.sql` sections 1-2

- [ ] 6 tables created: `moments`, `weekly_summaries`, `daily_questions`, `question_responses`, `consciousness_points_log`, `user_consciousness_stats`
- [ ] All tables have RLS enabled
- [ ] All tables have standard columns (`id`, `created_at`, `updated_at`)

### Validate Functions Created
Run: `supabase/validation/post_deployment_validation.sql` section 2

- [ ] `calculate_cp_level(INT)` function exists
- [ ] `award_consciousness_points(UUID, INT, TEXT, UUID, TEXT)` function exists
- [ ] `update_moment_streak(UUID)` function exists
- [ ] `update_updated_at_column()` trigger function exists
- [ ] All functions marked as `SECURITY DEFINER` where appropriate

### Validate Seed Data
Run: `supabase/validation/post_deployment_validation.sql` section 6

- [ ] 10 daily questions inserted
- [ ] All questions marked as `active = true`
- [ ] Questions distributed across categories: reflection, gratitude, energy, learning, change

### Validate RLS Policies
Run: `supabase/validation/post_deployment_validation.sql` section 5

- [ ] `moments` has 4 policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] `weekly_summaries` has 2 policies (SELECT, UPDATE)
- [ ] `daily_questions` has 1 policy (SELECT for active questions)
- [ ] `question_responses` has 2 policies (SELECT, INSERT)
- [ ] `consciousness_points_log` has 1 policy (SELECT)
- [ ] `user_consciousness_stats` has 2 policies (SELECT, UPDATE)

### Validate Indexes
Run: `supabase/validation/post_deployment_validation.sql` section 3

- [ ] `moments` has indexes on: `user_id`, `created_at`, `tags`, `sentiment_data`
- [ ] `weekly_summaries` has indexes on: `user_id`, `period_start`
- [ ] `question_responses` has indexes on: `user_id`, `responded_at`
- [ ] `consciousness_points_log` has indexes on: `user_id`, `created_at`

### Validate Triggers
Run: `supabase/validation/post_deployment_validation.sql` section 4

- [ ] `moments` has `update_updated_at` trigger
- [ ] `user_consciousness_stats` has `update_updated_at` trigger

---

## Step 2: Storage Bucket Setup

### Create Bucket
**Via Supabase Dashboard**:
1. Navigate to **Storage** → **New Bucket**
2. Name: `moments-audio`
3. Public: **Yes**
4. File size limit: 10 MB
5. Allowed MIME types: `audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/webm`, `audio/ogg`

**OR via SQL**: Run `supabase/setup/storage_bucket_setup.sql`

**Checkpoints**:
- [ ] Bucket `moments-audio` created
- [ ] Bucket is public
- [ ] File size limit set to 10 MB
- [ ] MIME types restricted to audio formats

### Configure Storage RLS
Run: `supabase/setup/storage_bucket_setup.sql` section 3

- [ ] Policy created: "Users can upload own audio" (INSERT)
- [ ] Policy created: "Users can read own audio" (SELECT)
- [ ] Policy created: "Users can update own audio" (UPDATE)
- [ ] Policy created: "Users can delete own audio" (DELETE)

### Validate Storage Setup
Run: `supabase/validation/post_deployment_validation.sql` section 8

- [ ] Bucket exists in `storage.buckets`
- [ ] 4 RLS policies exist on `storage.objects` for `moments-audio`
- [ ] Policies reference `auth.uid()::text` correctly

---

## Step 3: Edge Function Deployment

### Verify Secrets
```bash
npx supabase secrets list
```

**Checkpoints**:
- [ ] `GEMINI_API_KEY` is set

If not set:
```bash
npx supabase secrets set GEMINI_API_KEY=<your-key>
```

### Deploy Function
```bash
npx supabase functions deploy gemini-chat
```

**Checkpoints**:
- [ ] Function deployed without errors
- [ ] Function URL returned in output
- [ ] No TypeScript compilation errors

### Verify Function Deployment
```bash
npx supabase functions list
```

- [ ] `gemini-chat` appears in list
- [ ] Status is "active" or "deployed"

---

## Step 4: Testing

### Test Edge Function - Sentiment Analysis
**Windows PowerShell**:
```powershell
.\supabase\tests\edge_function_tests.ps1
```

**Linux/Mac**:
```bash
bash supabase/tests/edge_function_tests.sh
```

**Manual Test**:
```bash
npx supabase functions invoke gemini-chat --data '{
  "action": "analyze_moment_sentiment",
  "payload": {
    "content": "Hoje foi um dia incrível!"
  }
}'
```

**Expected Response**:
```json
{
  "result": {
    "timestamp": "...",
    "sentiment": "very_positive",
    "sentimentScore": 0.8,
    "emotions": ["joy", "excitement"],
    "triggers": ["personal_growth"],
    "energyLevel": 85
  },
  "success": true
}
```

**Checkpoints**:
- [ ] Sentiment analysis returns valid response
- [ ] `sentiment` is one of: `very_positive`, `positive`, `neutral`, `negative`, `very_negative`
- [ ] `sentimentScore` is between -1 and 1
- [ ] `emotions` array contains 1-5 emotions
- [ ] `triggers` array contains 0-3 triggers
- [ ] `energyLevel` is between 0 and 100

### Test Edge Function - Weekly Summary
```bash
npx supabase functions invoke gemini-chat --data '{
  "action": "generate_weekly_summary",
  "payload": {
    "moments": [
      {
        "id": "test-1",
        "content": "Dia produtivo",
        "emotion": "happy",
        "sentiment_data": {"sentiment": "positive", "sentimentScore": 0.7},
        "tags": ["trabalho"],
        "created_at": "2025-12-01T10:00:00Z"
      }
    ]
  }
}'
```

**Expected Response**:
```json
{
  "result": {
    "emotionalTrend": "stable",
    "dominantEmotions": ["joy"],
    "keyMoments": [...],
    "insights": [...],
    "suggestedFocus": "..."
  },
  "success": true
}
```

**Checkpoints**:
- [ ] Weekly summary returns valid response
- [ ] `emotionalTrend` is one of: `ascending`, `stable`, `descending`, `volatile`
- [ ] `dominantEmotions` array contains 1-5 emotions
- [ ] `keyMoments` array contains moment objects with `id`, `preview`, `sentiment`, `created_at`
- [ ] `insights` array contains 1-5 insight strings
- [ ] `suggestedFocus` is a non-empty string

### Test Database Functions
```sql
-- Test CP level calculation
SELECT * FROM calculate_cp_level(0);    -- Expected: (1, 'Observador')
SELECT * FROM calculate_cp_level(150);  -- Expected: (2, 'Consciente')
SELECT * FROM calculate_cp_level(600);  -- Expected: (3, 'Reflexivo')
SELECT * FROM calculate_cp_level(2000); -- Expected: (4, 'Integrado')
SELECT * FROM calculate_cp_level(6000); -- Expected: (5, 'Mestre')
```

**Checkpoints**:
- [ ] All level calculations return expected results
- [ ] Function handles edge cases (negative numbers, very large numbers)

---

## Step 5: Final Validation

### Run Comprehensive Validation
Run entire file: `supabase/validation/post_deployment_validation.sql`

**Checkpoints**:
- [ ] Section 1: All 6 tables validated
- [ ] Section 2: All 4 functions validated
- [ ] Section 3: Indexes validated
- [ ] Section 4: Triggers validated
- [ ] Section 5: RLS policies validated
- [ ] Section 6: Seed data validated
- [ ] Section 7: Constraints validated
- [ ] Section 8: Storage bucket validated
- [ ] Section 9: Overall summary shows "ALL CRITICAL VALIDATIONS PASSED"

### Test End-to-End Flow (via Application)
**If frontend is ready**:

1. **Create a Moment**:
   - [ ] User can create text moment
   - [ ] User can create audio moment
   - [ ] Sentiment analysis runs automatically
   - [ ] CP points awarded (5 points)
   - [ ] Streak updated correctly

2. **View Weekly Summary**:
   - [ ] Summary generated for week with moments
   - [ ] Emotional trend calculated correctly
   - [ ] Key moments highlighted
   - [ ] Insights are relevant and empathetic

3. **Answer Daily Question**:
   - [ ] Random question displayed
   - [ ] User can submit response
   - [ ] CP points awarded (3 points)
   - [ ] Response saved to database

4. **Check CP Stats**:
   - [ ] User's total CP displayed correctly
   - [ ] Level calculated correctly
   - [ ] Streak information accurate

---

## Step 6: Monitoring Setup

### Configure Logging
- [ ] Enable Supabase Database logs (Dashboard → Database → Logs)
- [ ] Enable Edge Function logs: `npx supabase functions logs gemini-chat --follow`

### Set Up Alerts (Optional)
- [ ] Alert on Edge Function errors > 5% error rate
- [ ] Alert on database connection pool exhaustion
- [ ] Alert on RLS policy failures

### Performance Monitoring
- [ ] Check slow query log for tables with > 100 rows
- [ ] Verify indexes are being used (EXPLAIN ANALYZE)
- [ ] Monitor Edge Function latency (should be < 3s)

---

## Rollback Plan (Emergency)

### If Migration Fails
```bash
# Option 1: Reset database (WARNING: DELETES ALL DATA)
npx supabase db reset

# Option 2: Manual rollback
# Run the SQL cleanup script in deployment docs
```

### If Edge Function Fails
```bash
# Redeploy previous version
git checkout <previous-commit>
npx supabase functions deploy gemini-chat
git checkout main
```

### If Storage Fails
```sql
-- Remove policies
DROP POLICY IF EXISTS "Users can upload own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own audio" ON storage.objects;

-- Remove bucket
DELETE FROM storage.buckets WHERE name = 'moments-audio';
```

---

## Post-Deployment Tasks

### Documentation
- [ ] Update `docs/DATABASE_SCHEMA_NEW_TABLES.sql` if changes were made
- [ ] Update `docs/architecture/backend_architecture.md` with new tables
- [ ] Document any issues encountered in deployment log

### Team Communication
- [ ] Notify team of successful deployment
- [ ] Share validation results
- [ ] Schedule review meeting if needed

### User Communication (if production)
- [ ] Announce new features
- [ ] Update user documentation
- [ ] Monitor support channels for issues

---

## Success Criteria

All checkpoints must be checked before marking deployment as successful:

### Database (19 checkpoints)
- ✅ Migration applied
- ✅ 6 tables created with correct schema
- ✅ RLS enabled on all tables
- ✅ 15+ RLS policies created
- ✅ 4 functions created and tested
- ✅ 8+ indexes created
- ✅ Triggers configured
- ✅ Constraints enforced
- ✅ 10 questions seeded

### Storage (5 checkpoints)
- ✅ Bucket created
- ✅ 4 RLS policies configured
- ✅ File size limits set
- ✅ MIME types restricted

### Edge Function (6 checkpoints)
- ✅ Function deployed
- ✅ Secrets configured
- ✅ Sentiment analysis working
- ✅ Weekly summary working
- ✅ Error handling working
- ✅ Legacy chat still working

### Testing (7 checkpoints)
- ✅ All automated tests pass
- ✅ Manual sentiment test passes
- ✅ Manual weekly summary test passes
- ✅ Database function tests pass
- ✅ End-to-end flow tested (if applicable)

### Validation (1 checkpoint)
- ✅ Comprehensive validation script passes

---

## Deployment Sign-Off

**Deployed By**: _________________________
**Date**: _________________________
**Time**: _________________________
**Environment**: [ ] Development [ ] Staging [ ] Production
**Validation Status**: [ ] All Passed [ ] Some Failed (explain below)

**Notes**:
```
[Add any deployment notes, issues encountered, or deviations from checklist]
```

---

## Support & Contact

**For deployment issues**:
1. Check Supabase logs: Dashboard → Database → Logs
2. Check function logs: `npx supabase functions logs gemini-chat`
3. Review validation output
4. Consult `docs/DEPLOYMENT_INSTRUCTIONS_20251206.md`

**Rollback contacts**:
- Backend Architect Agent (this agent)
- DevOps team
- Project lead

---

**Checklist Version**: 1.0
**Last Updated**: 2025-12-06
**Migration**: 20251206_journey_redesign
