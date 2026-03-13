# Agent Ecosystem — Proactive AI Orchestration

**Session**: `feat-agent-ecosystem`
**Date**: 2026-03-13
**Status**: Design Approved
**Scope**: All 10 recommendations from proactivity diagnostic

## Problem Statement

AICA has 60+ Edge Functions, 9 module agents, Life Council, pattern synthesis, and multi-channel notifications — but none of these systems coordinate. Agents are 100% reactive (wait for user input). When a user completes a task, no other system knows. There is no event bus, no gamification triggers, and no proactive outreach.

The goal is to transform AICA from a collection of reactive tools into a proactive "Jarvis" that organizes context, detects opportunities, and reaches out to the user at the right time on the right channel.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Event bus pattern | Hybrid (pg_notify + event queue) | pg_notify for instant UI updates; event_queue for async processing (gamification, scoring, notifications) |
| Morning briefing | Separate Edge Function consuming Life Council | Separation of concerns: Life Council = strategic insight, morning-briefing = operational digest |
| Channel routing | Defaults by category + user override | No presence tracking complexity; intelligent defaults cover 80% of cases |
| Implementation approach | Phased Hybrid (3 phases) | Phase 1 = quick wins (zero new code), Phase 2 = core infra + vertical slice, Phase 3 = scale to all modules |

## Phase 1 — Quick Wins (Verify + Wire Existing Code)

### 1.1 Verify Cron Jobs are Active

The migration `20260206110000_setup_proactive_cron_jobs.sql` already defines all 4 cron jobs:

| Agent | Schedule (UTC) | BRT Equivalent | Cron Expression |
|-------|---------------|----------------|-----------------|
| `morning_briefing` | `0 10 * * *` | 7:00 AM São Paulo | Daily |
| `deadline_watcher` | `0 */6 * * *` | Every 6 hours | 4x/day |
| `pattern_analyzer` | `0 0 * * 1` | Monday 00:00 UTC = Sunday 21:00 BRT | Weekly |
| `session_cleanup` | `0 6 * * *` | 6:00 UTC = 3:00 AM BRT | Daily |

**Action**: Verify migration is applied on remote (`SELECT * FROM get_proactive_cron_status()`). Verify `app.settings.proactive_secret` is configured. If not applied, run `npx supabase db push`.

### 1.2 Add Life Score to AI Context

Add `lifeScore` field to `userAIContextService.ts` so Gemini knows the user's overall wellbeing when responding.

```typescript
lifeScore: {
  overall: number,        // 0-100 composite
  domains: Record<string, number>,  // per-module scores
  trend: 'improving' | 'stable' | 'declining',
  alerts: SpiralAlert[],  // correlated decline warnings
}
```

**Note**: The scoring engine is a frontend service (`scoringEngine.ts`) that calls `supabase.auth.getUser()` internally. The `DomainScoreProvider` type takes zero arguments: `() => Promise<DomainScore | null>`. The `userAIContextService` already runs client-side, so it can call `scoringEngine.computeLifeScore()` directly.

### 1.3 Verify `deadline_watcher` Connectivity

Already implemented in `proactive-trigger` — queries overdue/due-today tasks and inserts `agent_notifications`. Verify it's firing via `SELECT * FROM proactive_agent_execution_history LIMIT 5`.

**Phase 1 effort**: ~1 day. Zero new Edge Functions, verify migration + 1 service change.

## Phase 2 — Core Infrastructure + Vertical Slice

### 2.1 `module_events` Table (Event Queue)

```sql
CREATE TABLE module_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  source_module TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE module_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own events" ON module_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON module_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role bypasses RLS for event-processor Edge Function reads
-- Triggers use SECURITY DEFINER to bypass RLS for INSERT

CREATE INDEX idx_module_events_pending
  ON module_events (status, created_at)
  WHERE status = 'pending';
```

**Event types per module:**

| Module | Events |
|--------|--------|
| Atlas | `task.completed`, `task.created`, `task.overdue` |
| Journey | `moment.created`, `daily_question.answered`, `streak.updated` |
| Finance | `transaction.imported`, `budget.exceeded`, `anomaly.detected` |
| Flux | `workout.logged`, `fatigue.high`, `block.completed` |
| Connections | `contact.decaying`, `dossier.updated`, `entity.confirmed` |
| Studio | `episode.published`, `research.completed` |
| Grants | `deadline.approaching`, `proposal.submitted` |
| Agenda | `event.upcoming`, `conflict.detected` |

### 2.2 `user_channel_preferences` Table

```sql
CREATE TABLE user_channel_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  notification_category TEXT NOT NULL,
  preferred_channels TEXT[] DEFAULT ARRAY['in_app'],
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, notification_category)
);

ALTER TABLE user_channel_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences" ON user_channel_preferences
  FOR ALL USING (auth.uid() = user_id);
```

**Default channel mapping (when user has no preference):**

| Category | Default Channels |
|----------|-----------------|
| `morning_briefing` | `['telegram', 'in_app']` |
| `urgent_alert` | `['telegram', 'in_app', 'email']` |
| `insight` | `['in_app']` |
| `achievement` | `['in_app']` |
| `deadline_reminder` | `['telegram', 'in_app']` |
| `weekly_summary` | `['email', 'in_app']` |

### 2.3 Database Triggers (Event Emitters)

Triggers on module tables that insert into `module_events`:

```sql
-- Example: Atlas task completion trigger
CREATE OR REPLACE FUNCTION emit_task_completed()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO module_events (user_id, event_type, source_module, payload)
    VALUES (NEW.user_id, 'task.completed', 'atlas', jsonb_build_object(
      'task_id', NEW.id,
      'title', NEW.title,
      'priority', NEW.priority
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_completed
  AFTER UPDATE ON work_items
  FOR EACH ROW EXECUTE FUNCTION emit_task_completed();
```

Similar triggers for: `moments` (INSERT), `finance_transactions` (INSERT), `workout_blocks` (UPDATE status), `calendar_events` (INSERT).

**Important**: All trigger functions MUST use `SECURITY DEFINER` to bypass RLS when inserting into `module_events`, since the trigger runs in the user's context but needs to write to the event queue.

### 2.4 `event-processor` Edge Function

Processes the `module_events` queue every minute via pg_cron.

**Processing pipeline per event:**

1. **Gamification Handler**: Calls existing `award_user_xp(user_id, xp, source, description)` RPC (already exists in `20260120000001_award_user_xp_function.sql`). XP is persisted in `user_stats` table, history in `xp_history` table. Both tables already exist with RLS.
2. **Scoring Handler**: Inserts a `score_refresh_needed` flag into `agent_notifications` so the frontend recalculates on next app open. Domain score providers are frontend-only (`DomainScoreProvider = () => Promise<DomainScore | null>`) and cannot run server-side. The event-processor can compute simple server-side metrics (e.g., task completion count) and store them for the frontend provider to consume.
3. **Notification Handler**: Evaluates proactive trigger rules, routes via channel-router

**XP awards per event:**

| Event | XP |
|-------|-----|
| `task.completed` | 25 |
| `moment.created` | 15 |
| `workout.logged` | 20 |
| `transaction.imported` | 5 |
| `episode.published` | 50 |
| `proposal.submitted` | 40 |
| `daily_question.answered` | 10 |

**Badge conditions:**

| Badge | Condition |
|-------|-----------|
| "First Step" | First `task.completed` |
| "Journaler" | Streak >= 7 on moments |
| "Iron Will" | Streak >= 30 |
| "Financial Awareness" | 100 transactions imported |
| "Podcast Pro" | 10 episodes published |

### 2.5 `channel-router` Shared Helper

```typescript
// supabase/functions/_shared/channel-router.ts
export async function routeNotification(
  supabase: SupabaseClient,
  userId: string,
  category: NotificationCategory,
  message: NotificationMessage
): Promise<DeliveryResult[]>
```

**Logic:**
1. Query `user_channel_preferences` for user + category
2. Fall back to `CATEGORY_DEFAULTS` if no preference
3. Filter out channels during quiet hours (Telegram removed, in-app kept)
4. Dispatch to each channel: in_app → `agent_notifications` INSERT, telegram → `scheduled_notifications` INSERT, email → Resend API

### 2.6 `morning-briefing` Edge Function

**Relationship with `proactive-trigger`**: The existing `proactive-trigger` morning_briefing handler calls `run-life-council` and inserts a basic insight notification. The new `morning-briefing` Edge Function **replaces** this handler with a richer briefing that includes operational data (agenda, tasks, finance). The `proactive-trigger` cron job will be updated to call `morning-briefing` instead of `run-life-council` directly. `morning-briefing` internally calls `run-life-council` first, then aggregates operational data.

Runs daily at 7:00 AM BRT via `proactive-trigger`.

**Data collection (parallel):**
- `calendar_events` WHERE date = today → day's agenda
- `work_items` WHERE due_date <= today AND status != 'completed' → urgent/overdue tasks
- `finance_transactions` last 7 days → spending summary
- `daily_council_insights` most recent → Life Council insight
- Gamification streak status → at-risk streaks
- `contact_network` with high relationship decay → pending follow-ups

**Output format:**
```json
{
  "greeting": "Bom dia, Lucas!",
  "agenda": "Você tem 3 reuniões hoje...",
  "priorities": "2 tarefas vencidas precisam de atenção...",
  "finance": "Gastos da semana: R$450 (dentro do orçamento)...",
  "wellness": "Seu Life Score está em 72 (↑3)...",
  "actions": ["Repriorizar tarefas", "Responder João", "Registrar treino"]
}
```

**Delivery**: Via `channel-router` with category `morning_briefing`.

### 2.7 Three Domain Score Providers

**Journey** (`src/modules/journey/services/journeyScoring.ts`):
- Consistency: moments/day (normalized 0-100)
- Emotional Range: Shannon entropy of emotions
- Reflection Depth: word count + sentiment variety
- Streak Factor: consecutive days multiplier

**Studio** (`src/modules/studio/services/studioScoring.ts`):
- Production Rate: episodes published / target
- Research Quality: dossier completeness
- Consistency: publication regularity

**Grants** (`src/modules/grants/services/grantsScoring.ts`):
- Pipeline Health: active proposals / targets
- Deadline Adherence: % on-time submissions
- Success Rate: approvals / submissions

Each registers via `registerDomainProvider(domain, provider)` in `scoringEngine`. Providers follow the existing signature `() => Promise<DomainScore | null>` (no userId param — they call `supabase.auth.getUser()` internally, matching `fluxScoring.ts` pattern).

### 2.8 Cron Job for Event Processor

```sql
SELECT cron.schedule('process-module-events', '* * * * *',
  $$SELECT net.http_post(...)$$);
```

## Phase 3 — Scale to All Modules

### 3.1 Agenda AI Agent

New service: `src/modules/agenda/services/agendaAIService.ts`

**Capabilities:**
1. **Smart Scheduling**: Suggests time blocks based on user patterns
2. **Conflict Detection**: Detects and resolves calendar conflicts
3. **Preparation Reminders**: Reminds user to prepare for meetings with context (contact dossier, pending topics)

New actions in `gemini-chat`: `agenda_suggest`, `agenda_conflicts`, `agenda_prep`.

### 3.2 Proactive Conversation Triggers

Rules-based system inside `event-processor` notification handler:

```typescript
interface ProactiveTriggerRule {
  event: string;
  condition: (event: ModuleEvent) => boolean;
  agent: string;
  message: (event: ModuleEvent) => string;
  category: NotificationCategory;
  cooldown: string;  // '24h', '7d', etc.
}
```

**Initial trigger rules:**

| Event | Condition | Agent | Message | Cooldown |
|-------|-----------|-------|---------|----------|
| `task.overdue` | overdue_count >= 3 | atlas | "Você tem X tarefas vencidas. Quer repriorizar?" | 24h |
| `contact.decaying` | days >= 30 | connections | "Faz X dias sem falar com Y" | 7d |
| `fatigue.high` | fatigue_score > 80 | flux | "Fadiga alta. Considere recovery." | 48h |
| `budget.exceeded` | over_budget_pct > 10 | finance | "Gastos X% acima do orçamento" | 7d |
| `streak.updated` | streak at risk (1 day left) | journey | "Não quebre sua sequência de X dias!" | 24h |
| `deadline.approaching` | days_until <= 3 | grants | "Deadline de X em 3 dias" | 24h |

**Cooldown mechanism**: A `notification_cooldowns` table tracks last notification time per rule per user:

```sql
CREATE TABLE notification_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rule_key TEXT NOT NULL,          -- e.g., 'task.overdue:atlas'
  last_notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, rule_key)
);

ALTER TABLE notification_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cooldowns" ON notification_cooldowns
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT/UPDATE handled by event-processor Edge Function which runs with service_role (bypasses RLS)
-- No user-facing write policies needed
```

The event-processor checks `last_notified_at + cooldown_duration > now()` before sending. Upserts on notification send.

**Note**: The `notification_cooldowns` table is created in the Phase 2 migration (alongside `module_events` and `user_channel_preferences`) so the event-processor's notification handler can use cooldowns from day one. The proactive trigger rules that reference specific cooldown durations are defined in Phase 3.

### 3.3 Entity Routing → Pattern Update

When user confirms a routed entity in EntityInbox:
1. Create item in target module (existing behavior)
2. Emit `entity.confirmed` event to `module_events`
3. `event-processor` updates `user_patterns` with confirmation data

### 3.4 User Preference Learning

Add UI for managing `user_channel_preferences`:
- Settings page section for notification preferences
- Per-category channel selection
- Quiet hours configuration

## File Changes Summary

### New Files

| File | Phase | Purpose |
|------|-------|---------|
| `supabase/migrations/TIMESTAMP_module_events.sql` | 2 | module_events + user_channel_preferences + notification_cooldowns tables + DB triggers |
| `supabase/migrations/TIMESTAMP_event_processor_cron.sql` | 2 | pg_cron schedule for event-processor (every minute) |
| `supabase/functions/event-processor/index.ts` | 2 | Event queue processor (gamification, scoring, notifications) |
| `supabase/functions/morning-briefing/index.ts` | 2 | Daily operational briefing generator |
| `supabase/functions/_shared/channel-router.ts` | 2 | Notification channel routing with preference lookup |
| `src/modules/journey/services/journeyScoring.ts` | 2 | Journey domain score provider |
| `src/modules/studio/services/studioScoring.ts` | 2 | Studio domain score provider |
| `src/modules/grants/services/grantsScoring.ts` | 2 | Grants domain score provider |
| `src/modules/agenda/services/agendaAIService.ts` | 3 | Agenda AI agent (smart scheduling, conflicts, prep reminders) |

### Modified Files

| File | Phase | Change |
|------|-------|--------|
| `src/services/userAIContextService.ts` | 1 | Add lifeScore field from scoringEngine |
| `src/services/scoring/scoringEngine.ts` | 2 | Import and register 3 new domain providers |
| `supabase/functions/proactive-trigger/index.ts` | 2 | Update morning_briefing handler to delegate to morning-briefing Edge Function |
| `supabase/functions/gemini-chat/index.ts` | 3 | Add agenda_suggest, agenda_conflicts, agenda_prep actions |
| Entity confirmation handler (connections module) | 3 | Emit entity.confirmed event to module_events |

### Existing Infrastructure (No Changes Needed)

| Component | Location | Status |
|-----------|----------|--------|
| Cron jobs for proactive-trigger | `20260206110000_setup_proactive_cron_jobs.sql` | Verify applied on remote |
| `award_user_xp()` RPC | `20260120000001_award_user_xp_function.sql` | Already exists with `user_stats` + `xp_history` |
| `agent_notifications` table | Existing | Used by event-processor for in-app delivery |
| `scheduled_notifications` table | Existing | Used by channel-router for Telegram/email delivery |
| Resend API (email) | Existing Edge Functions | Requires `RESEND_API_KEY` in Supabase Secrets |

### Type Notes

- `module_events.source_module` is `TEXT`, not typed as `AicaDomain` — this allows `'agenda'` which is not a scoring domain
- `DomainScoreProvider = () => Promise<DomainScore | null>` — no userId parameter; providers get user from `supabase.auth.getUser()` internally

## Testing Strategy

### Unit Tests
- Domain score providers: verify score calculation with mock data
- Channel router: verify default fallback, quiet hours, preference override
- Event handler: verify XP awards, badge conditions, trigger rule evaluation

### Integration Tests
- Event pipeline: INSERT into work_items → trigger fires → module_events has row → event-processor awards XP
- Morning briefing: verify data collection from all modules, Gemini call, channel delivery
- Proactive triggers: verify cooldown mechanism, notification creation

### E2E Tests
- Complete flow: complete task → receive achievement notification in-app
- Morning briefing: verify Telegram delivery with correct content

## Success Criteria

1. Users receive morning briefing daily at 7 AM BRT
2. Completing tasks/logging moments awards XP visible in gamification UI
3. Life Score computed from all 7 domains (currently 4/7)
4. Overdue tasks trigger proactive Atlas agent notification
5. Channel preferences respected (Telegram vs in-app vs email)
6. Cooldown prevents notification spam
7. Gemini chat responses include Life Score context
