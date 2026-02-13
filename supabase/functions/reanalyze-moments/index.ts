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

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
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
  try { return JSON.parse(text) } catch { /* continue */ }
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) try { return JSON.parse(fenceMatch[1].trim()) } catch { /* continue */ }
  const objectMatch = text.match(/\{[\s\S]*\}/)
  if (objectMatch) try { return JSON.parse(objectMatch[0]) } catch { /* continue */ }
  throw new Error('No valid JSON found in response')
}

// ============================================================================
// MAIN
// ============================================================================
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create user-scoped client to get user_id
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(Math.max(body.limit || 50, 1), 100)

    // Use service role client for DB operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch moments needing reanalysis
    const { data: moments, error: fetchError } = await adminClient.rpc(
      'get_moments_needing_reanalysis',
      { p_user_id: user.id, p_limit: limit }
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

    console.log(`[reanalyze-moments] Processing ${moments.length} moments for user ${user.id}`)

    // Init Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
      },
    })

    // Process moments in parallel (batches of 5 to avoid rate limits)
    const results: Array<{ id: string; oldEmotion: string | null; newEmotion: string; newMood: { emoji: string; label: string } }> = []
    const BATCH_SIZE = 5

    for (let i = 0; i < moments.length; i += BATCH_SIZE) {
      const batch = moments.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.allSettled(
        batch.map(async (moment: { id: string; content: string; emotion: string | null }) => {
          const prompt = `Voce e um analista emocional especializado em diarios pessoais. Analise com sensibilidade o seguinte momento:

"${moment.content}"

IMPORTANTE: Identifique a emocao REAL por tras das palavras. Nao use "neutral" a menos que o texto seja genuinamente neutro (ex: lista de compras, dado factual sem emocao). A maioria dos registros de diario contem emocao — identifique-a.

Retorne JSON com:
- mood: objeto com:
  - "emoji": 1 emoji que melhor representa o humor
  - "label": nome da emocao em portugues
  - "value": um destes valores EXATOS: happy, sad, anxious, angry, thoughtful, calm, grateful, tired, inspired, neutral, excited, disappointed, frustrated, loving, scared, determined, sleepy, overwhelmed, confident, confused
- sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
- sentimentScore: -1.0 a 1.0
- emotions: lista de emocoes detectadas (max 3, portugues)
- energyLevel: 0-100

Dica: reflexoes profundas = "thoughtful", desabafos = "frustrated"/"overwhelmed", conquistas = "excited"/"confident", gratidao = "grateful", recordacoes boas = "happy"/"loving".`

          const result = await model.generateContent(prompt)
          const text = result.response.text()

          let parsed: { mood: { emoji: string; label: string; value: string }; sentiment: string; sentimentScore: number; emotions: string[]; energyLevel: number }
          try {
            parsed = extractJSON(text)
          } catch {
            console.warn(`[reanalyze-moments] JSON parse failed for moment ${moment.id}`)
            return null
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
            .eq('user_id', user.id)

          if (updateError) {
            console.error(`[reanalyze-moments] Update failed for ${moment.id}:`, updateError)
            return null
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
          results.push(r.value)
        }
      }

      // Small delay between batches to be nice to rate limits
      if (i + BATCH_SIZE < moments.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const updated = results.filter(r => r.newEmotion !== 'neutral').length

    console.log(`[reanalyze-moments] Done: ${results.length} processed, ${updated} changed from neutral`)

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      updated,
      total_moments: moments.length,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('[reanalyze-moments] Error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
