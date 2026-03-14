import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { routeNotification } from '../_shared/channel-router.ts'

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

// Inline extractJSON since _shared/model-router.ts may have Deno compatibility issues
function extractJSON<T>(text: string): T {
  // Strip code fences first
  let cleaned = text.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '')
  // Find first { or [
  const startObj = cleaned.indexOf('{')
  const startArr = cleaned.indexOf('[')
  let start = -1
  if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr)
  else if (startObj >= 0) start = startObj
  else if (startArr >= 0) start = startArr
  if (start === -1) throw new Error('No JSON found in response')
  cleaned = cleaned.substring(start)
  // Find matching closing bracket
  const isArray = cleaned[0] === '['
  const closeChar = isArray ? ']' : '}'
  let depth = 0
  let end = -1
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{' || cleaned[i] === '[') depth++
    if (cleaned[i] === '}' || cleaned[i] === ']') depth--
    if (depth === 0) { end = i + 1; break }
  }
  if (end === -1) throw new Error('Malformed JSON in response')
  return JSON.parse(cleaned.substring(0, end)) as T
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Auth: service_role only (called by proactive-trigger or pg_cron)
  const auth = req.headers.get('authorization')?.replace('Bearer ', '')
  if (auth !== SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  let body: { user_id?: string } = {}
  try { body = await req.json() } catch { /* empty body ok */ }
  const userId = body.user_id

  if (!userId) {
    return new Response(JSON.stringify({ success: false, error: 'user_id required' }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    // 1. Call run-life-council for strategic insight
    let councilInsight = 'Sem insight disponível'
    try {
      const councilRes = await fetch(`${SUPABASE_URL}/functions/v1/run-life-council`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ user_id: userId }),
      })
      const councilData = await councilRes.json()
      councilInsight = councilData?.insight || councilData?.synthesis || councilInsight
    } catch (err) {
      console.warn('Life Council call failed (non-critical):', err)
    }

    // 2. Parallel data collection
    const today = new Date().toISOString().split('T')[0]
    const [calendar, tasks, finance, stats, contacts] = await Promise.all([
      supabase.from('calendar_events').select('title, start_time, end_time').eq('user_id', userId)
        .gte('start_time', `${today}T00:00:00`).lte('start_time', `${today}T23:59:59`).limit(10),
      supabase.from('work_items').select('title, priority, status').eq('user_id', userId)
        .in('status', ['todo', 'in_progress']).order('priority', { ascending: false }).limit(5),
      supabase.from('finance_transactions').select('amount, category, type').eq('user_id', userId)
        .gte('transaction_date', today).limit(20),
      supabase.from('user_stats').select('total_xp, level, current_streak').eq('user_id', userId).maybeSingle(),
      supabase.from('contact_network').select('name, relationship_health').eq('user_id', userId)
        .lt('relationship_health', 40).limit(5),
    ])

    // 3. Gemini synthesis
    const prompt = `Você é o assistente AICA. Gere um briefing matinal conciso em português para o usuário.
Dados do dia:
- Calendário: ${JSON.stringify(calendar.data || [])}
- Tarefas pendentes: ${JSON.stringify(tasks.data || [])}
- Transações hoje: ${JSON.stringify(finance.data || [])}
- XP: ${stats.data?.total_xp || 0}, Nível: ${stats.data?.level || 1}, Streak: ${stats.data?.current_streak || 0} dias
- Contatos que precisam de atenção: ${JSON.stringify(contacts.data || [])}
- Life Council insight: ${councilInsight}

Retorne APENAS JSON válido com estas chaves:
{
  "greeting": "saudação personalizada",
  "lifeCouncilInsight": "resumo do insight estratégico",
  "todayPriorities": ["prioridade 1", "prioridade 2"],
  "calendarHighlights": ["evento importante"],
  "financeSummary": "resumo financeiro ou null",
  "contactFollowups": ["nome - razão"],
  "streakStatus": "status do streak",
  "motivationalClose": "mensagem motivacional curta"
}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096 },
        }),
      }
    )
    const geminiData = await geminiRes.json()
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const briefing = extractJSON<BriefingOutput>(text)

    // 4. Format and deliver via channel-router
    const formattedBody = [
      briefing.greeting,
      '',
      `📊 ${briefing.lifeCouncilInsight}`,
      '',
      '🎯 Prioridades:',
      ...(briefing.todayPriorities || []).map(p => `  • ${p}`),
      '',
      '📅 Agenda:',
      ...(briefing.calendarHighlights || []).map(e => `  • ${e}`),
      briefing.financeSummary ? `\n💰 ${briefing.financeSummary}` : '',
      (briefing.contactFollowups || []).length > 0
        ? `\n👥 Contatos:\n${briefing.contactFollowups.map(c => `  • ${c}`).join('\n')}`
        : '',
      `\n🔥 ${briefing.streakStatus}`,
      `\n${briefing.motivationalClose}`,
    ].filter(Boolean).join('\n')

    await routeNotification(supabase, userId, 'morning_briefing', {
      title: 'Bom dia! Seu briefing diário',
      body: formattedBody,
      agent: 'morning_briefing',
      actionable: false,
      metadata: { briefing },
    })

    return new Response(
      JSON.stringify({ success: true, briefing }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Morning briefing error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
