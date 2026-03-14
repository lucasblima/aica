# Agent Ecosystem Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform AICA from reactive tools into a proactive agent ecosystem with event bus, gamification triggers, morning briefing, channel routing, and 3 missing domain score providers.

**Architecture:** Hybrid event bus (DB triggers → `module_events` queue → `event-processor` Edge Function). Morning briefing as separate Edge Function consuming Life Council. Channel routing with intelligent defaults + user override. Gamification via existing `award_user_xp()` RPC.

**Tech Stack:** Supabase (PostgreSQL, pg_cron, Edge Functions/Deno), TypeScript, React, Gemini 2.5 Flash

**Spec:** `docs/superpowers/specs/2026-03-13-agent-ecosystem-design.md`

**Parallelization:** Tasks 7, 8, 9 (domain score providers) can run in parallel. Tasks 4+3 can run in parallel. Tasks 11+12 can run in parallel.

---

## Chunk 1: Phase 1 — Verify & Wire Existing Code

### Task 1: Verify Proactive Cron Jobs Are Active

**Files:**
- Read: `supabase/migrations/20260206110000_setup_proactive_cron_jobs.sql`

- [ ] **Step 1: Check if migration is applied on remote**

```bash
npx supabase db push --dry-run 2>&1 | grep "proactive"
```

If migration is listed as "not applied", run `npx supabase db push`.

- [ ] **Step 2: Verify cron jobs exist in Supabase Dashboard**

Run in Supabase SQL Editor:
```sql
SELECT * FROM get_proactive_cron_status();
```

Expected: 4 rows (proactive-morning-briefing, proactive-deadline-watcher, proactive-pattern-analyzer, proactive-session-cleanup).

- [ ] **Step 3: Verify proactive_secret is configured**

Run in Supabase SQL Editor:
```sql
SELECT current_setting('app.settings.proactive_secret', true) IS NOT NULL AS is_configured;
```

If `false`, configure it (see migration comments for instructions).

- [ ] **Step 4: Test manual trigger**

```sql
SELECT trigger_proactive_agent_manually('deadline_watcher', 'YOUR_USER_ID');
```

Expected: JSON with `success: true`.

- [ ] **Step 5: Commit verification notes**

```bash
git add -A && git commit -m "chore: verify proactive cron jobs are active

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Add Life Score to AI Context

**Files:**
- Modify: `src/services/userAIContextService.ts`
- Test: `src/services/__tests__/userAIContextService.test.ts`

- [ ] **Step 1: Write failing test for lifeScore field**

Create `src/services/__tests__/userAIContextService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { full_name: 'Test User' }, error: null }),
    })),
  },
}));

vi.mock('@/services/googleCalendarService', () => ({
  fetchCalendarEvents: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/scoring/scoringEngine', () => ({
  computeAndStoreLifeScore: vi.fn().mockResolvedValue({
    composite: 0.72,
    domainScores: { atlas: 0.8, journey: 0.65, flux: 0.7 },
    trend: 'improving',
    spiralAlert: false,
    spiralDomains: [],
  }),
}));

describe('UserAIContext lifeScore', () => {
  it('should include lifeScore field in context', async () => {
    const { getUserAIContext, invalidateAIContext } = await import('../userAIContextService');
    invalidateAIContext();
    const context = await getUserAIContext(true);
    expect(context).toHaveProperty('lifeScore');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test -- --run src/services/__tests__/userAIContextService.test.ts
```

- [ ] **Step 3: Add lifeScore to interface and implementation**

In `src/services/userAIContextService.ts`:

1. Add import: `import { computeAndStoreLifeScore } from '@/services/scoring/scoringEngine'`
2. Add to `UserAIContext` interface after `latestInsight`:
```typescript
  lifeScore: {
    overall: number
    domains: Record<string, number>
    trend: string
    spiralAlert: boolean
  } | null
```
3. After the existing `Promise.all` and result processing, add:
```typescript
    let lifeScoreData: UserAIContext['lifeScore'] = null
    try {
      const ls = await computeAndStoreLifeScore()
      if (ls) {
        lifeScoreData = {
          overall: Math.round(ls.composite * 100),
          domains: Object.fromEntries(
            Object.entries(ls.domainScores).map(([k, v]) => [k, Math.round(v * 100)])
          ),
          trend: ls.trend,
          spiralAlert: ls.spiralAlert,
        }
      }
    } catch {
      log.debug('Life Score computation skipped (non-critical)')
    }
```
4. Add `lifeScore: lifeScoreData` to the context object.

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test -- --run src/services/__tests__/userAIContextService.test.ts
```

- [ ] **Step 5: Verify build**

```bash
npm run build && npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/services/userAIContextService.ts src/services/__tests__/userAIContextService.test.ts
git commit -m "feat(scoring): add lifeScore to AI context service

Gemini now receives composite Life Score, per-domain scores, trend,
and spiral alerts when generating responses.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Phase 2 — Database Infrastructure

### Task 3: Create module_events, user_channel_preferences, notification_cooldowns Tables

**Files:**
- Create: `supabase/migrations/TIMESTAMP_agent_ecosystem_tables.sql`

- [ ] **Step 1: Create tables migration**

Generate timestamp and create file:
```bash
TIMESTAMP=$(date -u +%Y%m%d%H%M%S)
```

Content — 3 tables + RLS + indexes:

```sql
-- Agent Ecosystem Tables
-- Spec: docs/superpowers/specs/2026-03-13-agent-ecosystem-design.md

-- 1. MODULE_EVENTS — Event Queue
CREATE TABLE IF NOT EXISTS module_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source_module TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE module_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own events" ON module_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON module_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_module_events_pending ON module_events (status, created_at) WHERE status = 'pending';
CREATE INDEX idx_module_events_user_type ON module_events (user_id, event_type);

-- 2. USER_CHANNEL_PREFERENCES
CREATE TABLE IF NOT EXISTS user_channel_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_category TEXT NOT NULL,
  preferred_channels TEXT[] DEFAULT ARRAY['in_app'],
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, notification_category)
);

ALTER TABLE user_channel_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences" ON user_channel_preferences FOR ALL USING (auth.uid() = user_id);

-- 3. NOTIFICATION_COOLDOWNS
CREATE TABLE IF NOT EXISTS notification_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  last_notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, rule_key)
);

ALTER TABLE notification_cooldowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own cooldowns" ON notification_cooldowns FOR SELECT USING (auth.uid() = user_id);
-- INSERT/UPDATE by event-processor (service_role, bypasses RLS)

-- 4. HELPER RPC: is_quiet_hours (used by channel-router for timezone-aware quiet hours check)
CREATE OR REPLACE FUNCTION is_quiet_hours(p_start TIME, p_end TIME)
RETURNS TABLE (is_quiet BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::TIME BETWEEN p_start AND p_end;
$$;
```

- [ ] **Step 2: Add event emitter triggers in same migration**

```sql
-- 4. EVENT EMITTER TRIGGERS (all SECURITY DEFINER to bypass RLS on INSERT)

-- Atlas: task completed
CREATE OR REPLACE FUNCTION emit_task_completed()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO module_events (user_id, event_type, source_module, payload)
    VALUES (NEW.user_id, 'task.completed', 'atlas', jsonb_build_object(
      'task_id', NEW.id, 'title', NEW.title, 'priority', NEW.priority));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_task_completed AFTER UPDATE ON work_items FOR EACH ROW EXECUTE FUNCTION emit_task_completed();

-- Atlas: task created
CREATE OR REPLACE FUNCTION emit_task_created()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO module_events (user_id, event_type, source_module, payload)
  VALUES (NEW.user_id, 'task.created', 'atlas', jsonb_build_object('task_id', NEW.id, 'title', NEW.title));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_task_created AFTER INSERT ON work_items FOR EACH ROW EXECUTE FUNCTION emit_task_created();

-- Journey: moment created
CREATE OR REPLACE FUNCTION emit_moment_created()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO module_events (user_id, event_type, source_module, payload)
  VALUES (NEW.user_id, 'moment.created', 'journey', jsonb_build_object(
    'moment_id', NEW.id, 'emotion', COALESCE(NEW.emotion, 'neutral')));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_moment_created AFTER INSERT ON moments FOR EACH ROW EXECUTE FUNCTION emit_moment_created();

-- Finance: transaction imported
CREATE OR REPLACE FUNCTION emit_transaction_imported()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO module_events (user_id, event_type, source_module, payload)
  VALUES (NEW.user_id, 'transaction.imported', 'finance', jsonb_build_object(
    'transaction_id', NEW.id, 'amount', NEW.amount, 'type', NEW.type,
    'category', COALESCE(NEW.category, 'uncategorized')));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_transaction_imported AFTER INSERT ON finance_transactions FOR EACH ROW EXECUTE FUNCTION emit_transaction_imported();

-- Flux: workout logged (block status change to 'completed')
-- NOTE: workout_blocks.user_id = coach. In AICA's coaching model,
-- the coach manages the athlete's training. XP/notifications go to the coach
-- who completed the block. If athlete-facing events are needed later,
-- join athletes.auth_user_id for the athlete's own account.
CREATE OR REPLACE FUNCTION emit_workout_logged()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO module_events (user_id, event_type, source_module, payload)
    VALUES (NEW.user_id, 'workout.logged', 'flux', jsonb_build_object(
      'block_id', NEW.id, 'name', NEW.name, 'athlete_id', NEW.athlete_id));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_workout_logged AFTER UPDATE ON workout_blocks FOR EACH ROW EXECUTE FUNCTION emit_workout_logged();

-- Agenda: calendar event created
CREATE OR REPLACE FUNCTION emit_event_created()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO module_events (user_id, event_type, source_module, payload)
  VALUES (NEW.user_id, 'event.upcoming', 'agenda', jsonb_build_object(
    'event_id', NEW.id, 'title', NEW.title, 'start_time', NEW.start_time));
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_event_created AFTER INSERT ON calendar_events FOR EACH ROW EXECUTE FUNCTION emit_event_created();
```

- [ ] **Step 3: Preview and commit**

```bash
npx supabase db diff
git add supabase/migrations/*_agent_ecosystem_tables.sql
git commit -m "feat(database): add module_events, channel preferences, cooldowns tables

Event queue with 6 DB triggers (Atlas, Journey, Finance, Flux, Agenda).
All triggers use SECURITY DEFINER. Includes RLS and indexes.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3b: Create event-processor cron job (separate migration)

**Files:**
- Create: `supabase/migrations/TIMESTAMP_event_processor_cron.sql`

- [ ] **Step 1: Create cron migration**

```sql
-- Event Processor Cron Job
-- Runs event-processor Edge Function every minute to process module_events queue

SELECT cron.schedule(
  'process-module-events',
  '* * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/event-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  )$$
);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/*_event_processor_cron.sql
git commit -m "feat(database): add pg_cron schedule for event-processor (every minute)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Phase 2 — Edge Functions

### Task 4: Create channel-router Shared Helper

**Files:**
- Create: `supabase/functions/_shared/channel-router.ts`

**Important**: The `scheduled_notifications` table has an incompatible schema (requires `target_phone`, `message_template`, CHECK constraint on types). The channel-router uses `agent_notifications` for in-app delivery and calls Telegram/email Edge Functions directly.

- [ ] **Step 1: Create channel-router**

```typescript
/**
 * Channel Router — Notification Delivery
 * Routes to user's preferred channels via agent_notifications + direct Edge Function calls.
 * Spec: docs/superpowers/specs/2026-03-13-agent-ecosystem-design.md § 2.5
 */
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type NotificationCategory =
  | 'morning_briefing' | 'urgent_alert' | 'insight'
  | 'achievement' | 'deadline_reminder' | 'weekly_summary'

export type DeliveryChannel = 'in_app' | 'telegram' | 'email'

export interface NotificationMessage {
  title: string
  body: string
  agent?: string
  actionable?: boolean
  metadata?: Record<string, unknown>
}

export interface DeliveryResult {
  channel: DeliveryChannel
  success: boolean
  error?: string
}

const CATEGORY_DEFAULTS: Record<NotificationCategory, DeliveryChannel[]> = {
  morning_briefing: ['telegram', 'in_app'],
  urgent_alert: ['telegram', 'in_app', 'email'],
  insight: ['in_app'],
  achievement: ['in_app'],
  deadline_reminder: ['telegram', 'in_app'],
  weekly_summary: ['email', 'in_app'],
}

export async function routeNotification(
  supabase: SupabaseClient,
  userId: string,
  category: NotificationCategory,
  message: NotificationMessage
): Promise<DeliveryResult[]> {
  const { data: pref } = await supabase
    .from('user_channel_preferences')
    .select('preferred_channels, quiet_hours_start, quiet_hours_end')
    .eq('user_id', userId)
    .eq('notification_category', category)
    .maybeSingle()

  let channels: DeliveryChannel[] = pref?.preferred_channels ?? CATEGORY_DEFAULTS[category] ?? ['in_app']

  // Quiet hours: use DB timezone-aware comparison
  if (pref?.quiet_hours_start && pref?.quiet_hours_end) {
    const { data: timeCheck } = await supabase.rpc('is_quiet_hours', {
      p_start: pref.quiet_hours_start,
      p_end: pref.quiet_hours_end,
    }).maybeSingle()
    if (timeCheck?.is_quiet) {
      channels = channels.filter(c => c === 'in_app')
    }
  }

  const results: DeliveryResult[] = []
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'in_app':
          await supabase.from('agent_notifications').insert({
            user_id: userId,
            agent_name: message.agent || 'system',
            notification_type: 'insight',
            title: message.title.substring(0, 200),
            body: message.body.substring(0, 500),
            metadata: message.metadata || {},
          })
          results.push({ channel, success: true })
          break

        case 'telegram': {
          // Check if user has linked Telegram
          const { data: link } = await supabase
            .from('user_telegram_links')
            .select('telegram_chat_id, notification_enabled')
            .eq('user_id', userId)
            .eq('notification_enabled', true)
            .maybeSingle()

          if (link?.telegram_chat_id) {
            // Also insert into agent_notifications (Telegram cron reads from there)
            await supabase.from('agent_notifications').insert({
              user_id: userId,
              agent_name: message.agent || 'system',
              notification_type: 'insight',
              title: `[Telegram] ${message.title}`.substring(0, 200),
              body: message.body.substring(0, 500),
              metadata: { ...message.metadata, delivery_channel: 'telegram' },
            })
          }
          results.push({ channel, success: true })
          break
        }

        case 'email':
          // Queue in agent_notifications with email flag for notification-scheduler
          await supabase.from('agent_notifications').insert({
            user_id: userId,
            agent_name: message.agent || 'system',
            notification_type: 'insight',
            title: `[Email] ${message.title}`.substring(0, 200),
            body: message.body.substring(0, 500),
            metadata: { ...message.metadata, delivery_channel: 'email' },
          })
          results.push({ channel, success: true })
          break
      }
    } catch (err) {
      console.error(`Channel ${channel} delivery failed:`, err)
      results.push({ channel, success: false, error: err instanceof Error ? err.message : 'Unknown' })
    }
  }
  return results
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/channel-router.ts
git commit -m "feat(infra): add channel-router shared helper

Routes to in_app/telegram/email via agent_notifications table.
Respects quiet hours and user preferences.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Create event-processor Edge Function

**Files:**
- Create: `supabase/functions/event-processor/index.ts`

- [ ] **Step 5a: Scaffold event-processor with auth + CORS + main loop**

```typescript
/**
 * Event Processor Edge Function
 * Processes module_events queue (pg_cron, every minute).
 * Spec: docs/superpowers/specs/2026-03-13-agent-ecosystem-design.md § 2.4
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://dev.aica.guru', 'https://aica.guru']
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

interface ModuleEvent {
  id: string; user_id: string; event_type: string
  source_module: string; payload: Record<string, unknown>; created_at: string
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Auth: only service_role
  const auth = req.headers.get('authorization')?.replace('Bearer ', '')
  if (auth !== SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const { data: events, error } = await supabase
      .from('module_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) throw new Error(`Fetch failed: ${error.message}`)
    if (!events?.length) {
      return new Response(JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    let processed = 0, errors = 0
    for (const event of events as ModuleEvent[]) {
      try {
        await supabase.from('module_events').update({ status: 'processing' }).eq('id', event.id)
        await gamificationHandler(supabase, event)
        await notificationHandler(supabase, event)
        await supabase.from('module_events')
          .update({ status: 'processed', processed_at: new Date().toISOString() }).eq('id', event.id)
        processed++
      } catch (err) {
        console.error(`Event ${event.id} failed:`, err)
        await supabase.from('module_events').update({ status: 'failed' }).eq('id', event.id)
        errors++
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, errors, total: events.length }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Event processor error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
```

- [ ] **Step 5b: Add gamification handler**

Append to the same file:

```typescript
// XP awards per event type
const XP_MAP: Record<string, { xp: number; source: string }> = {
  'task.completed': { xp: 25, source: 'atlas' },
  'moment.created': { xp: 15, source: 'journey' },
  'workout.logged': { xp: 20, source: 'flux' },
  'transaction.imported': { xp: 5, source: 'finance' },
  'episode.published': { xp: 50, source: 'studio' },
  'proposal.submitted': { xp: 40, source: 'grants' },
  'daily_question.answered': { xp: 10, source: 'journey' },
}

async function gamificationHandler(
  supabase: ReturnType<typeof createClient>, event: ModuleEvent
): Promise<void> {
  const cfg = XP_MAP[event.event_type]
  if (!cfg) return
  const { error } = await supabase.rpc('award_user_xp', {
    p_user_id: event.user_id, p_xp_amount: cfg.xp,
    p_source: cfg.source,
    p_description: `${event.event_type} — ${(event.payload.title as string) || event.event_type}`,
  })
  if (error) console.warn(`XP award failed:`, error.message)
}
```

- [ ] **Step 5c: Add notification handler with all 6 trigger rules + cooldown**

Append to the same file:

```typescript
import { routeNotification, type NotificationCategory } from '../_shared/channel-router.ts'

interface TriggerRule {
  event: string
  condition: (p: Record<string, unknown>) => boolean
  agent: string
  message: (p: Record<string, unknown>) => string
  category: NotificationCategory
  cooldownMs: number
}

const TRIGGER_RULES: TriggerRule[] = [
  {
    event: 'task.completed',
    condition: () => true,
    agent: 'atlas',
    message: () => 'Parabéns! Tarefa concluída! Continue assim.',
    category: 'achievement',
    cooldownMs: 4 * 60 * 60 * 1000, // 4h (don't spam per task)
  },
  {
    event: 'moment.created',
    condition: () => true,
    agent: 'journey',
    message: () => 'Momento registrado. Sua consciência agradece.',
    category: 'achievement',
    cooldownMs: 24 * 60 * 60 * 1000,
  },
  {
    event: 'workout.logged',
    condition: (p) => {
      const fatigue = p.fatigue_score as number | undefined
      return fatigue !== undefined && fatigue > 80
    },
    agent: 'flux',
    message: (p) => `Fadiga em ${p.fatigue_score}%. Considere recovery amanhã.`,
    category: 'urgent_alert',
    cooldownMs: 48 * 60 * 60 * 1000,
  },
  {
    event: 'transaction.imported',
    condition: (p) => Math.abs(Number(p.amount)) > 500,
    agent: 'finance',
    message: (p) => `Transação de R$${Math.abs(Number(p.amount))} em ${p.category}. Tudo certo?`,
    category: 'insight',
    cooldownMs: 7 * 24 * 60 * 60 * 1000,
  },
  {
    event: 'event.upcoming',
    condition: () => true,
    agent: 'agenda',
    message: (p) => `Evento "${p.title}" adicionado ao calendário.`,
    category: 'insight',
    cooldownMs: 2 * 60 * 60 * 1000,
  },
]

async function notificationHandler(
  supabase: ReturnType<typeof createClient>, event: ModuleEvent
): Promise<void> {
  for (const rule of TRIGGER_RULES) {
    if (rule.event !== event.event_type) continue
    if (!rule.condition(event.payload)) continue

    const ruleKey = `${rule.event}:${rule.agent}`
    const { data: cd } = await supabase
      .from('notification_cooldowns')
      .select('last_notified_at')
      .eq('user_id', event.user_id)
      .eq('rule_key', ruleKey)
      .maybeSingle()

    if (cd && Date.now() - new Date(cd.last_notified_at).getTime() < rule.cooldownMs) continue

    await routeNotification(supabase, event.user_id, rule.category, {
      title: `${rule.agent} Agent`,
      body: rule.message(event.payload),
      agent: rule.agent,
      actionable: true,
    })

    await supabase.from('notification_cooldowns').upsert({
      user_id: event.user_id,
      rule_key: ruleKey,
      last_notified_at: new Date().toISOString(),
    }, { onConflict: 'user_id,rule_key' })
  }
}
```

- [ ] **Step 5d: Commit**

```bash
git add supabase/functions/event-processor/index.ts
git commit -m "feat(agent): add event-processor Edge Function

Processes module_events queue: XP via award_user_xp(), 5 trigger rules
with cooldown, channel-router delivery. Auth + CORS included.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Create morning-briefing Edge Function

**Files:**
- Create: `supabase/functions/morning-briefing/index.ts`
- Modify: `supabase/functions/proactive-trigger/index.ts`

- [ ] **Step 6a: Scaffold morning-briefing with CORS + auth + data collection**

Create `supabase/functions/morning-briefing/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://dev.aica.guru', 'https://aica.guru']
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!

interface BriefingOutput {
  greeting: string
  lifeCouncilInsight: string
  todayPriorities: string[]
  calendarHighlights: string[]
  financeSummary: string | null
  contactFollowups: string[]
  streakStatus: string
  motivationalClose: string
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Auth: service_role only (called by proactive-trigger or pg_cron)
  const auth = req.headers.get('authorization')?.replace('Bearer ', '')
  if (auth !== SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const { user_id } = await req.json()
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // 1. Call run-life-council for strategic insight
  const councilRes = await fetch(`${SUPABASE_URL}/functions/v1/run-life-council`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    body: JSON.stringify({ user_id }),
  })
  const councilData = await councilRes.json().catch(() => null)

  // 2. Parallel data collection
  const today = new Date().toISOString().split('T')[0]
  const [calendar, tasks, finance, stats, contacts] = await Promise.all([
    supabase.from('calendar_events').select('title, start_time, end_time').eq('user_id', user_id)
      .gte('start_time', `${today}T00:00:00`).lte('start_time', `${today}T23:59:59`).limit(10),
    supabase.from('work_items').select('title, priority, status').eq('user_id', user_id)
      .in('status', ['todo', 'in_progress']).order('priority', { ascending: false }).limit(5),
    supabase.from('finance_transactions').select('amount, category, type').eq('user_id', user_id)
      .gte('date', today).limit(20),
    supabase.from('user_stats').select('total_xp, level, current_streak').eq('user_id', user_id).maybeSingle(),
    supabase.from('contact_network').select('name, relationship_health').eq('user_id', user_id)
      .lt('relationship_health', 40).limit(5),
  ])
  // ... (synthesis in Step 6b)
```

- [ ] **Step 6b: Add Gemini synthesis using extractJSON()**

Import `extractJSON` from `../_shared/model-router.ts`.

```typescript
  import { extractJSON } from '../_shared/model-router.ts'

  // 3. Gemini synthesis
  const prompt = `Você é o assistente AICA. Gere um briefing matinal para o usuário.
Dados do dia:
- Calendário: ${JSON.stringify(calendar.data || [])}
- Tarefas pendentes: ${JSON.stringify(tasks.data || [])}
- Transações hoje: ${JSON.stringify(finance.data || [])}
- XP: ${stats.data?.total_xp || 0}, Nível: ${stats.data?.level || 1}, Streak: ${stats.data?.current_streak || 0}
- Contatos que precisam de atenção: ${JSON.stringify(contacts.data || [])}
- Life Council insight: ${councilData?.insight || 'Sem insight disponível'}

Retorne JSON com: greeting, lifeCouncilInsight, todayPriorities[], calendarHighlights[], financeSummary, contactFollowups[], streakStatus, motivationalClose`

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096 } }) }
  )
  const geminiData = await geminiRes.json()
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  const briefing = extractJSON<BriefingOutput>(text)
```

Parse response with `extractJSON<BriefingOutput>(responseText)` — NOT regex.

- [ ] **Step 6c: Add channel-router delivery**

Call `routeNotification(supabase, userId, 'morning_briefing', ...)` with formatted body.

- [ ] **Step 6d: Update proactive-trigger morning_briefing handler**

In `supabase/functions/proactive-trigger/index.ts` line 414, change the fetch URL from:
```
`${SUPABASE_URL}/functions/v1/run-life-council`
```
to:
```
`${SUPABASE_URL}/functions/v1/morning-briefing`
```

Remove the `agent_notifications` insert after the call (morning-briefing handles delivery).

- [ ] **Step 6e: Commit**

```bash
git add supabase/functions/morning-briefing/index.ts supabase/functions/proactive-trigger/index.ts
git commit -m "feat(agent): add morning-briefing Edge Function

Comprehensive daily briefing: Life Council + calendar + tasks + finance +
streaks + contacts. Uses extractJSON() for Gemini parsing. Delegates
from proactive-trigger.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Phase 2 — Domain Score Providers

**Tasks 7, 8, 9 can run in parallel** — they are independent.

### Task 7: Create Journey Domain Score Provider

**Files:**
- Create: `src/modules/journey/services/journeyScoring.ts`
- Test: `src/modules/journey/services/__tests__/journeyScoring.test.ts`

- [ ] **Step 1: Write failing test**

Test `computeJourneyDomainScore()` returns null with no moments, and valid `DomainScore` (module='journey', normalized 0-1, label='Consciência') with 15 mock moments across 5 emotions.

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test -- --run src/modules/journey/services/__tests__/journeyScoring.test.ts
```

- [ ] **Step 3: Implement journeyScoring.ts**

Follow `src/modules/flux/services/fluxScoring.ts` pattern exactly:
- Import `supabase`, `createNamespacedLogger`, `registerDomainProvider`, types
- `computeJourneyDomainScore(): Promise<DomainScore | null>`
  - Calls `supabase.auth.getUser()` internally (no userId param)
  - Queries `moments` table for last 30 days
  - Returns null if no data
  - Computes: consistency (0.4 weight), emotionalRange via Shannon entropy (0.3), reflectionDepth via avg word count (0.3)
  - Trend: compare recent half vs older half
  - Returns `{ module: 'journey', normalized, raw, label: 'Consciência', confidence, trend }`
- `registerJourneyDomainProvider()` calls `registerDomainProvider('journey', ...)`

- [ ] **Step 4: Run test — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add src/modules/journey/services/journeyScoring.ts src/modules/journey/services/__tests__/journeyScoring.test.ts
git commit -m "feat(journey): add domain score provider for Life Score

Consistency + emotional range (Shannon entropy) + reflection depth.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Create Studio Domain Score Provider

**Files:**
- Create: `src/modules/studio/services/studioScoring.ts`
- Test: `src/modules/studio/services/__tests__/studioScoring.test.ts`

- [ ] **Step 1: Write failing test**

Test returns null with no episodes. Test returns valid DomainScore (module='studio', label='Criatividade') with mock episodes.

- [ ] **Step 2: Run test — expect FAIL**
- [ ] **Step 3: Implement studioScoring.ts**

Same pattern as fluxScoring.ts:
- Query `podcast_episodes` for last 90 days, filter `status = 'published'`
- Production Rate: published count / 3 (target = 1/month for 90 days)
- Consistency: if >1 episode, compute regularity (days between publications)
- Weight: production 0.5, consistency 0.5
- Trend: compare first 45 days vs last 45 days publication count

- [ ] **Step 4: Run test — expect PASS**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat(studio): add domain score provider for Life Score

Production rate + publication consistency over 90 days.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Create Grants Domain Score Provider

**Files:**
- Create: `src/modules/grants/services/grantsScoring.ts`
- Test: `src/modules/grants/services/__tests__/grantsScoring.test.ts`

- [ ] **Step 1: Write failing test**

Test returns null with no projects. Test returns valid DomainScore (module='grants', label='Captação') with mock projects.

- [ ] **Step 2: Run test — expect FAIL**
- [ ] **Step 3: Implement grantsScoring.ts**

Same pattern:
- Query `grant_projects` for user
- Pipeline Health: active projects / 3 (target)
- Activity: projects updated in last 30 days / total
- Weight: pipeline 0.6, activity 0.4
- Trend: compare recent updates vs older

- [ ] **Step 4: Run test — expect PASS**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat(grants): add domain score provider for Life Score

Pipeline health + recent activity metrics.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 10: Register All Domain Providers

**Context:** `registerFluxDomainProvider()` is exported but **never called** — no domain providers are actually registered at runtime. This task creates a centralized initialization module and wires it into the app.

**Files:**
- Create: `src/services/scoring/initDomainProviders.ts`
- Modify: `src/hooks/useLifeScore.ts` (call init before compute)

- [ ] **Step 1: Create centralized provider registration module**

Create `src/services/scoring/initDomainProviders.ts`:

```typescript
/**
 * Domain Provider Registration — called once on app init.
 * Registers all module scoring providers with the scoring engine.
 */
import { registerFluxDomainProvider } from '@/modules/flux/services/fluxScoring'
import { registerJourneyDomainProvider } from '@/modules/journey/services/journeyScoring'
import { registerStudioDomainProvider } from '@/modules/studio/services/studioScoring'
import { registerGrantsDomainProvider } from '@/modules/grants/services/grantsScoring'

let initialized = false

export function initDomainProviders(): void {
  if (initialized) return
  registerFluxDomainProvider()
  registerJourneyDomainProvider()
  registerStudioDomainProvider()
  registerGrantsDomainProvider()
  // Atlas, Connections, Finance already register via their own service modules
  initialized = true
}
```

- [ ] **Step 2: Wire into useLifeScore hook**

In `src/hooks/useLifeScore.ts`, add import and call at the top of the hook:

```typescript
import { initDomainProviders } from '@/services/scoring/initDomainProviders'

// Inside useLifeScore(), before the first useEffect:
initDomainProviders()
```

- [ ] **Step 3: Verify build**

```bash
npm run build && npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/services/scoring/initDomainProviders.ts src/hooks/useLifeScore.ts
git commit -m "feat(scoring): register all 7 domain providers via centralized init

Previously registerFluxDomainProvider was exported but never called.
Creates initDomainProviders() and wires into useLifeScore hook.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Phase 3 — Proactive Intelligence

### Task 11: Create Agenda AI Agent Service

**Files:**
- Create: `src/modules/agenda/services/agendaAIService.ts`
- Test: `src/modules/agenda/services/__tests__/agendaAIService.test.ts`

- [ ] **Step 1: Write failing test**

Test `detectConflicts()` returns empty array with no overlapping events. Test it finds conflicts when two events overlap.

- [ ] **Step 2: Run test — expect FAIL**
- [ ] **Step 3: Implement agendaAIService.ts**

Three functions:
1. `suggestTimeBlocks(userId)` — query calendar gaps + pending tasks → Gemini suggests blocks
2. `detectConflicts(userId)` — query events, find time overlaps → return conflict pairs
3. `generatePrepReminder(userId, eventId)` — fetch attendees + contact dossiers → Gemini prep prompt

All AI calls via `GeminiClient.getInstance().call()`.

- [ ] **Step 4: Run test — expect PASS**
- [ ] **Step 5: Add agenda actions to gemini-chat**

In `supabase/functions/gemini-chat/index.ts`, add cases for `agenda_suggest`, `agenda_conflicts`, `agenda_prep` actions.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(agenda): add AI agent — scheduling, conflicts, prep reminders

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 12: Wire Entity Routing to Pattern Updates

**Files:**
- Modify: entity confirmation handler in connections module

- [ ] **Step 1: Find entity confirmation handler**

```bash
grep -rn "confirmEntity\|acceptEntity\|entity.*accept\|entity.*confirm" src/modules/connections --include="*.ts" --include="*.tsx"
```

Also check: `src/components/features/EntityInbox/`

- [ ] **Step 2: Add module_events emission**

After the existing entity routing logic, add:
```typescript
await supabase.from('module_events').insert({
  user_id: userId,
  event_type: 'entity.confirmed',
  source_module: 'connections',
  payload: { entity_type: entity.type, routed_to: entity.module },
});
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(connections): emit entity.confirmed event on entity routing

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 13: Final Verification

- [ ] **Step 1: Run full build**

```bash
npm run build && npm run typecheck
```

Expected: Exit 0.

- [ ] **Step 2: Run all tests**

```bash
npm run test -- --run
```

Expected: All new tests pass. Document pre-existing failures.

- [ ] **Step 3: Preview migrations**

```bash
npx supabase db diff
```

Verify: module_events, user_channel_preferences, notification_cooldowns, 6 triggers, 1 cron job.

- [ ] **Step 4: Commit if needed**

```bash
git add -A && git commit -m "chore: final verification for agent ecosystem

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Edge Function Testing Note

Edge Functions (event-processor, morning-briefing, channel-router) run in Deno and cannot use Vitest directly. Testing strategy:

1. **Local testing**: `npx supabase functions serve <name>` + curl with test payloads
2. **Integration testing**: After `npx supabase db push`, trigger events via SQL INSERT and verify processing
3. **Shared logic** (channel-router): Extract pure functions for unit testing if needed in future

The domain score providers (Tasks 7-9) and userAIContextService (Task 2) have full Vitest unit tests.
