/**
 * Edge Function: build-contact-dossier
 * WhatsApp Conversation Intelligence — Phase 1
 *
 * Purpose:
 * - Batch-process contacts that have 3+ new messages since last dossier update
 * - Generate living summary, topics, pending items, and structured context
 * - Uses ONLY intent_summary fields (privacy-first, no raw text)
 * - Incremental: uses existing dossier as input for continuity
 * - Group-aware: different prompt for group contacts
 *
 * Called by:
 * - pg_cron every 30 minutes (batch mode)
 * - Frontend on-demand (single contact mode)
 *
 * Gemini Model: gemini-2.5-flash (cost-effective)
 *
 * Endpoint: POST /functions/v1/build-contact-dossier
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'

// =============================================================================
// TYPES
// =============================================================================

interface ContactForDossier {
  contact_id: string
  contact_name: string
  phone: string
  relationship_type: string
  new_message_count: number
  last_dossier_at: string | null
  current_dossier_summary: string | null
  current_dossier_version: number
}

interface IntentSummaryRow {
  message_id: string
  direction: string
  intent_summary: string
  intent_category: string
  intent_sentiment: string
  intent_urgency: number
  intent_topic: string | null
  intent_action_required: boolean
  message_timestamp: string
}

interface DossierResult {
  summary: string
  topics: string[]
  pending_items: string[]
  context: {
    relationship_nature: string
    communication_style: string
    key_dates: string[]
    notable_patterns: string[]
    preferred_topics: string[]
  }
}

interface BatchRequest {
  userId: string
  limit?: number
  messageLimit?: number
}

interface SingleRequest {
  userId: string
  contactId: string
  messageLimit?: number
}

// =============================================================================
// CONSTANTS
// =============================================================================

const GEMINI_MODEL = 'gemini-2.5-flash'
const MAX_INTENTS_PER_CONTACT = 100
const MAX_SUMMARY_LENGTH = 500
const MAX_TOPICS = 10
const MAX_PENDING_ITEMS = 10

// =============================================================================
// PROMPTS
// =============================================================================

function buildDossierPrompt(
  contact: ContactForDossier,
  intents: IntentSummaryRow[],
  isGroup: boolean
): string {
  const existingDossier = contact.current_dossier_summary
    ? `\n\nDOSSIER ANTERIOR (versao ${contact.current_dossier_version}):\n${contact.current_dossier_summary}`
    : ''

  const intentLines = intents.map(i => {
    const dir = i.direction === 'incoming' ? '←' : '→'
    const time = new Date(i.message_timestamp).toLocaleDateString('pt-BR')
    const urgency = i.intent_urgency >= 4 ? ' [URGENTE]' : ''
    const action = i.intent_action_required ? ' [ACAO NECESSARIA]' : ''
    return `${time} ${dir} [${i.intent_category}/${i.intent_sentiment}] ${i.intent_summary}${urgency}${action}`
  }).join('\n')

  if (isGroup) {
    return `Voce e um assistente de inteligencia relacional. Analise as interacoes de um GRUPO de WhatsApp e gere um dossie estruturado.

GRUPO: ${contact.contact_name}
TIPO: Grupo
MENSAGENS RECENTES (${intents.length} interacoes, apenas resumos de intencao — sem texto bruto):
${intentLines}
${existingDossier}

Gere um JSON com a seguinte estrutura:
{
  "summary": "Resumo do grupo em ate ${MAX_SUMMARY_LENGTH} caracteres: proposito, dinamica, temas recorrentes, decisoes recentes",
  "topics": ["topico1", "topico2", ...],  // Ate ${MAX_TOPICS} topicos mais discutidos
  "pending_items": ["item1", "item2", ...],  // Ate ${MAX_PENDING_ITEMS} decisoes pendentes ou acoes do grupo
  "context": {
    "relationship_nature": "descricao do tipo de grupo (trabalho, amigos, familia, projeto)",
    "communication_style": "padrao de comunicacao do grupo (formal, casual, misto)",
    "key_dates": ["datas importantes mencionadas"],
    "notable_patterns": ["padroes notaveis: horarios de atividade, quem lidera discussoes, etc"],
    "preferred_topics": ["topicos preferidos do grupo"]
  }
}

REGRAS:
- Responda APENAS com JSON valido, sem texto adicional
- summary deve ser em portugues, maximo ${MAX_SUMMARY_LENGTH} caracteres
- Se houver dossie anterior, mantenha continuidade e atualize com novas informacoes
- Foque em decisoes do grupo, nao em interacoes individuais
- pending_items: apenas acoes que realmente estao pendentes`
  }

  return `Voce e um assistente de inteligencia relacional. Analise as interacoes com um contato de WhatsApp e gere um dossie estruturado.

CONTATO: ${contact.contact_name}
TELEFONE: ${contact.phone || 'N/A'}
TIPO DE RELACIONAMENTO: ${contact.relationship_type}
MENSAGENS RECENTES (${intents.length} interacoes, apenas resumos de intencao — sem texto bruto):
${intentLines}
${existingDossier}

Gere um JSON com a seguinte estrutura:
{
  "summary": "Resumo do contato em ate ${MAX_SUMMARY_LENGTH} caracteres: quem e, contexto do relacionamento, temas recorrentes, status atual",
  "topics": ["topico1", "topico2", ...],  // Ate ${MAX_TOPICS} topicos mais discutidos
  "pending_items": ["item1", "item2", ...],  // Ate ${MAX_PENDING_ITEMS} itens pendentes entre voces
  "context": {
    "relationship_nature": "descricao da natureza do relacionamento",
    "communication_style": "padrao de comunicacao (formal, casual, misto, reativo, proativo)",
    "key_dates": ["datas importantes mencionadas nas conversas"],
    "notable_patterns": ["padroes notaveis: horarios, frequencia, assuntos recorrentes"],
    "preferred_topics": ["topicos mais discutidos e de interesse mutuo"]
  }
}

REGRAS:
- Responda APENAS com JSON valido, sem texto adicional
- summary deve ser em portugues, maximo ${MAX_SUMMARY_LENGTH} caracteres
- Se houver dossie anterior, mantenha continuidade e atualize com novas informacoes
- pending_items: apenas acoes realmente pendentes, remova itens ja resolvidos
- Seja especifico e util, evite generalidades vagas`
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract JSON from Gemini response that may contain preamble text or code fences
 */
function extractJSON(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text)
  } catch {
    // ignore
  }

  // Try extracting from code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {
      // ignore
    }
  }

  // Try finding first { ... } block
  const braceStart = text.indexOf('{')
  const braceEnd = text.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(text.substring(braceStart, braceEnd + 1))
    } catch {
      // ignore
    }
  }

  throw new Error(`Failed to extract JSON from response: ${text.substring(0, 200)}`)
}

/**
 * Call Gemini API for dossier generation
 */
interface GeminiCallResult {
  dossier: DossierResult
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
        temperature: 0.3,
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

  if (!text) {
    throw new Error('Empty response from Gemini')
  }

  const parsed = extractJSON(text) as DossierResult

  return {
    dossier: {
      summary: (parsed.summary || '').substring(0, MAX_SUMMARY_LENGTH),
      topics: (parsed.topics || []).slice(0, MAX_TOPICS).map(String),
      pending_items: (parsed.pending_items || []).slice(0, MAX_PENDING_ITEMS).map(String),
      context: {
        relationship_nature: parsed.context?.relationship_nature || '',
        communication_style: parsed.context?.communication_style || '',
        key_dates: (parsed.context?.key_dates || []).map(String),
        notable_patterns: (parsed.context?.notable_patterns || []).map(String),
        preferred_topics: (parsed.context?.preferred_topics || []).map(String),
      },
    },
    usageMetadata: data.usageMetadata,
  }
}

/**
 * Build dossier for a single contact
 */
async function buildDossierForContact(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  contact: ContactForDossier,
  apiKey: string,
  intentLimit: number = MAX_INTENTS_PER_CONTACT
): Promise<{ success: boolean; error?: string; dossier?: DossierResult }> {
  try {
    // Fetch intent summaries (privacy-first: no raw text)
    const { data: intents, error: intentsError } = await supabase.rpc(
      'get_contact_intent_summaries',
      {
        p_user_id: userId,
        p_contact_id: contact.contact_id,
        p_since: contact.last_dossier_at,
        p_limit: intentLimit,
      }
    )

    if (intentsError) {
      throw new Error(`Failed to fetch intents: ${intentsError.message}`)
    }

    if (!intents || intents.length === 0) {
      console.log(`[build-contact-dossier] No intents found for contact ${contact.contact_id} (last_dossier_at: ${contact.last_dossier_at}). Skipping dossier build.`)
      return { success: true } // No new intents to process
    }

    console.log(`[build-contact-dossier] Found ${intents.length} intents for contact ${contact.contact_name}`)

    // Determine if group
    const isGroup = contact.relationship_type === 'group'

    // Generate dossier via Gemini
    const prompt = buildDossierPrompt(contact, intents as IntentSummaryRow[], isGroup)
    const startMs = Date.now()
    const { dossier, usageMetadata } = await callGemini(prompt, apiKey)
    const durationMs = Date.now() - startMs

    // Fire-and-forget usage tracking
    if (usageMetadata) {
      supabase.rpc('log_interaction', {
        p_user_id: userId,
        p_action: 'build_contact_dossier',
        p_module: 'connections',
        p_model: GEMINI_MODEL,
        p_tokens_in: usageMetadata.promptTokenCount || 0,
        p_tokens_out: usageMetadata.candidatesTokenCount || 0,
      }).then(() => {
        console.log('[build-contact-dossier] Logged interaction')
      }).catch((err: any) => {
        console.warn('[build-contact-dossier] Failed to log interaction:', err.message)
      })
    }

    // Update contact_network with dossier via RPC
    const { data: rpcFound, error: updateError } = await supabase.rpc(
      'update_contact_dossier',
      {
        p_user_id: userId,
        p_contact_id: contact.contact_id,
        p_summary: dossier.summary,
        p_topics: dossier.topics,
        p_pending_items: dossier.pending_items,
        p_context: dossier.context,
      }
    )

    if (updateError) {
      console.error(`[build-contact-dossier] RPC update_contact_dossier error:`, updateError.message)
      throw new Error(`Failed to update dossier: ${updateError.message}`)
    }

    // Check FOUND — if RPC matched 0 rows, fall back to direct UPDATE
    if (rpcFound === false) {
      console.warn(`[build-contact-dossier] RPC returned FOUND=false for contact ${contact.contact_id}, attempting direct UPDATE`)
      const { error: directError } = await supabase
        .from('contact_network')
        .update({
          dossier_summary: dossier.summary,
          dossier_topics: dossier.topics,
          dossier_pending_items: dossier.pending_items,
          dossier_context: dossier.context,
          dossier_updated_at: new Date().toISOString(),
          dossier_version: (contact.current_dossier_version || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contact.contact_id)
        .eq('user_id', userId)

      if (directError) {
        console.error(`[build-contact-dossier] Direct UPDATE also failed:`, directError.message)
        throw new Error(`Failed to save dossier (both RPC and direct): ${directError.message}`)
      }
      console.log(`[build-contact-dossier] Direct UPDATE succeeded for ${contact.contact_name}`)
    }

    console.log(`[build-contact-dossier] Saved dossier for ${contact.contact_name} (v${(contact.current_dossier_version || 0) + 1}), ${intents.length} intents, RPC FOUND=${rpcFound}`)

    return { success: true, dossier }
  } catch (error) {
    console.error(`[build-contact-dossier] Error for contact ${contact.contact_id}:`, error)
    return { success: false, error: (error as Error).message }
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
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
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { userId, contactId, limit = 20, messageLimit } = body as BatchRequest & SingleRequest
    const effectiveMessageLimit = messageLimit || MAX_INTENTS_PER_CONTACT

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Single contact mode
    if (contactId) {
      // Fetch contact details
      const { data: contactData, error: contactError } = await supabase.rpc(
        'get_contact_dossier',
        { p_user_id: userId, p_contact_id: contactId }
      )

      if (contactError || !contactData || contactData.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Contact not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const contact: ContactForDossier = {
        contact_id: contactData[0].contact_id,
        contact_name: contactData[0].contact_name,
        phone: contactData[0].phone,
        relationship_type: contactData[0].relationship_type,
        new_message_count: 0,
        last_dossier_at: contactData[0].dossier_updated_at,
        current_dossier_summary: contactData[0].dossier_summary,
        current_dossier_version: contactData[0].dossier_version || 0,
      }

      const result = await buildDossierForContact(supabase, userId, contact, apiKey, effectiveMessageLimit)

      // Fetch updated dossier from DB to get the full record with all fields
      const { data: updatedDossier } = await supabase.rpc(
        'get_contact_dossier',
        { p_user_id: userId, p_contact_id: contactId }
      )

      // Use DB re-fetch if available, otherwise construct from Gemini result
      let responseDossier = updatedDossier?.[0] || null
      if (result.dossier && (!responseDossier?.dossier_summary)) {
        console.warn('[build-contact-dossier] DB re-fetch returned no dossier_summary, using Gemini result directly')
        responseDossier = {
          ...(responseDossier || {}),
          contact_id: contactId,
          dossier_summary: result.dossier.summary,
          dossier_topics: result.dossier.topics,
          dossier_pending_items: result.dossier.pending_items,
          dossier_context: result.dossier.context,
          dossier_version: (contact.current_dossier_version || 0) + 1,
        }
      }

      return new Response(
        JSON.stringify({
          success: result.success,
          error: result.error,
          dossier: responseDossier,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Batch mode
    const { data: contacts, error: contactsError } = await supabase.rpc(
      'get_contacts_needing_dossier_update',
      { p_user_id: userId, p_limit: limit }
    )

    if (contactsError) {
      throw new Error(`Failed to fetch contacts: ${contactsError.message}`)
    }

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No contacts need dossier update',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[build-contact-dossier] Processing ${contacts.length} contacts for user ${userId}`)

    // Process contacts sequentially to respect rate limits
    const results: { contactId: string; name: string; success: boolean; error?: string }[] = []

    for (const contact of contacts as ContactForDossier[]) {
      const result = await buildDossierForContact(supabase, userId, contact, apiKey)
      results.push({
        contactId: contact.contact_id,
        name: contact.contact_name,
        ...result,
      })

      // Small delay between contacts to respect Gemini rate limits
      if (contacts.indexOf(contact) < contacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`[build-contact-dossier] Batch complete: ${successCount} success, ${failCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: contacts.length,
        succeeded: successCount,
        failed: failCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[build-contact-dossier] Fatal error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
