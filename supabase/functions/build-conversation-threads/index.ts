/**
 * Edge Function: build-conversation-threads
 * WhatsApp Conversation Intelligence — Phase 2
 *
 * Purpose:
 * - Group unthreaded messages into temporal sessions (30-min gap rule)
 * - Summarize each thread with topic, decisions, action items
 * - Uses ONLY intent_summary fields (privacy-first, no raw text)
 * - Runs after dossier build in batch pipeline
 *
 * Called by:
 * - pg_cron (after build-contact-dossier)
 * - Frontend on-demand (single contact)
 *
 * Gemini Model: gemini-2.5-flash
 *
 * Endpoint: POST /functions/v1/build-conversation-threads
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

// =============================================================================
// TYPES
// =============================================================================

interface UnthreadedMessage {
  message_id: string
  contact_id: string
  direction: string
  intent_summary: string
  intent_category: string
  intent_sentiment: string
  intent_urgency: number
  intent_topic: string | null
  intent_action_required: boolean
  participant_phone: string | null
  participant_name: string | null
  message_timestamp: string
}

interface MessageGroup {
  contactId: string
  messages: UnthreadedMessage[]
}

interface ThreadSummary {
  summary: string
  topic: string
  decisions: string[]
  action_items: string[]
  thread_type: string
  sentiment_arc: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL = 'gemini-2.5-flash'
const GAP_THRESHOLD_MS = 30 * 60 * 1000 // 30 minutes
const MIN_MESSAGES_PER_THREAD = 3
const MAX_MESSAGES_PER_BATCH = 500

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract JSON from Gemini response
 */
function extractJSON(text: string): unknown {
  try { return JSON.parse(text) } catch { /* ignore */ }

  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch { /* ignore */ }
  }

  const braceStart = text.indexOf('{')
  const braceEnd = text.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(text.substring(braceStart, braceEnd + 1)) } catch { /* ignore */ }
  }

  throw new Error(`Failed to extract JSON: ${text.substring(0, 200)}`)
}

/**
 * Split messages into temporal sessions based on gap threshold
 */
function splitIntoSessions(messages: UnthreadedMessage[]): UnthreadedMessage[][] {
  if (messages.length === 0) return []

  const sorted = [...messages].sort(
    (a, b) => new Date(a.message_timestamp).getTime() - new Date(b.message_timestamp).getTime()
  )

  const sessions: UnthreadedMessage[][] = [[sorted[0]]]

  for (let i = 1; i < sorted.length; i++) {
    const prevTime = new Date(sorted[i - 1].message_timestamp).getTime()
    const currTime = new Date(sorted[i].message_timestamp).getTime()

    if (currTime - prevTime > GAP_THRESHOLD_MS) {
      sessions.push([sorted[i]])
    } else {
      sessions[sessions.length - 1].push(sorted[i])
    }
  }

  // Filter out sessions with fewer than MIN_MESSAGES_PER_THREAD
  return sessions.filter(s => s.length >= MIN_MESSAGES_PER_THREAD)
}

/**
 * Group messages by contact_id
 */
function groupByContact(messages: UnthreadedMessage[]): MessageGroup[] {
  const groups: Record<string, UnthreadedMessage[]> = {}

  for (const msg of messages) {
    if (!groups[msg.contact_id]) {
      groups[msg.contact_id] = []
    }
    groups[msg.contact_id].push(msg)
  }

  return Object.entries(groups).map(([contactId, msgs]) => ({
    contactId,
    messages: msgs,
  }))
}

/**
 * Build prompt for thread summarization
 */
function buildThreadPrompt(messages: UnthreadedMessage[], isGroup: boolean): string {
  const intentLines = messages.map(m => {
    const dir = m.direction === 'incoming' ? '←' : '→'
    const time = new Date(m.message_timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const date = new Date(m.message_timestamp).toLocaleDateString('pt-BR')
    const participant = m.participant_name ? ` [${m.participant_name}]` : ''
    const urgency = m.intent_urgency >= 4 ? ' [URGENTE]' : ''
    const action = m.intent_action_required ? ' [ACAO]' : ''
    return `${date} ${time} ${dir}${participant} [${m.intent_category}/${m.intent_sentiment}] ${m.intent_summary}${urgency}${action}`
  }).join('\n')

  const contextNote = isGroup
    ? 'Este e um grupo de WhatsApp. Identifique participantes ativos e dinamica do grupo.'
    : 'Esta e uma conversa 1-para-1.'

  return `Analise esta sessao de conversa de WhatsApp e gere um resumo estruturado.
${contextNote}

MENSAGENS (${messages.length} interacoes, apenas resumos de intencao — sem texto bruto):
${intentLines}

Gere um JSON com:
{
  "summary": "Resumo da sessao em ate 300 caracteres",
  "topic": "Topico principal da sessao (max 50 chars)",
  "decisions": ["decisao1", "decisao2"],
  "action_items": ["item de acao 1", "item de acao 2"],
  "thread_type": "general|planning|decision|social|support|negotiation",
  "sentiment_arc": "improving|declining|neutral|mixed|positive|negative"
}

REGRAS:
- Responda APENAS com JSON valido
- summary em portugues, max 300 caracteres
- decisions: apenas decisoes explicitas tomadas na conversa
- action_items: apenas acoes pendentes que precisam ser feitas
- Se nao houver decisoes ou acoes, retorne arrays vazios
- thread_type: classifique o tipo predominante da conversa
- sentiment_arc: como o sentimento evoluiu durante a sessao`
}

/**
 * Call Gemini for thread summary
 */
interface GeminiCallResult {
  thread: ThreadSummary
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
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
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

  const parsed = extractJSON(text) as ThreadSummary

  return {
    thread: {
      summary: (parsed.summary || '').substring(0, 300),
      topic: (parsed.topic || 'Conversa geral').substring(0, 50),
      decisions: (parsed.decisions || []).map(String).slice(0, 10),
      action_items: (parsed.action_items || []).map(String).slice(0, 10),
      thread_type: parsed.thread_type || 'general',
      sentiment_arc: parsed.sentiment_arc || 'neutral',
    },
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
    const { userId, contactId, messageLimit } = body
    const effectiveLimit = messageLimit || MAX_MESSAGES_PER_BATCH

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch unthreaded messages
    const { data: messages, error: msgError } = await supabase.rpc('get_unthreaded_messages', {
      p_user_id: userId,
      p_contact_id: contactId || null,
      p_limit: effectiveLimit,
    })

    if (msgError) throw new Error(`Failed to fetch messages: ${msgError.message}`)

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, threads_created: 0, message: 'No unthreaded messages' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[build-conversation-threads] Processing ${messages.length} unthreaded messages for user ${userId}`)

    // Group by contact, then split into sessions
    const contactGroups = groupByContact(messages as UnthreadedMessage[])
    let threadsCreated = 0
    let threadsFailed = 0

    for (const group of contactGroups) {
      const sessions = splitIntoSessions(group.messages)

      for (const session of sessions) {
        try {
          // Detect if group conversation
          const isGroup = session.some(m => m.participant_phone !== null)

          // Get thread summary from Gemini
          const prompt = buildThreadPrompt(session, isGroup)
          const startMs = Date.now()
          const { thread: threadSummary, usageMetadata } = await callGemini(prompt, apiKey)
          const durationMs = Date.now() - startMs

          // Collect unique participants
          const participants = [...new Set(
            session
              .filter(m => m.participant_name)
              .map(m => m.participant_name!)
          )]

          // Create thread record
          const threadStart = session[0].message_timestamp
          const threadEnd = session[session.length - 1].message_timestamp

          const { data: thread, error: insertError } = await supabase
            .from('conversation_threads')
            .insert({
              user_id: userId,
              contact_id: group.contactId,
              thread_start: threadStart,
              thread_end: threadEnd,
              message_count: session.length,
              summary: threadSummary.summary,
              topic: threadSummary.topic,
              decisions: threadSummary.decisions,
              action_items: threadSummary.action_items,
              participants,
              thread_type: threadSummary.thread_type,
              sentiment_arc: threadSummary.sentiment_arc,
              is_group: isGroup,
            })
            .select('id')
            .single()

          if (insertError) throw insertError

          // Assign messages to thread
          const messageIds = session.map(m => m.message_id)
          await supabase.rpc('assign_messages_to_thread', {
            p_user_id: userId,
            p_thread_id: thread.id,
            p_message_ids: messageIds,
          })

          // Fire-and-forget cost tracking
          if (usageMetadata) {
            supabase.rpc('log_ai_usage', {
              p_user_id: userId,
              p_operation_type: 'thread_building',
              p_ai_model: GEMINI_MODEL,
              p_input_tokens: usageMetadata.promptTokenCount || 0,
              p_output_tokens: usageMetadata.candidatesTokenCount || 0,
              p_module_type: 'whatsapp',
              p_module_id: thread.id,
              p_duration_seconds: durationMs / 1000,
            }).catch(err => console.warn('[CI] Cost tracking failed (non-blocking):', err))
          }

          threadsCreated++
          console.log(`[build-conversation-threads] Created thread: ${threadSummary.topic} (${session.length} messages)`)

          // Rate limit delay
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (err) {
          console.error(`[build-conversation-threads] Failed to create thread:`, err)
          threadsFailed++
        }
      }
    }

    console.log(`[build-conversation-threads] Done: ${threadsCreated} created, ${threadsFailed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        threads_created: threadsCreated,
        threads_failed: threadsFailed,
        messages_processed: messages.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[build-conversation-threads] Fatal error:', error)

    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
