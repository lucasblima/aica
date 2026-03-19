# Design: Agentes Autônomos AICA — Progressive Migration

**Data**: 2026-03-09
**Status**: Aprovado
**Sessão**: sprint-agentes-autonomos
**Abordagem**: Progressive Migration (Edge Functions → ADK Hybrid → ADK Primary)

---

## Roadmap Faseado

### Fase 1 — Este Sprint (Edge Functions)

| Frente | Entregável | Owner |
|--------|-----------|-------|
| A: Life Council | `run-life-council` Edge Function + `daily_council_insights` table + `DailyInsightCard` UI | Backend 1 |
| B: Agentes Proativos | `morning_briefing`, `deadline_watcher`, `pattern_analyzer` lógica real + `agent_notifications` table + `AgentNotificationBell` | Backend 1 + Frontend |
| C: Agent Orchestra | `plan-and-execute` Edge Function + `execution_plans` tables + trust-level-aware execution | Backend 2 |
| D: Chat Unificado | `UnifiedAgentChat` componente + trust level integration + notification feed | Frontend |

### Fase 2 — Sprint Futuro (ADK Hybrid)

- Migrar `pattern_analyzer` para ADK (loops longos, embeddings)
- Migrar `plan-and-execute` para ADK (execução multi-step com estado)
- ADK health monitoring dashboard

### Fase 3 — Futuro (ADK Primary)

- Todos agentes proativos no ADK
- Edge Functions como thin proxy
- Agent-to-agent communication

---

## Frente A: Life Council (Conselho de Vida)

### Arquitetura

```
Edge Function: run-life-council
├── Data Collector (SQL: moments, work_items, daily_reports — last 24h)
├── Fan-out paralelo (3x Promise.all com Gemini Flash via callAI):
│   ├── Filósofo  → {pattern, triggers, misalignment, reflection}
│   ├── Estrategista → {completionRate, quadrantFocus, bottlenecks, tacticalAdvice}
│   └── Bio-Hacker → {sleepEstimate, activityDistribution, overworkSignals, routineAdvice}
├── Fan-in síntese (Gemini Pro via callAI) → {overallStatus, headline, synthesis, actions}
└── Save to daily_council_insights + withHealthTracking
```

### Database

Table `daily_council_insights` — as specified in OpenClaw doc (see OPENCLAW_ADAPTATION.md §1.5).
- RLS: users SELECT own, service role INSERT

### Frontend

- Hook: `useLifeCouncil` — fetch today's insight + realtime subscription
- Component: `DailyInsightCard` — displays in Journey dashboard
- Trigger: manual button + cron (06:00 BRT)

### Cost: ~$0.021/day/user

---

## Frente B: Agentes Proativos

### Edge Functions (real logic replacing fallback stubs)

**morning_briefing** (07:00 BRT daily):
1. Call `run-life-council` → generate Daily Insight
2. Query `work_items` WHERE due_date = today
3. Generate notification payload
4. Insert into `agent_notifications`

**deadline_watcher** (every 6h):
1. Query `work_items` WHERE due_date <= NOW() + 24h AND status != 'completed'
2. Prioritize: overdue > today > tomorrow
3. Generate alert with action suggestion
4. Insert into `agent_notifications`

**pattern_analyzer** (Sundays 21:00 BRT):
1. Fetch `daily_council_insights` from the week
2. Fetch current `user_patterns`
3. Call Gemini Pro to compare & synthesize
4. UPSERT `user_patterns` (confidence +/- delta)
5. Notify if new pattern detected

**session_cleanup** (03:00 daily) — already works via RPC ✅

### Database

**New table: `agent_notifications`**
```sql
CREATE TABLE agent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('insight', 'deadline', 'pattern', 'action', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_notif_user ON agent_notifications(user_id, created_at DESC);
CREATE INDEX idx_agent_notif_unread ON agent_notifications(user_id) WHERE read_at IS NULL;
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON agent_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON agent_notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role inserts" ON agent_notifications
  FOR INSERT WITH CHECK (true);
```

**Table: `user_patterns`** — as specified in OpenClaw doc (see OPENCLAW_ADAPTATION.md §2.2).

### Frontend

- Hook: `useAgentNotifications` — fetch unread + mark as read + realtime
- Component: `AgentNotificationBell` — bell icon in header with badge count
- Component: `NotificationDropdown` — list of recent notifications

---

## Frente C: Agent Orchestra

### Edge Function: plan-and-execute

**Actions:**

1. `create_plan`: Goal → Gemini Pro decomposes into ordered steps with module + action + dependencies → saves to `execution_plans` + `execution_plan_steps`

2. `execute_step`: Picks next pending step (respecting dependencies) → calls corresponding Edge Function → updates step status → checks for next

3. `execute_plan`: Orchestrates full plan execution. Trust level controls:
   - `suggest_confirm`: Each step shows preview, waits for user confirmation
   - `execute_validate`: Executes step, shows result for validation
   - `jarvis`: Executes all steps automatically, shows final result

### Database

Tables `execution_plans` + `execution_plan_steps` — check if migration exists, create if not.

```sql
CREATE TABLE IF NOT EXISTS execution_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  modules_involved TEXT[] DEFAULT '{}',
  context JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_plan_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES execution_plans(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  params JSONB DEFAULT '{}',
  depends_on UUID[], -- step IDs this depends on
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS on both tables: users see own plans
ALTER TABLE execution_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_plan_steps ENABLE ROW LEVEL SECURITY;
```

### Frontend

- Hook: `useExecutionPlan` — already exists ✅, may need minor updates
- Component: `ExecutionPlanView` — step-by-step progress visualization
- Trust level integration in step execution flow

---

## Frente D: Chat Unificado + Trust Levels

### Component: UnifiedAgentChat

Replaces/consolidates `ModuleAgentChat` with:

1. **Context-aware input bar** with module suggestions
2. **Trust level indicator** (badge showing current level)
3. **Automatic routing** via coordinator agent (intent → module)
4. **Trust-level-aware action buttons**:
   - `suggest_confirm`: Preview → Confirm
   - `execute_validate`: Execute → Validate
   - `jarvis`: Auto-execute, show result only
5. **Notification feed** integrated from `agent_notifications`

### Hook: useUnifiedChat

Combines:
- `useModuleAgent` (chat state)
- Trust level from `calculateTrustLevel()`
- Agent notifications from `useAgentNotifications`
- Real-time message updates

### Trust Level Display

- New users see a progress bar toward next level
- Action buttons change based on trust level
- Jarvis mode shows a distinct UI treatment (ambient mode)

---

## Agent Team Distribution

```
Lead (Coordinator): Manages roadmap, resolves conflicts, syncs
├── Teammate 1 (Backend-Agents): Life Council + Proactive Agent logic
│   Owns: supabase/functions/run-life-council/, proactive-trigger updates
│   Blocked by: Database teammate (migrations first)
│
├── Teammate 2 (Backend-Orchestra): Agent Orchestra + Plan-and-Execute
│   Owns: supabase/functions/plan-and-execute/
│   Blocked by: Database teammate (execution_plans migration)
│
├── Teammate 3 (Frontend): UnifiedAgentChat + Trust Levels + Notifications
│   Owns: src/components/features/UnifiedAgentChat/, hooks
│   Blocked by: Database teammate (agent_notifications migration)
│
└── Teammate 4 (Database): All migrations + RPCs + integration tests
    Owns: supabase/migrations/, RPC functions
    Blocks: All other teammates (must complete first)
```

---

## Cost Estimates

| Component | Per User/Day | Per User/Month |
|-----------|-------------|----------------|
| Life Council (3x Flash + 1x Pro) | $0.021 | $0.63 |
| Deadline Watcher (4x Flash) | $0.002 | $0.06 |
| Pattern Analyzer (1x Pro/week) | $0.003 | $0.08 |
| Morning Briefing (reuses Council) | $0.00 | $0.00 |
| Plan-and-Execute (avg 1x Pro) | $0.02 | $0.60 |
| **Total** | **~$0.046** | **~$1.37** |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Edge Function 30s timeout | Fan-out paralelo + Flash (< 3s each) |
| No data for Council | Require min 3 moments + 1 task in 24h |
| Pattern false positives | confidence_score + min 3 observations |
| pg_cron unavailable | External cron (cron-job.org) as fallback |
| ADK backend not ready | Edge Functions handle 100% of Phase 1 |
| Trust level gaming | Based on real engagement data, not self-reported |

---

## References

- `docs/OPENCLAW_ADAPTATION.md` — Original spec for Life Council, Dossier, Model Router, Auto-Correction
- `supabase/functions/_shared/model-router.ts` — callAI() utility (already implemented)
- `supabase/functions/_shared/health-tracker.ts` — withHealthTracking() (already implemented)
- `src/lib/agents/` — Agent registry, trust levels, prompts (already implemented)
- `src/hooks/useExecutionPlan.ts` — Execution plan hook (already implemented)
