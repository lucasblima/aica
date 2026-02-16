/**
 * Process Interview Response — Deterministic Memory Routing + AI Insight Extraction
 *
 * Handles user answers to interviewer questions:
 * 1. Saves response to interviewer_responses
 * 2. Deterministic routing: maps structured answers to user_memory via memory_mapping
 * 3. AI extraction: for long_text/free_text, extracts additional insights via Gemini
 * 4. Embedding generation: creates vector embedding for semantic search
 * 5. Awards consciousness points (CP)
 * 6. Updates session progress
 *
 * @issue Interviewer System Phase 2
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { getCorsHeaders } from "../_shared/cors.ts"
import { callAI, extractJSON } from "../_shared/model-router.ts"
import { withHealthTracking } from "../_shared/health-tracker.ts"

// ============================================================================
// TYPES
// ============================================================================

interface RequestBody {
  question_id: string
  session_id: string | null
  answer: Record<string, unknown>
  answer_text: string | null
}

interface MemoryMapping {
  category: string
  key: string
  module: string | null
}

interface InsightResult {
  insights: string[]
  themes: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
}

// ============================================================================
// AI PROMPT
// ============================================================================

const EXTRACT_INSIGHTS_PROMPT = `Voce e um analista de perfil pessoal. Extraia insights estruturados desta resposta de entrevista.

PERGUNTA: {question}
RESPOSTA: {answer}

Identifique:
1. Insights concretos sobre a pessoa (fatos, preferencias, valores)
2. Temas recorrentes ou importantes
3. Sentimento geral da resposta

Responda APENAS em JSON valido:
{
  "insights": ["string - cada insight como frase curta"],
  "themes": ["string - temas identificados"],
  "sentiment": "positive | neutral | negative"
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
    // =====================================================================
    // STEP 0: Authenticate user via JWT
    // =====================================================================

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Auth client to verify the user's JWT
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await authClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // Service role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // =====================================================================
    // STEP 1: Parse and validate request body
    // =====================================================================

    const body: RequestBody = await req.json()
    const { question_id, session_id, answer, answer_text } = body

    if (!question_id || !answer) {
      return new Response(
        JSON.stringify({ success: false, error: 'question_id and answer are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =====================================================================
    // STEP 2: Fetch the question from interviewer_questions
    // =====================================================================

    const { data: question, error: questionError } = await supabase
      .from('interviewer_questions')
      .select('id, question_text, question_type, category, memory_mapping, target_modules, config')
      .eq('id', question_id)
      .single()

    if (questionError || !question) {
      return new Response(
        JSON.stringify({ success: false, error: 'Question not found', details: questionError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const startTime = Date.now()

    // =====================================================================
    // STEP 3: Insert into interviewer_responses (upsert on unique constraint)
    // =====================================================================

    const { data: response, error: insertError } = await supabase
      .from('interviewer_responses')
      .upsert({
        user_id: userId,
        session_id: session_id || null,
        question_id,
        answer,
        answer_text: answer_text || null,
        cp_earned: 5,
        routed_to_memory: false,
        routed_modules: question.target_modules || [],
      }, { onConflict: 'user_id,question_id' })
      .select('id')
      .single()

    if (insertError) {
      console.error('[PROCESS-INTERVIEW] Insert error:', insertError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save response', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const responseId = response.id

    // =====================================================================
    // STEP 4: Deterministic memory routing from memory_mapping
    // =====================================================================

    const memoryMapping = question.memory_mapping as MemoryMapping | null
    let insightsExtracted = 0

    if (memoryMapping && memoryMapping.key) {
      // Build the value based on question type
      let memoryValue: Record<string, unknown>

      if (question.question_type === 'scale') {
        memoryValue = { value: answer, updated_from: 'interview' }
      } else if (question.question_type === 'multi_choice' || question.question_type === 'ranked_list') {
        memoryValue = { items: answer, updated_from: 'interview' }
      } else if (answer_text) {
        memoryValue = { text: answer_text, raw_answer: answer, updated_from: 'interview' }
      } else {
        memoryValue = { value: answer, updated_from: 'interview' }
      }

      const { error: memoryError } = await supabase
        .from('user_memory')
        .upsert({
          user_id: userId,
          category: memoryMapping.category || 'fact',
          module: memoryMapping.module || null,
          key: memoryMapping.key,
          value: memoryValue,
          source: 'interview',
          confidence: 1.0,
        }, { onConflict: 'user_id,category,key,module' })

      if (memoryError) {
        console.warn('[PROCESS-INTERVIEW] Memory upsert error:', memoryError.message)
      } else {
        insightsExtracted++
      }
    }

    // =====================================================================
    // STEP 5: AI extraction for long_text and free_text
    // =====================================================================

    if (
      (question.question_type === 'long_text' || question.question_type === 'free_text') &&
      answer_text &&
      answer_text.length > 20
    ) {
      try {
        const aiResult = await withHealthTracking(
          { functionName: 'process-interview-response', actionName: 'extract_insights' },
          supabase,
          () => callAI({
            prompt: EXTRACT_INSIGHTS_PROMPT
              .replace('{question}', question.question_text)
              .replace('{answer}', answer_text),
            complexity: 'low',
            expectJson: true,
            temperature: 0.2,
            maxOutputTokens: 4096,
          })
        )

        let insights: InsightResult
        try {
          insights = extractJSON<InsightResult>(aiResult.text)
        } catch {
          insights = { insights: [], themes: [], sentiment: 'neutral' }
        }

        // Upsert extracted insights as additional user_memory entries
        if (insights.insights && insights.insights.length > 0) {
          for (const insight of insights.insights.slice(0, 5)) {
            const insightKey = `${memoryMapping?.key || question.category}_insight_${insightsExtracted}`
            const { error: insightError } = await supabase
              .from('user_memory')
              .upsert({
                user_id: userId,
                category: 'insight',
                module: memoryMapping?.module || null,
                key: insightKey,
                value: {
                  text: insight,
                  themes: insights.themes,
                  sentiment: insights.sentiment,
                  source_question: question_id,
                  updated_from: 'interview_ai',
                },
                source: 'inferred',
                confidence: 0.8,
              }, { onConflict: 'user_id,category,key,module' })

            if (!insightError) {
              insightsExtracted++
            } else {
              console.warn('[PROCESS-INTERVIEW] Insight upsert error:', insightError.message)
            }
          }
        }

        // Fire-and-forget usage tracking for AI call
        supabase.rpc('log_interaction', {
          p_user_id: userId,
          p_action: 'interview_extract_insights',
          p_module: 'journey',
          p_model: aiResult.model,
          p_tokens_in: aiResult.tokens.input,
          p_tokens_out: aiResult.tokens.output,
        }).then(() => {
          console.log('[PROCESS-INTERVIEW] Logged AI interaction')
        }).catch((err: unknown) => {
          console.warn('[PROCESS-INTERVIEW] Failed to log interaction:', err)
        })

      } catch (aiError) {
        // AI extraction is non-critical; log and continue
        console.warn('[PROCESS-INTERVIEW] AI extraction failed:', aiError)
      }
    }

    // =====================================================================
    // STEP 6: Generate embedding if answer_text > 10 chars
    // =====================================================================

    if (answer_text && answer_text.length > 10) {
      try {
        const apiKey = Deno.env.get('GEMINI_API_KEY')!
        const embeddingResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/text-embedding-004',
              content: { parts: [{ text: answer_text }] },
            }),
          }
        )

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json()
          const embedding = embeddingData.embedding?.values

          if (embedding && Array.isArray(embedding)) {
            const { error: embeddingError } = await supabase
              .from('interviewer_responses')
              .update({ embedding: JSON.stringify(embedding) })
              .eq('id', responseId)

            if (embeddingError) {
              console.warn('[PROCESS-INTERVIEW] Embedding update error:', embeddingError.message)
            }
          }
        } else {
          console.warn('[PROCESS-INTERVIEW] Embedding API error:', embeddingResponse.status)
        }
      } catch (embError) {
        // Embedding is non-critical; log and continue
        console.warn('[PROCESS-INTERVIEW] Embedding generation failed:', embError)
      }
    }

    // =====================================================================
    // STEP 7: Award consciousness points
    // =====================================================================

    let cpResult = null
    try {
      const { data: cpData, error: cpError } = await supabase.rpc('award_consciousness_points', {
        p_user_id: userId,
        p_points: 5,
        p_reason: 'interview_response',
        p_reference_id: responseId,
        p_reference_type: 'interviewer_response',
      })

      if (cpError) {
        console.warn('[PROCESS-INTERVIEW] CP award error:', cpError.message)
      } else {
        cpResult = cpData
      }
    } catch (cpErr) {
      console.warn('[PROCESS-INTERVIEW] CP award failed:', cpErr)
    }

    // =====================================================================
    // STEP 8: Update session progress if session_id provided
    // =====================================================================

    if (session_id) {
      try {
        // Get current session
        const { data: session } = await supabase
          .from('interviewer_sessions')
          .select('total_questions, answered_count, cp_earned')
          .eq('id', session_id)
          .eq('user_id', userId)
          .single()

        if (session) {
          const newAnswered = (session.answered_count || 0) + 1
          const totalQ = session.total_questions || 1
          const newPercentage = Math.min(100, Math.round((newAnswered / totalQ) * 10000) / 100)
          const newStatus = newAnswered >= totalQ ? 'completed' : 'in_progress'
          const newCp = (session.cp_earned || 0) + 5

          await supabase
            .from('interviewer_sessions')
            .update({
              answered_count: newAnswered,
              completion_percentage: newPercentage,
              status: newStatus,
              cp_earned: newCp,
            })
            .eq('id', session_id)
            .eq('user_id', userId)
        }
      } catch (sessionErr) {
        console.warn('[PROCESS-INTERVIEW] Session update failed:', sessionErr)
      }
    }

    // =====================================================================
    // STEP 9: Mark response as routed_to_memory
    // =====================================================================

    await supabase
      .from('interviewer_responses')
      .update({
        routed_to_memory: true,
        routed_modules: question.target_modules || [],
      })
      .eq('id', responseId)

    // =====================================================================
    // RESPONSE
    // =====================================================================

    const processingTime = Date.now() - startTime

    return new Response(
      JSON.stringify({
        success: true,
        response_id: responseId,
        cp_earned: 5,
        cp_result: cpResult,
        insights_extracted: insightsExtracted,
        processing_time_ms: processingTime,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[PROCESS-INTERVIEW] Unhandled error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
