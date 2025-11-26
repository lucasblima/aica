# Database Migration Guide

## How to Execute the Migration in Supabase

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/001_life_visualization_schema.sql`
5. Paste into the SQL editor
6. Click **Run** (or press `Ctrl+Enter`)

### Option 2: Supabase CLI (If you have it installed)
```bash
cd c:/Users/lucas/repos/Aica_frontend/Aica_frontend
supabase db push
```

## What This Migration Creates

### Tables
1. **`user_stats`**: Gamification metrics per user
   - Level, streaks, achievements
   - Total tasks completed
   - Efficiency score

2. **`task_metrics`**: Detailed metrics for each work item
   - Difficulty (1-5)
   - Estimated vs actual duration
   - Priority quadrant (Eisenhower matrix)
   - ROI score

### Additional
- Adds `birthdate` column to `users` table
- Sets up Row Level Security (RLS) policies
- Indexes for performance

## Important Notes

⚠️ **Before running**: The migration assumes `work_items` table has a `user_id` column. If it doesn't, you'll need to:
1. Add `user_id` to `work_items`, OR
2. Modify the RLS policies to fetch user_id via `associations` join

⚠️ **Optional trigger**: The automatic stats update trigger is commented out. Uncomment if you want automatic level updates.

## Verification

After running, verify with these queries:

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_stats', 'task_metrics');

-- Check if birthdate column was added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'birthdate';

-- Test insert (replace with your user_id)
INSERT INTO user_stats (user_id, total_tasks, level) 
VALUES ('your-user-uuid', 0, 'Beginner');
```

## Next Steps
After successful migration:
1. Update `supabaseService.ts` with new functions
2. Build the Life Weeks Grid component
3. Implement AICA Auto™ recommendation engine
