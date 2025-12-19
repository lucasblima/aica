# Quick Start - Journey Redesign Deployment

**For experienced DevOps/Backend engineers who need to deploy FAST.**

---

## Prerequisites (2 minutes)

```bash
# 1. Verify Supabase CLI
npx supabase --version

# 2. Login to Supabase
npx supabase login

# 3. Link project
npx supabase link --project-ref <your-project-ref>

# 4. Have Gemini API key ready
```

---

## Deployment (5 minutes)

### Step 1: Apply Migration
```bash
cd C:\Users\lucas\repos\Aica_frontend\Aica_frontend
npx supabase db push
```

**Expected**: "Migration 20251206_journey_redesign.sql applied successfully"

### Step 2: Create Storage Bucket

**Via Dashboard** (30 seconds):
1. Go to Supabase Dashboard → Storage → New Bucket
2. Name: `moments-audio`
3. Public: ✅ Yes
4. Create

**Via SQL** (faster):
```sql
-- Copy/paste from: supabase/setup/storage_bucket_setup.sql
```

### Step 3: Set Secrets (if not already set)
```bash
# Check if exists
npx supabase secrets list | grep GEMINI_API_KEY

# If missing, set it
npx supabase secrets set GEMINI_API_KEY=<your-key>
```

### Step 4: Deploy Edge Function
```bash
npx supabase functions deploy gemini-chat
```

**Expected**: Function URL returned in output

---

## Validation (3 minutes)

### Quick Test - Edge Function
```bash
# Test sentiment analysis
npx supabase functions invoke gemini-chat --data '{
  "action": "analyze_moment_sentiment",
  "payload": {"content": "Hoje foi incrível!"}
}'
```

**Expected**: Response with `"success": true` and sentiment data

### Quick Test - Database
```sql
-- Test CP level calculation
SELECT * FROM calculate_cp_level(150);
-- Expected: (2, 'Consciente')

-- Check tables created
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('moments', 'weekly_summaries', 'daily_questions');
-- Expected: 3 (or 6 if you check all tables)
```

---

## Full Validation (Optional - 5 minutes)

```bash
# Run comprehensive validation
psql -h <db-host> -U postgres -d postgres -f supabase/validation/post_deployment_validation.sql

# OR run test suite
.\supabase\tests\edge_function_tests.ps1  # Windows
bash supabase/tests/edge_function_tests.sh # Linux/Mac
```

---

## Verification Checklist

Minimum checks before marking as DONE:

- [ ] Migration applied (no errors)
- [ ] Bucket `moments-audio` created
- [ ] Edge Function deployed
- [ ] Sentiment analysis test passes
- [ ] CP function test returns correct level

---

## If Something Breaks

### Migration Failed
```bash
# Check logs
npx supabase db lint

# Rollback (CAUTION: Deletes data)
npx supabase db reset
```

### Edge Function Failed
```bash
# Check logs
npx supabase functions logs gemini-chat

# Redeploy
npx supabase functions deploy gemini-chat --no-verify-jwt
```

### Need Help
See detailed docs:
- `docs/DEPLOYMENT_INSTRUCTIONS_20251206.md` - Full guide
- `DEPLOYMENT_CHECKLIST.md` - Complete checklist
- `DEPLOYMENT_SUMMARY.md` - Architecture overview

---

## What Got Deployed

**Database**:
- 6 tables (moments, weekly_summaries, daily_questions, etc)
- 4 functions (CP calculation, point awarding, streak tracking)
- 15+ RLS policies
- 10 seeded questions

**Storage**:
- 1 bucket (moments-audio)
- 4 RLS policies

**Edge Function**:
- 2 new actions (sentiment analysis, weekly summary)
- Backward compatible with existing finance chat

---

## Next Steps

1. Update frontend to use new tables/functions
2. Monitor Edge Function logs: `npx supabase functions logs gemini-chat --follow`
3. Check database performance: Dashboard → Database → Query Performance

---

**Total Time**: ~10 minutes
**Difficulty**: Easy
**Risk**: Low (no breaking changes)

**Questions?** Check `DEPLOYMENT_SUMMARY.md` for full details.
