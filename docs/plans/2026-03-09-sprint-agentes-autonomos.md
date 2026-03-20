# Sprint Agentes Autônomos — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the autonomous agents system by building the missing frontend (notifications, unified chat, trust levels) and wiring the proactive trigger to existing Edge Functions.

**Architecture:** Progressive Migration — all logic in Edge Functions (already 95% built), adding agent_notifications table, UnifiedAgentChat with trust levels, and proactive trigger wiring. ADK backend is a future phase.

**Tech Stack:** React 18 + TypeScript + Tailwind/Ceramic + Supabase (Edge Functions, PostgreSQL, Realtime)

---

## Existing Infrastructure (DO NOT REBUILD)

These are already fully implemented and should be reused:

| Component | Path | Status |
|-----------|------|--------|
| `run-life-council` | `supabase/functions/run-life-council/index.ts` | ✅ Complete (417 lines) |
| `plan-and-execute` | `supabase/functions/plan-and-execute/index.ts` | ✅ Complete (642 lines) |
| `synthesize-user-patterns` | `supabase/functions/synthesize-user-patterns/index.ts` | ✅ Exists |
| `proactive-trigger` | `supabase/functions/proactive-trigger/index.ts` | ✅ Gateway (needs wiring) |
| `model-router` | `supabase/functions/_shared/model-router.ts` | ✅ callAI() + extractJSON() |
| `health-tracker` | `supabase/functions/_shared/health-tracker.ts` | ✅ withHealthTracking() |
| `useLifeCouncil` | `src/hooks/useLifeCouncil.ts` | ✅ Complete |
| `LifeCouncilCard` | `src/components/features/LifeCouncilCard.tsx` | ✅ Complete |
| `useExecutionPlan` | `src/hooks/useExecutionPlan.ts` | ✅ Complete with realtime |
| `ExecutionPlanView` | `src/components/features/ExecutionPlanView/ExecutionPlanView.tsx` | ✅ Complete |
| `ModuleAgentChat` | `src/components/features/ModuleAgentChat/ModuleAgentChat.tsx` | ✅ Complete |
| `ModuleAgentFAB` | `src/components/features/ModuleAgentChat/ModuleAgentFAB.tsx` | ✅ Complete |
| Agent Registry | `src/lib/agents/index.ts` | ✅ 9 agents + coordinator |
| Trust Levels | `src/lib/agents/trustLevel.ts` | ✅ 3 tiers |
| Migration: council | `supabase/migrations/20260213000001_life_council_insights.sql` | ✅ With RPCs |
| Migration: patterns | `supabase/migrations/20260213000002_user_patterns.sql` | ✅ With RPCs |
| Migration: plans | `supabase/migrations/20260215040000_execution_plans.sql` | ✅ With RLS |

---

## Task 1: Verify Existing Infrastructure — Deploy Status

**Files:**
- Check: `supabase/migrations/` (all 3 agent migrations)
- Check: `supabase/functions/` (all agent Edge Functions)

**Step 1: Check if migrations are applied on remote**

Run:
```bash
npx supabase migration list
```
Expected: All 3 migrations (20260213000001, 20260213000002, 20260215040000) show as "applied"

**Step 2: Verify RPCs exist**

Run via Supabase MCP or dashboard:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_council_context', 'get_latest_council_insight', 'get_relevant_patterns', 'get_user_patterns_summary', 'get_weekly_synthesis_context', 'apply_pattern_update');
```
Expected: All 6 RPCs exist

**Step 3: Check Edge Function deployment status**

Run:
```bash
npx supabase functions list
```
Expected: `run-life-council`, `plan-and-execute`, `synthesize-user-patterns`, `proactive-trigger` listed

**Step 4: Deploy any missing Edge Functions**

If any are missing:
```bash
npx supabase functions deploy run-life-council --no-verify-jwt
npx supabase functions deploy plan-and-execute --no-verify-jwt
npx supabase functions deploy synthesize-user-patterns --no-verify-jwt
npx supabase functions deploy proactive-trigger --no-verify-jwt
```

**Step 5: Push any unapplied migrations**

If any migrations are not applied:
```bash
npx supabase db push
```

**Step 6: Commit verification results**

```bash
git add -A && git commit -m "chore: verify agent infrastructure deployment status"
```

---

## Task 2: Create agent_notifications Migration

**Files:**
- Create: `supabase/migrations/20260309000001_agent_notifications.sql`

**Step 1: Write the migration**

```sql
-- ============================================================================
-- Agent Notifications — Proactive Agent Output Storage
-- Sprint: Agentes Autônomos (2026-03-09)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'insight', 'deadline', 'pattern', 'action', 'system'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_notif_user_created
  ON agent_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_notif_unread
  ON agent_notifications(user_id)
  WHERE read_at IS NULL;

ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON agent_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON agent_notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role inserts notifications" ON agent_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role full access notifications" ON agent_notifications
  FOR ALL TO service_role USING (true);

-- RPC: Get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER FROM agent_notifications
  WHERE user_id = p_user_id AND read_at IS NULL;
$$;

-- RPC: Mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(p_user_id UUID, p_notification_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE agent_notifications
  SET read_at = NOW()
  WHERE user_id = p_user_id
    AND id = ANY(p_notification_ids)
    AND read_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notifications_read TO authenticated;
GRANT SELECT, UPDATE ON agent_notifications TO authenticated;
GRANT ALL ON agent_notifications TO service_role;
```

**Step 2: Apply migration**

Run:
```bash
npx supabase db push
```
Expected: Migration applied successfully

**Step 3: Verify table and RPCs exist**

Run:
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'agent_notifications';
SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('get_unread_notification_count', 'mark_notifications_read');
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260309000001_agent_notifications.sql
git commit -m "feat(agents): add agent_notifications table with RLS and RPCs"
```

---

## Task 3: Create useAgentNotifications Hook

**Files:**
- Create: `src/hooks/useAgentNotifications.ts`
- Test: `src/hooks/__tests__/useAgentNotifications.test.ts`

**Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useAgentNotifications.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ error: null }))
        }))
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
    },
  },
}))

describe('useAgentNotifications types', () => {
  it('exports expected interface', async () => {
    const mod = await import('../useAgentNotifications')
    expect(mod.useAgentNotifications).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useAgentNotifications.test.ts`
Expected: FAIL — module not found

**Step 3: Write the hook implementation**

```typescript
// src/hooks/useAgentNotifications.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/services/supabaseClient'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface AgentNotification {
  id: string
  user_id: string
  agent_name: string
  notification_type: 'insight' | 'deadline' | 'pattern' | 'action' | 'system'
  title: string
  body: string
  metadata: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export interface UseAgentNotificationsReturn {
  notifications: AgentNotification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  markAsRead: (ids: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => Promise<void>
}

export function useAgentNotifications(limit = 20): UseAgentNotificationsReturn {
  const [notifications, setNotifications] = useState<AgentNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: fetchError } = await supabase
        .from('agent_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError
      setNotifications(data || [])

      const { data: countData } = await supabase.rpc('get_unread_notification_count', {
        p_user_id: user.id,
      })
      setUnreadCount(countData || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notificações')
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  // Real-time subscription for new notifications
  useEffect(() => {
    fetchNotifications()

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channelRef.current = supabase
        .channel('agent_notifications_realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'agent_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as AgentNotification
            setNotifications(prev => [newNotif, ...prev].slice(0, limit))
            setUnreadCount(prev => prev + 1)
          }
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [fetchNotifications, limit])

  const markAsRead = useCallback(async (ids: string[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || ids.length === 0) return

    await supabase.rpc('mark_notifications_read', {
      p_user_id: user.id,
      p_notification_ids: ids,
    })

    setNotifications(prev =>
      prev.map(n => ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - ids.length))
  }, [])

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id)
    if (unreadIds.length > 0) await markAsRead(unreadIds)
  }, [notifications, markAsRead])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useAgentNotifications.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useAgentNotifications.ts src/hooks/__tests__/useAgentNotifications.test.ts
git commit -m "feat(agents): add useAgentNotifications hook with realtime"
```

---

## Task 4: Create AgentNotificationBell Component

**Files:**
- Create: `src/components/features/AgentNotificationBell.tsx`
- Modify: `src/components/layout/HeaderGlobal.tsx` (or equivalent header)

**Step 1: Write the notification bell component**

```typescript
// src/components/features/AgentNotificationBell.tsx
import { useState, useRef, useEffect } from 'react'
import { Bell, X, Check, CheckCheck } from 'lucide-react'
import { useAgentNotifications, type AgentNotification } from '@/hooks/useAgentNotifications'

const AGENT_ICONS: Record<string, string> = {
  morning_briefing: '🌅',
  deadline_watcher: '⏰',
  pattern_analyzer: '🔍',
  life_council: '🧠',
  session_cleanup: '🧹',
}

const TYPE_COLORS: Record<string, string> = {
  insight: 'bg-ceramic-info/10 text-ceramic-info',
  deadline: 'bg-ceramic-warning/10 text-ceramic-warning',
  pattern: 'bg-ceramic-success/10 text-ceramic-success',
  action: 'bg-amber-100 text-amber-700',
  system: 'bg-ceramic-cool text-ceramic-text-secondary',
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: AgentNotification
  onMarkRead: (id: string) => void
}) {
  const isUnread = !notification.read_at
  const timeAgo = getRelativeTime(notification.created_at)

  return (
    <div
      className={`px-4 py-3 border-b border-ceramic-border last:border-0 ${
        isUnread ? 'bg-amber-50/50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">
          {AGENT_ICONS[notification.agent_name] || '🤖'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              TYPE_COLORS[notification.notification_type] || TYPE_COLORS.system
            }`}>
              {notification.notification_type}
            </span>
            <span className="text-xs text-ceramic-text-secondary">{timeAgo}</span>
          </div>
          <p className="text-sm font-medium text-ceramic-text-primary mt-1">
            {notification.title}
          </p>
          <p className="text-xs text-ceramic-text-secondary mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        </div>
        {isUnread && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="p-1 text-ceramic-text-secondary hover:text-ceramic-success transition-colors"
            title="Marcar como lida"
          >
            <Check size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d`
}

export function AgentNotificationBell() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useAgentNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-ceramic-error text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-ceramic-base rounded-xl shadow-ceramic-emboss border border-ceramic-border z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ceramic-border">
            <h3 className="text-sm font-medium text-ceramic-text-primary">Notificações</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-ceramic-info hover:underline flex items-center gap-1"
                >
                  <CheckCheck size={12} /> Ler todas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-ceramic-text-secondary hover:text-ceramic-text-primary"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-ceramic-text-secondary">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ceramic-text-secondary">
                Nenhuma notificação ainda
              </div>
            ) : (
              notifications.map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={(id) => markAsRead([id])}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Integrate into header**

Read the header component first, then add `<AgentNotificationBell />` next to existing header actions.

**Step 3: Run build to verify**

Run: `npm run build && npm run typecheck`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/components/features/AgentNotificationBell.tsx
git commit -m "feat(agents): add AgentNotificationBell with dropdown and realtime"
```

---

## Task 5: Wire Proactive Trigger to Real Logic

**Files:**
- Modify: `supabase/functions/proactive-trigger/index.ts`

**Step 1: Read current proactive-trigger implementation**

Reference: `supabase/functions/proactive-trigger/index.ts` (already read — lines 337-401 are the fallback logic)

**Step 2: Replace fallback logic with direct Edge Function calls**

Update `executeAgentLocally()` to:
- `morning_briefing` → invoke `run-life-council` + insert `agent_notification`
- `deadline_watcher` → query `work_items` for overdue/due-today + insert `agent_notification`
- `pattern_analyzer` → invoke `synthesize-user-patterns`

Key implementation pattern:
```typescript
case 'morning_briefing': {
  // Call run-life-council directly
  const councilResponse = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/run-life-council`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ userId }),
    }
  )
  const councilData = await councilResponse.json()

  if (councilData.success) {
    // Insert notification
    await supabase.from('agent_notifications').insert({
      user_id: userId,
      agent_name: 'morning_briefing',
      notification_type: 'insight',
      title: councilData.insight.headline,
      body: councilData.insight.synthesis.substring(0, 500),
      metadata: { insight_id: councilData.insight.id, overall_status: councilData.insight.overall_status },
    })
  }
  return { success: true, message: 'Morning briefing generated', data: councilData }
}

case 'deadline_watcher': {
  // Query overdue/due-soon work items
  const { data: urgentTasks } = await supabase
    .from('work_items')
    .select('id, title, due_date, status, priority')
    .eq('user_id', userId)
    .in('status', ['todo', 'in_progress', 'pending'])
    .lte('due_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('due_date', { ascending: true })

  if (urgentTasks && urgentTasks.length > 0) {
    const overdue = urgentTasks.filter(t => new Date(t.due_date) < new Date())
    const dueToday = urgentTasks.filter(t => {
      const d = new Date(t.due_date)
      const today = new Date()
      return d.toDateString() === today.toDateString()
    })

    const title = overdue.length > 0
      ? `⚠️ ${overdue.length} tarefa(s) atrasada(s)`
      : `📋 ${dueToday.length} tarefa(s) para hoje`

    const body = urgentTasks.slice(0, 5).map(t => `• ${t.title}`).join('\n')

    await supabase.from('agent_notifications').insert({
      user_id: userId,
      agent_name: 'deadline_watcher',
      notification_type: 'deadline',
      title,
      body,
      metadata: { task_count: urgentTasks.length, overdue_count: overdue.length },
    })
  }
  return { success: true, message: `Found ${urgentTasks?.length || 0} urgent tasks` }
}

case 'pattern_analyzer': {
  // Call synthesize-user-patterns
  const patternResponse = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/synthesize-user-patterns`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ userId }),
    }
  )
  const patternData = await patternResponse.json()

  if (patternData.success && patternData.new_patterns?.length > 0) {
    await supabase.from('agent_notifications').insert({
      user_id: userId,
      agent_name: 'pattern_analyzer',
      notification_type: 'pattern',
      title: `🔍 ${patternData.new_patterns.length} novo(s) padrão(ões) detectado(s)`,
      body: patternData.new_patterns.map((p: any) => `• ${p.description}`).join('\n'),
      metadata: { patterns: patternData.new_patterns },
    })
  }
  return { success: true, message: 'Pattern analysis complete', data: patternData }
}
```

**Step 3: Test locally**

Run:
```bash
npx supabase functions serve proactive-trigger
```
Then test with curl:
```bash
curl -X POST http://localhost:54321/functions/v1/proactive-trigger \
  -H "Content-Type: application/json" \
  -H "x-proactive-secret: dev-secret-change-in-production" \
  -d '{"agent_name": "deadline_watcher", "user_id": "<test-user-id>"}'
```

**Step 4: Commit**

```bash
git add supabase/functions/proactive-trigger/index.ts
git commit -m "feat(agents): wire proactive-trigger to real agent logic with notifications"
```

---

## Task 6: Create UnifiedAgentChat with Trust Levels

**Files:**
- Create: `src/components/features/UnifiedAgentChat/UnifiedAgentChat.tsx`
- Create: `src/components/features/UnifiedAgentChat/TrustLevelBadge.tsx`
- Create: `src/components/features/UnifiedAgentChat/index.ts`
- Create: `src/hooks/useUnifiedChat.ts`
- Create: `src/hooks/useTrustLevel.ts`

**Step 1: Create useTrustLevel hook**

```typescript
// src/hooks/useTrustLevel.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabaseClient'
import {
  calculateTrustLevel,
  getTrustProgress,
  getTrustLevelLabel,
  type TrustLevel,
  type UserStats,
} from '@/lib/agents/trustLevel'

export interface UseTrustLevelReturn {
  trustLevel: TrustLevel
  label: string
  progress: number
  nextLevel: TrustLevel | null
  stats: UserStats | null
  isLoading: boolean
}

export function useTrustLevel(): UseTrustLevelReturn {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch engagement stats in parallel
        const [moments, tasks, profile] = await Promise.all([
          supabase.from('moments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('work_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('profiles').select('created_at').eq('id', user.id).single(),
        ])

        // Count distinct modules used
        const { count: modulesUsed } = await supabase
          .rpc('count_distinct_modules_used', { p_user_id: user.id })
          .single() || { count: 3 } // fallback

        const daysActive = profile.data?.created_at
          ? Math.floor((Date.now() - new Date(profile.data.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0

        setStats({
          totalMoments: moments.count || 0,
          totalTasks: tasks.count || 0,
          daysActive,
          modulesUsed: typeof modulesUsed === 'number' ? modulesUsed : 3,
          patternsCount: 0,
        })
      } catch {
        // Default to beginner on error
        setStats({ totalMoments: 0, totalTasks: 0, daysActive: 0, modulesUsed: 0, patternsCount: 0 })
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const trustLevel = stats ? calculateTrustLevel(stats) : 'suggest_confirm'
  const { progress, nextLevel } = stats
    ? getTrustProgress(stats)
    : { progress: 0, nextLevel: 'execute_validate' as TrustLevel }

  return {
    trustLevel,
    label: getTrustLevelLabel(trustLevel),
    progress,
    nextLevel,
    stats,
    isLoading,
  }
}
```

**Step 2: Create TrustLevelBadge**

```typescript
// src/components/features/UnifiedAgentChat/TrustLevelBadge.tsx
import { Shield, Zap, Sparkles } from 'lucide-react'
import type { TrustLevel } from '@/lib/agents/trustLevel'

const TRUST_CONFIG: Record<TrustLevel, {
  icon: typeof Shield
  label: string
  color: string
  bg: string
}> = {
  suggest_confirm: {
    icon: Shield,
    label: 'Assistido',
    color: 'text-ceramic-info',
    bg: 'bg-ceramic-info/10',
  },
  execute_validate: {
    icon: Zap,
    label: 'Autônomo',
    color: 'text-amber-600',
    bg: 'bg-amber-100',
  },
  jarvis: {
    icon: Sparkles,
    label: 'Jarvis',
    color: 'text-ceramic-success',
    bg: 'bg-ceramic-success/10',
  },
}

interface TrustLevelBadgeProps {
  level: TrustLevel
  progress?: number
  compact?: boolean
}

export function TrustLevelBadge({ level, progress, compact }: TrustLevelBadgeProps) {
  const config = TRUST_CONFIG[level]
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg}`}>
      <Icon size={compact ? 12 : 14} className={config.color} />
      {!compact && (
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
      {progress !== undefined && progress < 1 && !compact && (
        <div className="w-12 h-1 bg-ceramic-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${config.bg.replace('/10', '')}`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
```

**Step 3: Create UnifiedAgentChat**

This wraps the existing `ModuleAgentChat` with:
- Trust level badge in header
- Agent notifications panel
- Context-aware module routing
- Trust-level-aware action confirmations

See the existing `ModuleAgentChat.tsx` for the base pattern. The unified version adds a module selector and trust level integration.

**Step 4: Create barrel export**

```typescript
// src/components/features/UnifiedAgentChat/index.ts
export { UnifiedAgentChat } from './UnifiedAgentChat'
export { TrustLevelBadge } from './TrustLevelBadge'
```

**Step 5: Run build**

Run: `npm run build && npm run typecheck`
Expected: 0 errors

**Step 6: Commit**

```bash
git add src/components/features/UnifiedAgentChat/ src/hooks/useTrustLevel.ts src/hooks/useUnifiedChat.ts
git commit -m "feat(agents): add UnifiedAgentChat with trust level integration"
```

---

## Task 7: Integration — Wire Components into App

**Files:**
- Modify: Header component (add `AgentNotificationBell`)
- Modify: Journey dashboard (verify `LifeCouncilCard` is visible)
- Modify: Main layout (add `UnifiedAgentChat` FAB)

**Step 1: Read current header and layout files**

Find and read:
- `src/components/layout/HeaderGlobal.tsx` or equivalent
- Journey dashboard page
- Main App layout

**Step 2: Add AgentNotificationBell to header**

Add import and component next to existing header actions.

**Step 3: Verify LifeCouncilCard is in Journey dashboard**

Check if `useLifeCouncil` and `LifeCouncilCard` are already integrated.

**Step 4: Add UnifiedAgentChat FAB to main layout**

Replace or augment existing `ModuleAgentFAB` with the unified version.

**Step 5: Run build**

Run: `npm run build && npm run typecheck`
Expected: 0 errors

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(agents): integrate notification bell, council card, and unified chat into app layout"
```

---

## Task 8: Deploy Edge Functions + Verify End-to-End

**Files:**
- Deploy: `proactive-trigger` (updated with real logic)
- Verify: All other Edge Functions are deployed

**Step 1: Deploy updated proactive-trigger**

```bash
npx supabase functions deploy proactive-trigger --no-verify-jwt
```

**Step 2: Test morning_briefing end-to-end**

```bash
curl -X POST https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/proactive-trigger \
  -H "Content-Type: application/json" \
  -H "x-proactive-secret: <ACTUAL_SECRET>" \
  -d '{"agent_name": "morning_briefing", "user_id": "<test-user-id>"}'
```
Expected: Daily insight generated + notification created

**Step 3: Test deadline_watcher**

Same pattern, verify notification created for overdue tasks.

**Step 4: Verify via frontend**

1. Open dev.aica.guru
2. Check notification bell shows new notifications
3. Check Journey dashboard shows Life Council insight
4. Test unified chat

**Step 5: Commit deploy verification**

```bash
git commit --allow-empty -m "chore(agents): verify edge function deployments"
```

---

## Task 9: Final Build Verification + PR

**Step 1: Full verification**

```bash
npm run build && npm run typecheck && npm run test
```
Expected: All pass

**Step 2: Create PR**

```bash
gh pr create --title "feat(agents): autonomous agents sprint — notifications, unified chat, trust levels" --body "$(cat <<'EOF'
## Summary
- Add `agent_notifications` table with RLS + RPCs
- Create `useAgentNotifications` hook with Supabase Realtime
- Create `AgentNotificationBell` component for header
- Wire `proactive-trigger` to call real Edge Functions (morning_briefing, deadline_watcher, pattern_analyzer)
- Create `UnifiedAgentChat` with trust level integration
- Create `useTrustLevel` hook + `TrustLevelBadge` component
- Integrate all components into app layout

## Existing Infrastructure Leveraged (not rebuilt)
- `run-life-council` Edge Function (fan-out/fan-in with 3 AI personas)
- `plan-and-execute` Edge Function (decompose + execute steps)
- `synthesize-user-patterns` Edge Function
- `model-router` + `health-tracker` shared utilities
- `useLifeCouncil` + `LifeCouncilCard` (Life Council frontend)
- `useExecutionPlan` + `ExecutionPlanView` (Agent Orchestra frontend)
- Agent Registry with 9 module agents + coordinator
- Trust Level System (3 tiers)

## Test plan
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] agent_notifications migration applied
- [ ] proactive-trigger calls run-life-council successfully
- [ ] deadline_watcher finds overdue tasks and creates notifications
- [ ] Notification bell shows in header with real-time updates
- [ ] Unified chat routes to correct module agent

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Agent Team Assignment

| Task | Owner | Dependencies |
|------|-------|-------------|
| Task 1: Verify infrastructure | Database | None |
| Task 2: agent_notifications migration | Database | None |
| Task 3: useAgentNotifications hook | Frontend | Task 2 |
| Task 4: AgentNotificationBell | Frontend | Task 3 |
| Task 5: Wire proactive-trigger | Backend | Task 2 |
| Task 6: UnifiedAgentChat + trust levels | Frontend | None |
| Task 7: Integration wiring | Frontend | Tasks 4, 6 |
| Task 8: Deploy + E2E verify | Backend | Tasks 5, 7 |
| Task 9: Final verification + PR | Lead | Task 8 |

**Parallel execution groups:**
- Group 1 (parallel): Tasks 1, 2, 6
- Group 2 (parallel): Tasks 3, 5 (after Task 2)
- Group 3 (parallel): Tasks 4, 7 (after Tasks 3, 6)
- Group 4 (sequential): Task 8 → Task 9
