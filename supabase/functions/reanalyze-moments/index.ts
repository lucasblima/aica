/**
 * Reanalyze Moments Edge Function
 *
 * Batch re-analyzes moments that have neutral or null emotion.
 * Uses the improved Gemini prompt to detect the real emotion from content.
 *
 * POST /reanalyze-moments
 * Body: { limit?: number }  (default 50, max 100)
 *
 * Returns: { success: true, processed: number, updated: number, results: [...] }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// ============================================================================
// CORS
// ============================================================================
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://dev.aica.guru',
  'https://aica.guru',
]

function getCorsHeaders(request: Request): Record<string, string> | null {
  const origin = request.headers.get('origin') || ''
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return null
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================
const VALID_EMOTION_VALUES = [
  'happy', 'sad', 'anxious', 'angry', 'thoughtful', 'calm', 'grateful',
  'tired', 'inspired', 'neutral', 'excited', 'disappointed', 'frustrated',
  'loving', 'scared', 'determined', 'sleepy', 'overwhelmed', 'confident', 'confused'
] as const

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ============================================================================
// HELPERS
// ============================================================================
function extractJSON<T = unknown>(text: string): T {
  // 1. Strip code fences
  const cleaned = text.replace(/```(?:json)?\s*\n?/g, '').trim()

  // 2. Try direct parse first
  try { return JSON.parse(cleaned) } catch { /* continue */ }

  // 3. Find first { or [ and match to last } or ]
  const objStart = cleaned.indexOf('{')
  const arrStart = cleaned.indexOf('[')
  let start = -1
  let end = -1

  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
    start = objStart
    end = cleaned.lastIndexOf('}')
  } else if (arrStart >= 0) {
    start = arrStart
    end = cleaned.lastIndexOf(']')
  }

  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.substring(start, end + 1)) } catch { /* fall through */ }
  }

  throw new Error(`No valid JSON found in response: ${text.substring(0, 200)}`)
}

// ============================================================================
// MAIN
// ============================================================================
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    if (!corsHeaders) return new Response('Forbidden', { status: 403 })
    return new Response('ok', { headers: corsHeaders })
  }
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Authenticate: user JWT or service role + userId in body
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request body first (needed for userId fallback)
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(Math.max(body.limit || 50, 1), 100)

    let userId: string

    // Try user JWT auth first
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (user && !authError) {
      userId = user.id
    } else if (body.userId) {
      // Fallback: service role auth with explicit userId
      userId = body.userId
      console.log(`[reanalyze-moments] Using provided userId: ${userId}`)
    } else {
      return new Response(JSON.stringify({ error: 'Unauthorized - provide user JWT or userId in body' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use service role client for DB operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch moments needing reanalysis
    const { data: moments, error: fetchError } = await adminClient.rpc(
      'get_moments_needing_reanalysis',
      { p_user_id: userId, p_limit: limit }
    )

    if (fetchError) {
      console.error('[reanalyze-moments] Fetch error:', fetchError)
      return new Response(JSON.stringify({ error: 'Failed to fetch moments', detail: fetchError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!moments || moments.length === 0) {
      return new Response(JSON.stringify({
        success: true, processed: 0, updated: 0,
        message: 'No moments need reanalysis'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`[reanalyze-moments] Processing ${moments.length} moments for user ${userId}`)

    // Init Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.6,
        topP: 0.9,
        maxOutputTokens: 4096,
      },
    })

    // Process moments sequentially to avoid Gemini rate limits
    const results: Array<{ id: string; oldEmotion: string | null; newEmotion: string; newMood: { emoji: string; label: string } }> = []
    const errors: string[] = []
    let totalTokensIn = 0
    let totalTokensOut = 0
    const BATCH_SIZE = 1

    for (let i = 0; i < moments.length; i += BATCH_SIZE) {
      const batch = moments.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.allSettled(
        batch.map(async (moment: { id: string; content: string; emotion: string | null }) => {
          const prompt = `Analise a emocao deste registro de diario em portugues. Retorne SOMENTE JSON.

EXEMPLOS:

Entrada: "Estou com muitas saudades das minhas filhas"
{"mood":{"emoji":"😢","label":"Saudade","value":"sad"},"sentiment":"negative","sentimentScore":-0.6,"emotions":["saudade","tristeza"],"triggers":["distancia da familia"],"energyLevel":30}

Entrada: "Hoje foi um dia produtivo, consegui entregar tudo"
{"mood":{"emoji":"😎","label":"Confiante","value":"confident"},"sentiment":"very_positive","sentimentScore":0.8,"emotions":["satisfacao","orgulho"],"triggers":["trabalho concluido"],"energyLevel":85}

Entrada: "Nao consigo parar de pensar no que aconteceu"
{"mood":{"emoji":"😰","label":"Ansioso","value":"anxious"},"sentiment":"negative","sentimentScore":-0.5,"emotions":["ansiedade","preocupacao"],"triggers":["evento passado"],"energyLevel":60}

Entrada: "Acordei repleto de energia e motivacao"
{"mood":{"emoji":"🤩","label":"Inspirado","value":"inspired"},"sentiment":"very_positive","sentimentScore":0.9,"emotions":["inspiracao","entusiasmo"],"triggers":["novo dia"],"energyLevel":95}

AGORA ANALISE:

Entrada: "${moment.content.replace(/"/g, '\\"')}"

REGRAS: Responda SOMENTE com o JSON. Nunca use "neutral" exceto para textos puramente factuais sem emocao. mood.value DEVE ser um destes: happy, sad, anxious, angry, thoughtful, calm, grateful, tired, inspired, excited, disappointed, frustrated, loving, scared, determined, sleepy, overwhelmed, confident, confused`

          let text: string
          try {
            const result = await model.generateContent(prompt)
            text = result.response.text()
            const usageMeta = result.response.usageMetadata
            totalTokensIn += usageMeta?.promptTokenCount || 0
            totalTokensOut += usageMeta?.candidatesTokenCount || 0
            console.log(`[reanalyze-moments] Gemini OK for ${moment.id}: ${text.substring(0, 100)}`)
          } catch (geminiError: any) {
            const errMsg = geminiError?.message || String(geminiError)
            console.error(`[reanalyze-moments] Gemini FAILED for ${moment.id}:`, errMsg)
            return { _error: `gemini: ${errMsg.substring(0, 100)}` }
          }

          let parsed: { mood: { emoji: string; label: string; value: string }; sentiment: string; sentimentScore: number; emotions: string[]; energyLevel: number }
          try {
            parsed = extractJSON(text)
          } catch {
            console.warn(`[reanalyze-moments] JSON parse FAILED for ${moment.id}, raw: ${text.substring(0, 300)}`)
            return { _error: `json_parse: ${text.substring(0, 200)}` }
          }

          // Validate mood.value
          if (!parsed.mood?.value || !VALID_EMOTION_VALUES.includes(parsed.mood.value as any)) {
            parsed.mood = { emoji: '🤔', label: 'Pensativo', value: 'thoughtful' }
          }

          // Build sentiment_data
          const sentimentData = {
            timestamp: new Date().toISOString(),
            sentiment: parsed.sentiment || 'neutral',
            sentimentScore: Math.max(-1, Math.min(1, parsed.sentimentScore || 0)),
            emotions: Array.isArray(parsed.emotions) ? parsed.emotions.slice(0, 5) : [],
            triggers: [],
            energyLevel: Math.max(0, Math.min(100, parsed.energyLevel || 50)),
          }

          // Update DB
          const { error: updateError } = await adminClient
            .from('moments')
            .update({
              emotion: parsed.mood.value,
              sentiment_data: sentimentData,
            })
            .eq('id', moment.id)
            .eq('user_id', userId)

          if (updateError) {
            console.error(`[reanalyze-moments] DB update FAILED for ${moment.id}:`, updateError)
            return { _error: `db: ${updateError.message}` }
          }

          return {
            id: moment.id,
            oldEmotion: moment.emotion,
            newEmotion: parsed.mood.value,
            newMood: { emoji: parsed.mood.emoji, label: parsed.mood.label },
          }
        })
      )

      // Collect results
      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) {
          if (r.value._error) {
            errors.push(r.value._error)
          } else {
            results.push(r.value as any)
          }
        } else if (r.status === 'rejected') {
          errors.push(`rejected: ${r.reason?.message || String(r.reason)}`)
        }
      }

      // Delay between batches to respect rate limits
      if (i + BATCH_SIZE < moments.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const updated = results.filter(r => r.newEmotion !== 'neutral').length

    console.log(`[reanalyze-moments] Done: ${results.length} processed, ${updated} changed from neutral`)

    // Fire-and-forget: log one interaction per batch (analyze_moment covers all)
    if (results.length > 0) {
      adminClient.rpc('log_interaction', {
        p_user_id: userId,
        p_action: 'analyze_moment',
        p_module: 'journey',
        p_model: 'gemini-2.5-flash',
        p_tokens_in: totalTokensIn,
        p_tokens_out: totalTokensOut,
      }).then(() => {
        console.log('[reanalyze-moments] Logged interaction')
      }).catch((err: Error) => {
        console.warn('[reanalyze-moments] Failed to log interaction:', err.message)
      })
    }

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      updated,
      total_moments: moments.length,
      errors_count: errors.length,
      errors: errors.slice(0, 10),
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('[reanalyze-moments] Error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
