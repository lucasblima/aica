---
globs: supabase/migrations/**
---
# Database & Migration Rules

## Migration Checklist

Before creating any migration:
- [ ] RLS policies defined for new tables
- [ ] SECURITY DEFINER functions reviewed
- [ ] Migration tested locally (`npx supabase db push` output as evidence — `superpowers:verification-before-completion`)
- [ ] Rollback plan documented
- [ ] No PII in migration (passwords, tokens, etc.)
- [ ] Verify RPCs exist after push (not just migration status)

## Table Name Warning

- `moments` = active table (has data, used by services)
- `moment_entries` = consolidated table (may NOT be applied on remote)
- **ALWAYS use `moments`** until consolidation is confirmed

This is the canonical source for table name decisions. architecture.md references this section.

## RLS — Non-Negotiable

Every new table MUST have RLS policies in the same migration:
```sql
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON new_table
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON new_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON new_table
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON new_table
  FOR DELETE USING (auth.uid() = user_id);
```

## RPC Template

```sql
CREATE OR REPLACE FUNCTION public.my_function(p_user_id UUID, p_param TEXT)
RETURNS TABLE (id UUID, name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name FROM my_table t
  WHERE t.user_id = p_user_id;
END;
$$;
```

## Key Tables by Module

| Module | Tables |
|--------|--------|
| Atlas | `work_items` |
| Agenda | `calendar_events` |
| Journey | `moments`, `daily_reports` |
| Grants | `grant_projects`, `grant_opportunities` |
| Connections | `connection_spaces`, `connection_members`, `contact_network`, `whatsapp_messages` |
| Studio | `podcast_shows`, `podcast_episodes` |
| Finance | `finance_transactions` |
| Flux | `athletes`, `workout_blocks`, `alerts` |

## OpenClaw Tables

- `ai_function_health` — auto-correction tracking
- `daily_council_insights` — Life Council outputs
- `user_patterns` — Living User Dossier (vector embeddings)

## Commands

```bash
npx supabase db diff        # Preview changes
npx supabase db push         # Apply migrations
npx supabase db reset --local  # Reset local DB
npx supabase migration repair  # Fix state
```

## Lesson Learned

Previous migrations were marked as applied but RPCs didn't exist (partial failure). **Always verify RPCs exist** after migration push.

## Debugging Migrations

When migrations fail unexpectedly, use `superpowers:systematic-debugging`:
1. Read error messages completely (Phase 1)
2. Check recent changes with `git diff` (Phase 1)
3. Form hypothesis and test minimally (Phase 3)
4. Never blindly retry — find root cause first
