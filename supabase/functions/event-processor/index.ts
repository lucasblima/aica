import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { routeNotification, type NotificationCategory } from '../_shared/channel-router.ts'

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
  id: string
  user_id: string
  event_type: string
  source_module: string
  payload: Record<string, unknown>
  created_at: string
}

// ---------------------------------------------------------------------------
// Gamification handler
// ---------------------------------------------------------------------------

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
  supabase: ReturnType<typeof createClient>,
  event: ModuleEvent,
): Promise<void> {
  const cfg = XP_MAP[event.event_type]
  if (!cfg) return

  const { error } = await supabase.rpc('award_user_xp', {
    p_user_id: event.user_id,
    p_xp_amount: cfg.xp,
    p_source: cfg.source,
    p_description: `${event.event_type} — ${(event.payload.title as string) || event.event_type}`,
  })
  if (error) console.warn(`XP award failed:`, error.message)
}

// ---------------------------------------------------------------------------
// Notification handler
// ---------------------------------------------------------------------------

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
    condition: () => true,
    agent: 'flux',
    message: (p) => `Treino "${p.name}" concluído! Bom trabalho.`,
    category: 'achievement',
    cooldownMs: 4 * 60 * 60 * 1000,
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
  supabase: ReturnType<typeof createClient>,
  event: ModuleEvent,
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

    await supabase.from('notification_cooldowns').upsert(
      {
        user_id: event.user_id,
        rule_key: ruleKey,
        last_notified_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,rule_key' },
    )
  }
}

// ---------------------------------------------------------------------------
// Main serve loop
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Auth: only service_role
  const auth = req.headers.get('authorization')?.replace('Bearer ', '')
  if (auth !== SUPABASE_SERVICE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
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
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    let processed = 0,
      errors = 0
    for (const event of events as ModuleEvent[]) {
      try {
        await supabase.from('module_events').update({ status: 'processing' }).eq('id', event.id)
        await gamificationHandler(supabase, event)
        await notificationHandler(supabase, event)
        await supabase
          .from('module_events')
          .update({ status: 'processed', processed_at: new Date().toISOString() })
          .eq('id', event.id)
        processed++
      } catch (err) {
        console.error(`Event ${event.id} failed:`, err)
        await supabase.from('module_events').update({ status: 'failed' }).eq('id', event.id)
        errors++
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, errors, total: events.length }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Event processor error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown',
      }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
