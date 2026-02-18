/**
 * Build User Profile — Cross-Module Profile Aggregation & AI Scoring
 *
 * Aggregates data from all 8 AICA modules, computes 8 dimension scores (0-1),
 * generates an AI narrative in Portuguese, and stores the daily profile snapshot.
 *
 * Trigger modes:
 * - Cron (daily 06:30 BRT): builds for all active users
 * - On-demand: builds for a single user (JWT-authenticated)
 *
 * Uses raw fetch to Gemini REST API (NOT @google/genai SDK).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
// JSON EXTRACTION (robust, handles code fences + preamble)
// ============================================================================

function extractJSON<T = unknown>(text: string): T {
  try {
    return JSON.parse(text)
  } catch {
    // Continue
  }

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {
      // Continue
    }
  }

  const objectMatch = text.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0])
    } catch {
      // Continue
    }
  }

  throw new Error(`Failed to extract JSON from AI response: ${text.substring(0, 200)}...`)
}

// ============================================================================
// GEMINI RAW FETCH (no SDK — uses REST API directly)
// ============================================================================

interface GeminiResponse {
  text: string
  tokensIn: number
  tokensOut: number
  model: string
}

async function callGeminiRaw(prompt: string, apiKey: string): Promise<GeminiResponse> {
  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()

  // Filter out thought parts, extract only text parts
  const parts = data.candidates?.[0]?.content?.parts || []
  const textParts = parts.filter((p: { thought?: boolean; text?: string }) => !p.thought && p.text)
  const text = textParts.map((p: { text: string }) => p.text).join('')

  const usage = data.usageMetadata || {}

  return {
    text,
    tokensIn: usage.promptTokenCount ?? 0,
    tokensOut: usage.candidatesTokenCount ?? 0,
    model,
  }
}

// ============================================================================
// SCORING PROMPT
// ============================================================================

function buildScoringPrompt(context: Record<string, unknown>): string {
  return `Voce e um analista de perfil pessoal. Com base nos dados agregados do usuario,
atribua uma pontuacao de 0.0 a 1.0 para cada dimensao e gere uma narrativa.

DADOS AGREGADOS:
${JSON.stringify(context, null, 2)}

Para cada dimensao, calcule baseado nos sinais:
- emotional_intelligence: diversidade emocional (emotion_diversity), frequencia de reflexoes (moments_7d/30d), tendencia de sentimento (avg_quality), padrao emocional do conselho (philosopher_pattern)
- productivity: taxa de conclusao (completion_rate), foco Q2 Eisenhower (priority_distribution.q2), tarefas completadas recentes (completed_7d), alerta de sobrecarga
- financial_awareness: % categorizacao (categorized_pct), tracking de recorrentes (recurring_count), razao receita/despesa (income_30d vs expense_30d)
- social_connectivity: tamanho da rede (total_contacts), dossiers criados (contacts_with_dossier), threads ativas (active_threads_7d)
- creativity: conteudo produzido (total_episodes), frequencia de episodios (episodes_30d), shows ativos (total_shows)
- physical_wellness: consistencia de treinos (workouts_7d), sinais do biohacker (biohacker_sleep), atletas gerenciados (total_athletes)
- knowledge_growth: momentos de aprendizado (tags com #aprendizado), nivel de consciencia (consciousness.level), total de pontos, qualidade dos registros
- digital_organization: se nao houver dados Google, atribuir 0.0

REGRAS:
- Se um modulo nao tem dados (valores zerados), a dimensao correspondente deve ser 0.0 a 0.1
- Nunca invente dados. Se o contexto esta vazio, a pontuacao e baixa
- Arredonde para 2 casas decimais
- A narrativa deve ter 2-3 paragrafos em portugues brasileiro, tom observador e acolhedor
- NAO seja generico. Mencione dados concretos (numeros de tarefas, emocoes dominantes, streaks)

Responda APENAS em JSON valido:
{
  "dimensions": {
    "emotional_intelligence": 0.00,
    "productivity": 0.00,
    "financial_awareness": 0.00,
    "social_connectivity": 0.00,
    "creativity": 0.00,
    "physical_wellness": 0.00,
    "knowledge_growth": 0.00,
    "digital_organization": 0.00
  },
  "narrative": "string - 2-3 paragrafos em portugues brasileiro",
  "wellness_trend": "thriving | balanced | strained | burnout_risk",
  "biggest_growth": "dimension_name ou null",
  "biggest_decline": "dimension_name ou null"
}`
}

// ============================================================================
// BUILD PROFILE FOR SINGLE USER
// ============================================================================

interface ProfileResult {
  success: boolean
  userId: string
  error?: string
  dimensions?: Record<string, number>
  processingTimeMs?: number
}

async function buildProfileForUser(
  userId: string,
  supabaseClient: ReturnType<typeof createClient>,
  apiKey: string,
): Promise<ProfileResult> {
  const startTime = Date.now()

  try {
    // Step 1: Gather aggregation context from all modules (single RPC)
    const { data: context, error: contextError } = await supabaseClient
      .rpc('get_profile_aggregation_context', { p_user_id: userId })

    if (contextError) {
      console.error(`[BUILD-PROFILE] Context error for ${userId}:`, contextError)
      return { success: false, userId, error: `Context fetch failed: ${contextError.message}` }
    }

    if (!context) {
      return { success: false, userId, error: 'No context returned' }
    }

    // Step 2: Call Gemini to score dimensions + generate narrative
    const prompt = buildScoringPrompt(context)
    const geminiResult = await callGeminiRaw(prompt, apiKey)

    let parsed: {
      dimensions: Record<string, number>
      narrative: string
      wellness_trend: string
      biggest_growth: string | null
      biggest_decline: string | null
    }

    try {
      parsed = extractJSON(geminiResult.text)
    } catch {
      console.error(`[BUILD-PROFILE] JSON parse failed for ${userId}:`, geminiResult.text.substring(0, 300))
      return { success: false, userId, error: 'Failed to parse AI response' }
    }

    // Step 3: Validate and clamp dimension scores
    const dims = parsed.dimensions || {}
    const dimKeys = [
      'emotional_intelligence', 'productivity', 'financial_awareness',
      'social_connectivity', 'creativity', 'physical_wellness',
      'knowledge_growth', 'digital_organization',
    ]

    const clampedDims: Record<string, number> = {}
    for (const key of dimKeys) {
      const val = parseFloat(String(dims[key] ?? 0))
      clampedDims[key] = Math.max(0, Math.min(1, isNaN(val) ? 0 : Math.round(val * 1000) / 1000))
    }

    // Validate wellness_trend
    const validTrends = ['thriving', 'balanced', 'strained', 'burnout_risk']
    const wellnessTrend = validTrends.includes(parsed.wellness_trend)
      ? parsed.wellness_trend
      : 'balanced'

    const processingTime = Date.now() - startTime
    const today = new Date().toISOString().split('T')[0]

    // Step 4: Upsert snapshot
    const { error: snapshotError } = await supabaseClient
      .from('user_profile_snapshots')
      .upsert({
        user_id: userId,
        snapshot_date: today,
        stats: context,
        narrative: parsed.narrative || null,
        wellness_trend: wellnessTrend,
        is_public: false, // Default; preserves existing value on conflict
        model_used: geminiResult.model,
        processing_time_ms: processingTime,
      }, { onConflict: 'user_id,snapshot_date', ignoreDuplicates: false })

    if (snapshotError) {
      console.error(`[BUILD-PROFILE] Snapshot save error for ${userId}:`, snapshotError)
      return { success: false, userId, error: `Snapshot save failed: ${snapshotError.message}` }
    }

    // Step 5: Build dimension vector and upsert dimensions
    const dimensionVector = `[${dimKeys.map(k => clampedDims[k]).join(',')}]`

    const { error: dimsError } = await supabaseClient
      .from('user_profile_dimensions')
      .upsert({
        user_id: userId,
        snapshot_date: today,
        ...clampedDims,
        dimension_vector: dimensionVector,
        biggest_growth: parsed.biggest_growth || null,
        biggest_decline: parsed.biggest_decline || null,
      }, { onConflict: 'user_id,snapshot_date', ignoreDuplicates: false })

    if (dimsError) {
      console.error(`[BUILD-PROFILE] Dimensions save error for ${userId}:`, dimsError)
      return { success: false, userId, error: `Dimensions save failed: ${dimsError.message}` }
    }

    // Step 6: Log interaction (fire-and-forget)
    supabaseClient.rpc('log_interaction', {
      p_user_id: userId,
      p_action: 'build_profile',
      p_module: 'profile',
      p_model: geminiResult.model,
      p_tokens_in: geminiResult.tokensIn,
      p_tokens_out: geminiResult.tokensOut,
    }).then(() => {
      console.log(`[BUILD-PROFILE] Logged interaction for ${userId}`)
    }).catch((err: Error) => {
      console.warn(`[BUILD-PROFILE] Failed to log interaction: ${err.message}`)
    })

    return {
      success: true,
      userId,
      dimensions: clampedDims,
      processingTimeMs: processingTime,
    }
  } catch (err) {
    console.error(`[BUILD-PROFILE] Error for ${userId}:`, err)
    return {
      success: false,
      userId,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const apiKey = Deno.env.get('GEMINI_API_KEY')!

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // =====================================================================
    // MODE 1: Build for all active users (cron mode)
    // =====================================================================
    if (body.action === 'build_all_profiles' || (!body.userId && !body.payload?.userId)) {
      console.log('[BUILD-PROFILE] Cron mode: building profiles for all active users')

      // Get active users (signed in within last 7 days)
      const { data: users, error: usersError } = await supabaseClient
        .from('auth.users' as string)
        .select('id')

      // Fallback: use direct SQL if the above doesn't work
      let userIds: string[] = []

      if (usersError || !users) {
        const { data: sqlUsers } = await supabaseClient.rpc('get_profile_aggregation_context', { p_user_id: '00000000-0000-0000-0000-000000000000' })
        // In cron mode via trigger_edge_function_for_users, each user is called individually
        // So this branch is only hit for direct build_all_profiles calls
        console.warn('[BUILD-PROFILE] Cannot list users directly. Use trigger_edge_function_for_users() for cron.')
        return new Response(
          JSON.stringify({
            success: false,
            error: 'build_all_profiles requires trigger_edge_function_for_users(). Send individual userId instead.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        userIds = users.map((u: { id: string }) => u.id)
      }

      const results: ProfileResult[] = []
      for (const uid of userIds) {
        const result = await buildProfileForUser(uid, supabaseClient, apiKey)
        results.push(result)
        // Small delay between users to avoid rate limiting
        if (userIds.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      return new Response(
        JSON.stringify({
          success: true,
          summary: {
            total_users: results.length,
            successful,
            failed,
          },
          results: results.map(r => ({
            userId: r.userId,
            success: r.success,
            error: r.error,
            processingTimeMs: r.processingTimeMs,
          })),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =====================================================================
    // MODE 2: Build for single user (on-demand or cron per-user)
    // =====================================================================
    const userId = body.userId || body.payload?.userId

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[BUILD-PROFILE] Building profile for user ${userId}`)

    const result = await buildProfileForUser(userId, supabaseClient, apiKey)

    return new Response(
      JSON.stringify({
        success: result.success,
        ...(result.error ? { error: result.error } : {}),
        ...(result.dimensions ? {
          profile: {
            userId: result.userId,
            dimensions: result.dimensions,
            processingTimeMs: result.processingTimeMs,
          }
        } : {}),
      }),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('[BUILD-PROFILE] Unhandled error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
