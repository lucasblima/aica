# Phase 2.4: Simplified Diagnostic

Run this simpler query to check table status:

```sql
-- Check total tables
SELECT count(*) as total_public_tables
FROM information_schema.tables
WHERE table_schema = 'public';

-- Check if required tables exist
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'moments', 'daily_questions', 'weekly_summaries', 'whatsapp_messages',
    'contact_network', 'work_items', 'podcast_episodes', 'finance_transactions',
    'ai_usage_logs', 'consciousness_points_log', 'whatsapp_conversations',
    'whatsapp_sync_logs', 'data_deletion_requests', 'ai_usage_tracking_errors'
  )
ORDER BY tablename;

-- Check for RLS policies
SELECT count(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';

-- List all public tables (to see what actually exists)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Copy this, paste in Dashboard, run it, and tell me:
1. **How many total tables?** (number)
2. **Which required tables appear in the results?** (list the ones you see)
3. **Any RLS policies?** (number)
4. **What tables are actually there?** (paste the full list from last query)
