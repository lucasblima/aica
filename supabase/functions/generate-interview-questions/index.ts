/**
 * Generate Interview Questions — Smart Question Selection & AI Follow-ups
 *
 * Analyzes user profile completion gaps across 6 categories and selects
 * the most relevant unanswered curated questions. When curated questions
 * are exhausted, generates AI follow-up questions based on previous answers.
 *
 * @issue Interviewer Phase 2
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
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
// TYPES
// ============================================================================

type InterviewCategory = 'biografia' | 'anamnese' | 'censo' | 'preferencias' | 'conexoes' | 'objetivos'

interface CategoryCompletion {
  category: InterviewCategory
  total: number
  answered: number
  percentage: number
}

interface QuestionRow {
  id: string
  question_text: string
  question_type: string
  category: string
  config: Record<string, unknown>
  difficulty_level: number
  sort_order: number
  memory_mapping: Record<string, unknown>
}

// ============================================================================
// CATEGORY METADATA (local — cannot import from frontend)
// ============================================================================

const CATEGORY_META: Record<InterviewCategory, { title: string; icon: string; description: string }> = {
  biografia: {
    title: 'Sua Historia',
    icon: '📖',
    description: 'Conte sobre sua trajetoria de vida, familia e origens.',
  },
  anamnese: {
    title: 'Saude & Bem-Estar',
    icon: '🏥',
    description: 'Informacoes sobre saude fisica, mental e habitos.',
  },
  censo: {
    title: 'Dados Demograficos',
    icon: '📊',
    description: 'Informacoes basicas como localizacao, profissao e educacao.',
  },
  preferencias: {
    title: 'Preferencias & Gostos',
    icon: '🎯',
    description: 'Seus interesses, hobbies e preferencias pessoais.',
  },
  conexoes: {
    title: 'Relacionamentos',
    icon: '🤝',
    description: 'Pessoas importantes na sua vida e como se relaciona.',
  },
  objetivos: {
    title: 'Metas & Sonhos',
    icon: '🚀',
    description: 'Seus objetivos de curto, medio e longo prazo.',
  },
}

const ALL_CATEGORIES: InterviewCategory[] = [
  'biografia', 'anamnese', 'censo', 'preferencias', 'conexoes', 'objetivos',
]

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ------------------------------------------------------------------
    // 1. Parse body
    // ------------------------------------------------------------------
    const body = await req.json().catch(() => ({}))
    const requestedCategory: InterviewCategory | undefined = body.category
    const count: number = Math.min(Math.max(body.count || 5, 1), 20)

    // ------------------------------------------------------------------
    // 2. Auth — get user from JWT
    // ------------------------------------------------------------------
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

    // User client — for auth verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // Service client — for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const startTime = Date.now()

    // ------------------------------------------------------------------
    // 3. Fetch answered question IDs for this user
    // ------------------------------------------------------------------
    const { data: answeredRows, error: answeredError } = await supabase
      .from('interviewer_responses')
      .select('question_id')
      .eq('user_id', userId)

    if (answeredError) {
      console.error('[GENERATE-QUESTIONS] Failed to fetch answered questions:', answeredError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch user responses' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const answeredIds = new Set((answeredRows || []).map(r => r.question_id))
    const totalAnswered = answeredIds.size

    // ------------------------------------------------------------------
    // 4. Analyze completion per category
    // ------------------------------------------------------------------
    const completions: CategoryCompletion[] = []

    for (const cat of ALL_CATEGORIES) {
      // Total curated questions for this category
      const { count: totalCount, error: totalErr } = await supabase
        .from('interviewer_questions')
        .select('id', { count: 'exact', head: true })
        .eq('category', cat)
        .eq('is_curated', true)

      if (totalErr) {
        console.warn(`[GENERATE-QUESTIONS] Error counting ${cat}:`, totalErr)
        completions.push({ category: cat, total: 0, answered: 0, percentage: 0 })
        continue
      }

      const total = totalCount || 0

      // Get curated question IDs for this category to check which were answered
      const { data: catQuestionRows, error: catQErr } = await supabase
        .from('interviewer_questions')
        .select('id')
        .eq('category', cat)
        .eq('is_curated', true)

      if (catQErr || !catQuestionRows) {
        completions.push({ category: cat, total, answered: 0, percentage: 0 })
        continue
      }

      const catQuestionIds = catQuestionRows.map(q => q.id)
      const answered = catQuestionIds.filter(id => answeredIds.has(id)).length
      const percentage = total > 0 ? (answered / total) * 100 : 0

      completions.push({ category: cat, total, answered, percentage })
    }

    // ------------------------------------------------------------------
    // 5. Pick category: if provided use it, else pick lowest completion %
    // ------------------------------------------------------------------
    let selectedCategory: InterviewCategory

    if (requestedCategory && ALL_CATEGORIES.includes(requestedCategory)) {
      selectedCategory = requestedCategory
    } else {
      // Sort by percentage ascending, then by total descending (prefer categories with more questions)
      completions.sort((a, b) => {
        if (a.percentage !== b.percentage) return a.percentage - b.percentage
        return b.total - a.total
      })
      selectedCategory = completions[0].category
    }

    const catCompletion = completions.find(c => c.category === selectedCategory)!
    const meta = CATEGORY_META[selectedCategory]

    // ------------------------------------------------------------------
    // 6. Select unanswered curated questions for that category
    // ------------------------------------------------------------------
    const { data: availableQuestions, error: questionsError } = await supabase
      .from('interviewer_questions')
      .select('id, question_text, question_type, category, config, difficulty_level, sort_order, memory_mapping')
      .eq('category', selectedCategory)
      .eq('is_curated', true)
      .order('sort_order', { ascending: true })
      .order('difficulty_level', { ascending: true })

    if (questionsError) {
      console.error('[GENERATE-QUESTIONS] Failed to fetch questions:', questionsError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter out already-answered ones
    const unanswered = (availableQuestions || []).filter(
      (q: QuestionRow) => !answeredIds.has(q.id)
    )

    let selectedQuestions: QuestionRow[] = unanswered.slice(0, count)
    let source: 'curated' | 'mixed' | 'ai_generated' = 'curated'

    // ------------------------------------------------------------------
    // 7. AI follow-up generation if curated questions are insufficient
    // ------------------------------------------------------------------
    if (selectedQuestions.length < count && totalAnswered >= 5) {
      const needed = count - selectedQuestions.length

      try {
        // Fetch last 10 answers with question text for context
        const { data: recentResponses } = await supabase
          .from('interviewer_responses')
          .select('answer_text, question_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)

        // Get question texts for context
        const recentQuestionIds = (recentResponses || []).map(r => r.question_id)
        const { data: recentQuestions } = await supabase
          .from('interviewer_questions')
          .select('id, question_text')
          .in('id', recentQuestionIds)

        const questionMap = new Map(
          (recentQuestions || []).map(q => [q.id, q.question_text])
        )

        const contextPairs = (recentResponses || []).map(r => ({
          pergunta: questionMap.get(r.question_id) || 'Pergunta desconhecida',
          resposta: r.answer_text || JSON.stringify(r.answer_text),
        }))

        const aiPrompt = `Voce e um entrevistador empatico do AICA Life OS. Baseado nas respostas anteriores do usuario, gere ${needed} perguntas de follow-up relevantes para a categoria '${selectedCategory}'.

CONTEXTO — Respostas recentes do usuario:
${JSON.stringify(contextPairs, null, 2)}

CATEGORIA: ${selectedCategory} — ${meta.description}

REGRAS:
- Perguntas devem ser em portugues brasileiro
- Aprofunde temas que o usuario ja mencionou
- Nao repita perguntas ja feitas
- Varie entre tipos: free_text, single_choice, scale
- Dificuldade: 2 (intermediario) ou 3 (profundo)

Responda APENAS em JSON valido:
{
  "questions": [
    {
      "question_text": "string — a pergunta em portugues",
      "question_type": "free_text" | "single_choice" | "scale",
      "config": {},
      "difficulty_level": 2 | 3
    }
  ]
}`

        const aiResult = await withHealthTracking(
          { functionName: 'generate-interview-questions', actionName: 'generate_followup' },
          supabase,
          () => callAI({
            prompt: aiPrompt,
            complexity: 'low',
            expectJson: true,
            temperature: 0.7,
            maxOutputTokens: 4096,
          })
        )

        const parsed = extractJSON<{ questions: Array<{
          question_text: string
          question_type: string
          config: Record<string, unknown>
          difficulty_level: number
        }> }>(aiResult.text)

        if (parsed.questions && parsed.questions.length > 0) {
          const generatedQuestions: QuestionRow[] = []

          for (const genQ of parsed.questions.slice(0, needed)) {
            // Validate question_type
            const validTypes = ['free_text', 'long_text', 'single_choice', 'multi_choice', 'scale', 'date', 'ranked_list']
            const qType = validTypes.includes(genQ.question_type) ? genQ.question_type : 'free_text'
            const diffLevel = [1, 2, 3].includes(genQ.difficulty_level) ? genQ.difficulty_level : 2

            const { data: inserted, error: insertErr } = await supabase
              .from('interviewer_questions')
              .insert({
                question_text: genQ.question_text,
                question_type: qType,
                category: selectedCategory,
                config: genQ.config || {},
                target_modules: [],
                memory_mapping: { source: 'ai_generated', parent_category: selectedCategory },
                difficulty_level: diffLevel,
                is_curated: false,
                sort_order: 9000 + generatedQuestions.length,
              })
              .select('id, question_text, question_type, category, config, difficulty_level, sort_order, memory_mapping')
              .single()

            if (!insertErr && inserted) {
              generatedQuestions.push(inserted as QuestionRow)
            } else {
              console.warn('[GENERATE-QUESTIONS] Failed to insert AI question:', insertErr)
            }
          }

          if (generatedQuestions.length > 0) {
            selectedQuestions = [...selectedQuestions, ...generatedQuestions]
            // Curated questions selected earlier + AI generated = mixed
            const hasCurated = unanswered.slice(0, count).length > 0
            source = hasCurated ? 'mixed' : 'ai_generated'
          }
        }

        // Fire-and-forget usage tracking
        supabase.rpc('log_interaction', {
          p_user_id: userId,
          p_action: 'generate_interview_followup',
          p_module: 'interviewer',
          p_model: aiResult.model,
          p_tokens_in: aiResult.tokens.input,
          p_tokens_out: aiResult.tokens.output,
        }).then(() => {
          console.log('[generate-interview-questions] Logged AI interaction')
        }).catch((err: unknown) => {
          console.warn('[generate-interview-questions] Failed to log interaction:', err)
        })

      } catch (aiError) {
        console.error('[GENERATE-QUESTIONS] AI follow-up generation failed:', aiError)
        // Continue with whatever curated questions we have
      }
    }

    // ------------------------------------------------------------------
    // 8. Create interviewer_session
    // ------------------------------------------------------------------
    const questionIds = selectedQuestions.map(q => q.id)

    const { data: session, error: sessionError } = await supabase
      .from('interviewer_sessions')
      .insert({
        user_id: userId,
        category: selectedCategory,
        title: meta.title,
        icon: meta.icon,
        description: meta.description,
        question_ids: questionIds,
        total_questions: questionIds.length,
        answered_count: 0,
        completion_percentage: 0,
        status: 'not_started',
      })
      .select('id')
      .single()

    if (sessionError) {
      console.error('[GENERATE-QUESTIONS] Failed to create session:', sessionError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create interview session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const processingTime = Date.now() - startTime

    // ------------------------------------------------------------------
    // 9. Return response
    // ------------------------------------------------------------------
    const responseQuestions = selectedQuestions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      category: q.category,
      config: q.config,
      difficulty_level: q.difficulty_level,
      sort_order: q.sort_order,
    }))

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        category: selectedCategory,
        questions: responseQuestions,
        total: responseQuestions.length,
        source,
        completion: {
          category: selectedCategory,
          answered: catCompletion.answered,
          total: catCompletion.total,
          percentage: Math.round(catCompletion.percentage * 100) / 100,
        },
        all_categories: completions.map(c => ({
          category: c.category,
          title: CATEGORY_META[c.category].title,
          answered: c.answered,
          total: c.total,
          percentage: Math.round(c.percentage * 100) / 100,
        })),
        metadata: {
          processing_time_ms: processingTime,
          total_user_answers: totalAnswered,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[GENERATE-QUESTIONS] Unhandled error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
