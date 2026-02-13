/**
 * Synthesize User Patterns — Weekly Recursive Memory
 *
 * Runs weekly (Sunday 23:00 BRT) to compare the week's data
 * against known patterns, updating confidence scores and
 * discovering new behavioral patterns.
 *
 * Adapted from OpenClaw's Memory System (cron-based synthesis).
 *
 * @see docs/OPENCLAW_ADAPTATION.md Section 2
 * @issue #255
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"
import { callAI, extractJSON } from "../_shared/model-router.ts"
import { withHealthTracking } from "../_shared/health-tracker.ts"

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
// SYNTHESIS PROMPT
// ============================================================================

const SYNTHESIS_PROMPT = `Voce e um analista comportamental especializado em padroes de vida. Compare os dados desta semana com os padroes conhecidos do usuario.

DADOS DA SEMANA (insights diarios do Conselho de Vida):
{council_insights}

RESUMO SEMANAL DO JOURNEY:
{weekly_summary}

PADROES ATUAIS CONHECIDOS (com confidence_score):
{existing_patterns}

Para cada padrao existente:
1. Se CONFIRMADO esta semana (evidencia nos dados): incremente confidence em +0.10 (max 1.0), adicione nova evidencia
2. Se CONTRADITO esta semana (dados mostram oposto): decremente confidence em -0.15
3. Se NAO MENCIONADO: nao altere (manter como esta)

Identifique NOVOS padroes que surgiram esta semana (nao existem nos padroes atuais).
Categorias validas: productivity, emotional, routine, social, health, learning, trigger, strength

Responda APENAS em JSON valido:
{
  "updates": [
    {
      "pattern_key": "string - chave do padrao existente",
      "confidence_delta": 0.10,
      "new_evidence": "string - nova evidencia observada esta semana"
    }
  ],
  "new_patterns": [
    {
      "pattern_type": "productivity | emotional | routine | social | health | learning | trigger | strength",
      "pattern_key": "string - chave unica em snake_case (ex: morning_meetings_block_exercise)",
      "description": "string - descricao do padrao em portugues",
      "evidence": ["string - evidencias que suportam este padrao"]
    }
  ],
  "deactivations": ["string - pattern_key de padroes contraditos com confidence < 0.20"]
}`

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
    const userId = body.userId

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const startTime = Date.now()

    // =====================================================================
    // STEP 1: Gather weekly context
    // =====================================================================

    const { data: context, error: contextError } = await supabaseClient
      .rpc('get_weekly_synthesis_context', { p_user_id: userId })

    if (contextError) {
      console.error('[SYNTHESIZE-PATTERNS] Context error:', contextError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch context', details: contextError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const councilCount = context?.council_count || 0
    if (councilCount === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'insufficient_data',
          message: 'Nenhum insight do Conselho de Vida encontrado esta semana. Gere pelo menos 1 insight diario primeiro.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =====================================================================
    // STEP 2: AI Synthesis (Gemini Pro)
    // =====================================================================

    const synthesisResult = await withHealthTracking(
      { functionName: 'synthesize-user-patterns', actionName: 'weekly_synthesis' },
      supabaseClient,
      () => callAI({
        prompt: SYNTHESIS_PROMPT
          .replace('{council_insights}', JSON.stringify(context.council_insights, null, 2))
          .replace('{weekly_summary}', JSON.stringify(context.weekly_summary, null, 2))
          .replace('{existing_patterns}', JSON.stringify(context.existing_patterns, null, 2)),
        complexity: 'high',
        expectJson: true,
        temperature: 0.4,
      })
    )

    let synthesis
    try {
      synthesis = extractJSON<{
        updates: Array<{ pattern_key: string; confidence_delta: number; new_evidence: string }>
        new_patterns: Array<{ pattern_type: string; pattern_key: string; description: string; evidence: string[] }>
        deactivations: string[]
      }>(synthesisResult.text)
    } catch {
      synthesis = { updates: [], new_patterns: [], deactivations: [] }
    }

    // =====================================================================
    // STEP 3: Apply changes to user_patterns
    // =====================================================================

    let updatedCount = 0
    let createdCount = 0
    let deactivatedCount = 0

    // 3a. Update existing patterns (confidence delta + evidence)
    for (const update of (synthesis.updates || [])) {
      const { error } = await supabaseClient.rpc('apply_pattern_update', {
        p_user_id: userId,
        p_pattern_key: update.pattern_key,
        p_confidence_delta: Math.max(-0.3, Math.min(0.2, update.confidence_delta)),
        p_new_evidence: update.new_evidence,
      })
      if (!error) updatedCount++
    }

    // 3b. Create new patterns
    const apiKey = Deno.env.get('GEMINI_API_KEY')!
    const genAI = new GoogleGenerativeAI(apiKey)
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

    for (const newPattern of (synthesis.new_patterns || [])) {
      // Generate embedding for the pattern description
      let embedding = null
      try {
        const embResult = await embeddingModel.embedContent(newPattern.description)
        embedding = embResult.embedding.values
      } catch (e) {
        console.warn(`[SYNTHESIZE-PATTERNS] Embedding failed for ${newPattern.pattern_key}:`, e)
      }

      const { error } = await supabaseClient
        .from('user_patterns')
        .upsert({
          user_id: userId,
          pattern_type: newPattern.pattern_type,
          pattern_key: newPattern.pattern_key,
          description: newPattern.description,
          evidence: newPattern.evidence || [],
          confidence_score: 0.50,
          embedding,
          is_active: true,
        }, { onConflict: 'user_id,pattern_key' })

      if (!error) createdCount++
    }

    // 3c. Deactivate patterns below threshold
    for (const patternKey of (synthesis.deactivations || [])) {
      const { error } = await supabaseClient
        .from('user_patterns')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('pattern_key', patternKey)

      if (!error) deactivatedCount++
    }

    // =====================================================================
    // RESPONSE
    // =====================================================================

    const processingTime = Date.now() - startTime

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          patterns_updated: updatedCount,
          patterns_created: createdCount,
          patterns_deactivated: deactivatedCount,
          council_insights_analyzed: councilCount,
          existing_patterns_count: context?.patterns_count || 0,
        },
        details: {
          updates: synthesis.updates,
          new_patterns: synthesis.new_patterns?.map((p: { pattern_key: string; pattern_type: string; description: string }) => ({
            pattern_key: p.pattern_key,
            pattern_type: p.pattern_type,
            description: p.description,
          })),
          deactivations: synthesis.deactivations,
        },
        metadata: {
          model: synthesisResult.model,
          tokens: synthesisResult.tokens,
          processing_time_ms: processingTime,
          was_escalated: synthesisResult.wasEscalated,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[SYNTHESIZE-PATTERNS] Unhandled error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
