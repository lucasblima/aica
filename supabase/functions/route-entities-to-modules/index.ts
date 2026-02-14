/**
 * Edge Function: route-entities-to-modules
 * WhatsApp Conversation Intelligence — Phase 3
 *
 * Purpose:
 * - Extract entities (tasks, events, monetary, deadlines) from conversation threads
 * - Route extracted entities to appropriate modules (Atlas, Agenda, Finance)
 * - Creates suggestions in whatsapp_extracted_entities (user confirms via inbox)
 * - Uses thread summaries + intent data (privacy-first)
 *
 * Gemini Model: gemini-2.5-flash
 *
 * Endpoint: POST /functions/v1/route-entities-to-modules
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

// =============================================================================
// TYPES
// =============================================================================

interface ThreadData {
  thread_id: string
  contact_id: string
  contact_name: string
  summary: string
  topic: string
  decisions: string[]
  action_items: string[]
  thread_type: string
  thread_start: string
  thread_end: string
  is_group: boolean
}

interface ExtractedEntity {
  entity_type: 'task' | 'event' | 'monetary' | 'person' | 'project' | 'deadline' | 'reminder'
  entity_summary: string
  entity_details: Record<string, unknown>
  routed_to_module: 'atlas' | 'agenda' | 'finance' | null
  confidence: number
  source_context: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL = 'gemini-2.5-flash'

// =============================================================================
// HELPERS
// =============================================================================

function extractJSON(text: string): unknown {
  try { return JSON.parse(text) } catch { /* ignore */ }
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch { /* ignore */ }
  }
  const braceStart = text.indexOf('[')
  const braceEnd = text.lastIndexOf(']')
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(text.substring(braceStart, braceEnd + 1)) } catch { /* ignore */ }
  }
  // Try object
  const objStart = text.indexOf('{')
  const objEnd = text.lastIndexOf('}')
  if (objStart !== -1 && objEnd > objStart) {
    try { return JSON.parse(text.substring(objStart, objEnd + 1)) } catch { /* ignore */ }
  }
  throw new Error(`Failed to extract JSON: ${text.substring(0, 200)}`)
}

function buildExtractionPrompt(threads: ThreadData[]): string {
  const threadDescriptions = threads.map(t => {
    const decisionsStr = t.decisions.length > 0 ? `\n  Decisoes: ${t.decisions.join('; ')}` : ''
    const actionsStr = t.action_items.length > 0 ? `\n  Acoes: ${t.action_items.join('; ')}` : ''
    return `- [${t.topic || 'Conversa'}] (${t.contact_name}, ${new Date(t.thread_start).toLocaleDateString('pt-BR')}):
  Resumo: ${t.summary}${decisionsStr}${actionsStr}`
  }).join('\n\n')

  return `Analise os resumos de conversas abaixo e extraia entidades acionaveis.

THREADS DE CONVERSA:
${threadDescriptions}

Para cada entidade encontrada, classifique e estruture como JSON array:
[
  {
    "entity_type": "task|event|monetary|person|project|deadline|reminder",
    "entity_summary": "Descricao curta da entidade (max 200 chars)",
    "entity_details": {
      // Para task: { "title": "", "priority": "high|medium|low", "due_date": "YYYY-MM-DD" }
      // Para event: { "title": "", "date": "YYYY-MM-DD", "time": "HH:mm", "location": "" }
      // Para monetary: { "description": "", "amount": 0, "currency": "BRL", "type": "expense|income" }
      // Para deadline: { "description": "", "date": "YYYY-MM-DD", "context": "" }
      // Para reminder: { "description": "", "date": "YYYY-MM-DD", "time": "HH:mm" }
      // Para person: { "name": "", "role": "", "context": "" }
      // Para project: { "name": "", "status": "", "context": "" }
    },
    "routed_to_module": "atlas|agenda|finance|null",
    "confidence": 0.0-1.0,
    "source_context": "De qual thread/contato (max 100 chars)"
  }
]

REGRAS:
- Responda APENAS com JSON array valido
- Extraia apenas entidades ACIONAVEIS e especificas
- confidence: 0.9+ para itens explicitos, 0.5-0.8 para inferidos
- Roteamento: task/deadline → atlas, event/reminder → agenda, monetary → finance
- NAO extraia entidades vagas ou genericas
- Se nao houver entidades, retorne array vazio []
- entity_summary em portugues, max 200 chars`
}

interface GeminiCallResult {
  entities: ExtractedEntity[]
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
}

async function callGemini(prompt: string, apiKey: string): Promise<GeminiCallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${error}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty Gemini response')

  const parsed = extractJSON(text)
  const rawEntities = Array.isArray(parsed) ? parsed : []

  return {
    entities: rawEntities.map((e: Record<string, unknown>) => ({
      entity_type: String(e.entity_type || 'task'),
      entity_summary: String(e.entity_summary || '').substring(0, 200),
      entity_details: (e.entity_details || {}) as Record<string, unknown>,
      routed_to_module: e.routed_to_module as ExtractedEntity['routed_to_module'] || null,
      confidence: Number(e.confidence) || 0.5,
      source_context: String(e.source_context || '').substring(0, 100),
    })),
    usageMetadata: data.usageMetadata,
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { userId, threadIds } = body

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch recent threads that haven't been entity-extracted yet
    let threadsQuery = supabase
      .from('conversation_threads')
      .select(`
        id,
        contact_id,
        summary,
        topic,
        decisions,
        action_items,
        thread_type,
        thread_start,
        thread_end,
        is_group,
        contact_network!inner(name, whatsapp_name)
      `)
      .eq('user_id', userId)
      .not('summary', 'is', null)
      .order('thread_start', { ascending: false })
      .limit(20)

    if (threadIds && threadIds.length > 0) {
      threadsQuery = threadsQuery.in('id', threadIds)
    }

    const { data: threads, error: threadsError } = await threadsQuery

    if (threadsError) throw new Error(`Failed to fetch threads: ${threadsError.message}`)

    if (!threads || threads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, entities_created: 0, message: 'No threads to process' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map threads to prompt format
    const threadData: ThreadData[] = threads.map((t: Record<string, unknown>) => ({
      thread_id: t.id as string,
      contact_id: t.contact_id as string,
      contact_name: (t.contact_network as Record<string, unknown>)?.name as string ||
                    (t.contact_network as Record<string, unknown>)?.whatsapp_name as string || 'Unknown',
      summary: t.summary as string || '',
      topic: t.topic as string || '',
      decisions: (t.decisions as string[]) || [],
      action_items: (t.action_items as string[]) || [],
      thread_type: t.thread_type as string || 'general',
      thread_start: t.thread_start as string,
      thread_end: t.thread_end as string,
      is_group: t.is_group as boolean || false,
    }))

    console.log(`[route-entities] Processing ${threadData.length} threads for user ${userId}`)

    // Extract entities via Gemini
    const prompt = buildExtractionPrompt(threadData)
    const startMs = Date.now()
    const { entities, usageMetadata } = await callGemini(prompt, apiKey)
    const durationMs = Date.now() - startMs

    // Fire-and-forget cost tracking
    if (usageMetadata) {
      supabase.rpc('log_ai_usage', {
        p_user_id: userId,
        p_operation_type: 'entity_extraction',
        p_ai_model: GEMINI_MODEL,
        p_input_tokens: usageMetadata.promptTokenCount || 0,
        p_output_tokens: usageMetadata.candidatesTokenCount || 0,
        p_module_type: 'whatsapp',
        p_module_id: null,
        p_duration_seconds: durationMs / 1000,
      }).catch(err => console.warn('[CI] Cost tracking failed (non-blocking):', err))
    }

    if (entities.length === 0) {
      return new Response(
        JSON.stringify({ success: true, entities_created: 0, message: 'No entities found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build a thread lookup for contact_id
    const threadMap: Record<string, ThreadData> = {}
    for (const t of threadData) {
      threadMap[t.topic || t.thread_id] = t
    }

    // Insert entities
    let created = 0
    for (const entity of entities) {
      // Try to find matching thread for this entity
      const matchingThread = threadData.find(t =>
        entity.source_context?.includes(t.contact_name) ||
        entity.source_context?.includes(t.topic || '')
      ) || threadData[0]

      const { error: insertError } = await supabase
        .from('whatsapp_extracted_entities')
        .insert({
          user_id: userId,
          contact_id: matchingThread?.contact_id || null,
          thread_id: matchingThread?.thread_id || null,
          entity_type: entity.entity_type,
          entity_summary: entity.entity_summary,
          entity_details: entity.entity_details,
          routed_to_module: entity.routed_to_module,
          routing_status: 'suggested',
          confidence: entity.confidence,
          source_context: entity.source_context,
        })

      if (insertError) {
        console.error(`[route-entities] Failed to insert entity:`, insertError)
      } else {
        created++
      }
    }

    console.log(`[route-entities] Created ${created}/${entities.length} entities`)

    return new Response(
      JSON.stringify({
        success: true,
        entities_created: created,
        entities_total: entities.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[route-entities] Fatal error:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
