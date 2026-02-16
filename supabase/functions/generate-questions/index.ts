/**
 * Generate Questions Edge Function
 *
 * Generates personalized questions using Gemini AI based on user context.
 * Called when user runs low on unanswered questions.
 *
 * @module supabase/functions/generate-questions
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

// =============================================================================
// ENVIRONMENT & CONFIGURATION
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

const GEMINI_MODEL = 'gemini-2.5-flash'

// Generation configuration
const CONFIG = {
  MIN_UNANSWERED_THRESHOLD: 3,
  MAX_DAILY_GENERATIONS: 2,
  MIN_HOURS_BETWEEN_GENERATIONS: 12,
  DEFAULT_BATCH_SIZE: 5,
  MAX_BATCH_SIZE: 20,
  MAX_USER_QUESTIONS: 100,
}

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aica-staging-5562559893.southamerica-east1.run.app',
  'https://aica-5562559893.southamerica-east1.run.app',
  'https://dev.aica.guru',
  'https://aica.guru',
]

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }
}

// =============================================================================
// TYPES
// =============================================================================

type QuestionCategory = 'reflection' | 'gratitude' | 'energy' | 'learning' | 'change'

interface GenerateQuestionsRequest {
  batch_size?: number
  force_regenerate?: boolean
  categories?: QuestionCategory[]
}

interface GeneratedQuestion {
  question: string
  category: QuestionCategory
  relevance_score: number
  context_factors: string[]
}

interface UserContextBank {
  user_id: string
  dominant_emotions: string[]
  recurring_themes: string[]
  mentioned_areas: string[]
  sentiment_trend: string
  total_responses: number
  avg_response_length: number
  engagement_score: number
  preferred_categories: string[]
  avoided_topics: string[]
  last_generation_at: string | null
  generation_count: number
  avg_quality_score?: number // 0-1, from quality-based CP system
}

interface RecentResponse {
  question_text: string
  response_text: string
  category: string
  responded_at: string
}

// =============================================================================
// LOGGING
// =============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const logData = data ? `: ${JSON.stringify(data)}` : ''
  console.log(`[${timestamp}] [${level}] [generate-questions] ${message}${logData}`)
}

/**
 * Robust JSON extraction from Gemini responses.
 * Handles preamble text, code fences, and trailing content.
 */
function extractJSON<T = any>(text: string): T {
  let cleaned = text.replace(/```(?:json)?\s*\n?/g, '').trim()
  // Direct parse
  try { return JSON.parse(cleaned) } catch { /* continue */ }
  // Find JSON boundaries
  const arrStart = cleaned.indexOf('[')
  const objStart = cleaned.indexOf('{')
  let start = -1, end = -1
  if (arrStart >= 0 && (objStart < 0 || arrStart < objStart)) {
    start = arrStart; end = cleaned.lastIndexOf(']')
  } else if (objStart >= 0) {
    start = objStart; end = cleaned.lastIndexOf('}')
  }
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.substring(start, end + 1)) } catch { /* continue */ }
  }
  throw new Error(`Failed to extract JSON from model response: ${text.substring(0, 200)}`)
}

/**
 * Recover complete objects from a truncated JSON array.
 * Finds the last complete `}` before truncation and closes the array.
 */
function recoverTruncatedArray(text: string): GeneratedQuestion[] {
  let cleaned = text.replace(/```(?:json)?\s*\n?/g, '').trim()
  const arrStart = cleaned.indexOf('[')
  if (arrStart < 0) return []

  const content = cleaned.substring(arrStart + 1)

  // Find all complete objects by matching balanced braces
  const objects: GeneratedQuestion[] = []
  let depth = 0
  let objStart = -1

  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') {
      if (depth === 0) objStart = i
      depth++
    } else if (content[i] === '}') {
      depth--
      if (depth === 0 && objStart >= 0) {
        try {
          const obj = JSON.parse(content.substring(objStart, i + 1))
          if (obj.question && obj.category) {
            objects.push(obj)
          }
        } catch { /* skip malformed object */ }
        objStart = -1
      }
    }
  }

  return objects
}

// =============================================================================
// CONTEXT FETCHING
// =============================================================================

async function getOrCreateContextBank(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<UserContextBank> {
  // Try to get existing context
  const { data: existing, error: fetchError } = await supabase
    .from('user_question_context_bank')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (existing && !fetchError) {
    return existing as UserContextBank
  }

  // Create default context
  const defaultContext: Partial<UserContextBank> = {
    user_id: userId,
    dominant_emotions: [],
    recurring_themes: [],
    mentioned_areas: [],
    sentiment_trend: 'neutral',
    total_responses: 0,
    avg_response_length: 0,
    engagement_score: 0.5,
    preferred_categories: [],
    avoided_topics: [],
    generation_count: 0,
  }

  const { data: created, error: createError } = await supabase
    .from('user_question_context_bank')
    .insert(defaultContext)
    .select()
    .single()

  if (createError) {
    log('WARN', 'Could not create context bank, using default', createError.message)
    return defaultContext as UserContextBank
  }

  return created as UserContextBank
}

async function getRecentResponses(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  limit: number = 10
): Promise<RecentResponse[]> {
  const { data, error } = await supabase
    .from('question_responses')
    .select(`
      response_text,
      responded_at,
      daily_questions!inner(question_text, category)
    `)
    .eq('user_id', userId)
    .order('responded_at', { ascending: false })
    .limit(limit)

  if (error) {
    log('WARN', 'Error fetching recent responses', error.message)
    return []
  }

  return (data || []).map((r: any) => ({
    question_text: r.daily_questions?.question_text || '',
    response_text: r.response_text,
    category: r.daily_questions?.category || 'reflection',
    responded_at: r.responded_at,
  }))
}

async function getRecentQuestions(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  limit: number = 20
): Promise<string[]> {
  const { data, error } = await supabase
    .from('daily_questions')
    .select('question_text')
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    log('WARN', 'Error fetching recent questions', error.message)
    return []
  }

  return (data || []).map((q: any) => q.question_text)
}

// =============================================================================
// CONTEXT ANALYSIS (NEW: Extract emotions from responses)
// =============================================================================

/**
 * NOVA: Analisa respostas recentes para inferir emoções e temas
 * Isso resolve o problema de "not yet identified"
 */
async function analyzeRecentResponses(
  responses: RecentResponse[]
): Promise<{ emotions: string[], themes: string[] }> {
  if (responses.length === 0) {
    // Fallback: contexto genérico para novos usuários
    return {
      emotions: ['curiosidade', 'reflexão'],
      themes: ['autoconhecimento', 'crescimento pessoal'],
    }
  }

  // Keywords simples para detecção (pode ser substituído por Gemini no futuro)
  const emotionKeywords = {
    feliz: ['feliz', 'alegre', 'contente', 'animado', 'otimista'],
    ansioso: ['ansioso', 'preocupado', 'nervoso', 'tenso'],
    grato: ['grato', 'agradecido', 'gratidão'],
    triste: ['triste', 'down', 'melancólico', 'desmotivado'],
    calmo: ['calmo', 'tranquilo', 'sereno', 'paz'],
  }

  const themeKeywords = {
    trabalho: ['trabalho', 'carreira', 'profissional', 'projeto'],
    relacionamentos: ['família', 'amigos', 'parceiro', 'relacionamento'],
    saude: ['saúde', 'exercício', 'bem-estar', 'alimentação'],
    crescimento: ['aprendizado', 'crescimento', 'desenvolvimento', 'evolução'],
  }

  const detectedEmotions = new Set<string>()
  const detectedThemes = new Set<string>()

  const allText = responses
    .map(r => r.response_text.toLowerCase())
    .join(' ')

  // Detectar emoções
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    if (keywords.some(kw => allText.includes(kw))) {
      detectedEmotions.add(emotion)
    }
  }

  // Detectar temas
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some(kw => allText.includes(kw))) {
      detectedThemes.add(theme)
    }
  }

  return {
    emotions: Array.from(detectedEmotions).slice(0, 3),
    themes: Array.from(detectedThemes).slice(0, 3),
  }
}

// =============================================================================
// GEMINI QUESTION GENERATION
// =============================================================================

function buildGenerationPrompt(
  context: UserContextBank,
  recentResponses: RecentResponse[],
  recentQuestions: string[],
  batchSize: number,
  categories: QuestionCategory[],
  inferredContext?: { emotions: string[], themes: string[] }
): string {
  // ✅ FIX: Use análise inferida quando contexto está vazio
  const emotionsStr = context.dominant_emotions.length > 0
    ? context.dominant_emotions.join(', ')
    : (inferredContext?.emotions.length ?? 0) > 0
    ? inferredContext!.emotions.join(', ') + ' (inferido das respostas)'
    : 'curiosidade, reflexão (padrão para novos usuários)'

  const themesStr = context.recurring_themes.length > 0
    ? context.recurring_themes.join(', ')
    : (inferredContext?.themes.length ?? 0) > 0
    ? inferredContext!.themes.join(', ') + ' (inferido das respostas)'
    : 'autoconhecimento, crescimento pessoal (padrão para novos usuários)'

  const preferredStr = context.preferred_categories.length > 0
    ? context.preferred_categories.join(', ')
    : 'all categories'

  const avoidStr = context.avoided_topics.length > 0
    ? context.avoided_topics.join(', ')
    : 'none specified'

  const recentQuestionsStr = recentQuestions.length > 0
    ? recentQuestions.map(q => `- ${q}`).join('\n')
    : '- No recent questions'

  const recentResponsesStr = recentResponses.length > 0
    ? recentResponses.slice(0, 5).map(r =>
        `- Q: "${r.question_text}" A: "${r.response_text.substring(0, 150)}${r.response_text.length > 150 ? '...' : ''}"`
      ).join('\n')
    : '- No recent responses'

  // Adaptive difficulty based on avg_quality_score
  const avgQuality = context.avg_quality_score ?? 0.5
  let difficultyInstruction: string
  if (avgQuality < 0.4) {
    difficultyInstruction = `DIFFICULTY: SIMPLE (user avg quality: ${avgQuality.toFixed(2)})
- Use everyday language, answerable in 1-2 short sentences
- Focus on concrete, daily experiences (not abstract concepts)
- relevance_score range: 0.5-0.7
- Example: "O que te fez sorrir hoje?" or "Como voce dormiu ontem?"`
  } else if (avgQuality <= 0.7) {
    difficultyInstruction = `DIFFICULTY: MIX (user avg quality: ${avgQuality.toFixed(2)})
- 60% simple daily questions + 40% reflective questions
- Simple: concrete experiences, 1-2 sentences (relevance_score: 0.5-0.7)
- Reflective: patterns, feelings, choices (relevance_score: 0.7-0.85)`
  } else {
    difficultyInstruction = `DIFFICULTY: DEEP (user avg quality: ${avgQuality.toFixed(2)})
- Focus on self-analysis, patterns, values, and decisions
- Encourage deeper introspection and personal growth
- relevance_score range: 0.75-1.0
- Example: "Que padrao voce percebeu nas suas reacoes esta semana?"`
  }

  return `
You are a compassionate wellness coach for Aica Life OS, a personal growth application.

Your task is to generate ${batchSize} unique, personalized reflection questions in PORTUGUESE (Brazilian).

USER CONTEXT:
- Dominant emotions: ${emotionsStr}
- Recurring themes: ${themesStr}
- Sentiment trend: ${context.sentiment_trend}
- Preferred categories: ${preferredStr}
- Topics to avoid: ${avoidStr}
- Total responses so far: ${context.total_responses}
- Engagement score: ${(context.engagement_score * 100).toFixed(0)}%

${difficultyInstruction}

RECENT QUESTIONS ASKED (AVOID SIMILAR ONES):
${recentQuestionsStr}

RECENT USER RESPONSES (for context):
${recentResponsesStr}

REQUIREMENTS:
1. Generate questions in PORTUGUESE (Brazilian)
2. Questions must be UNIQUE and NOT SIMILAR to recent questions listed above
3. Mix categories from: ${categories.join(', ')}
4. Personalize based on user's themes and emotions when available
5. Keep questions between 8-20 words
6. Use empathetic, non-judgmental language
7. Follow the DIFFICULTY level above for question complexity

CATEGORY DEFINITIONS:
- reflection: Self-awareness and introspection questions
- gratitude: Questions about appreciation and thankfulness
- energy: Questions about mood, vitality, and physical state
- learning: Questions about growth, lessons, and discoveries
- change: Questions about transformation and new beginnings

RESPONSE FORMAT (JSON array only, no markdown):
[
  {
    "question": "Qual momento hoje te fez sentir mais presente?",
    "category": "reflection",
    "relevance_score": 0.75,
    "context_factors": ["presence", "mindfulness"]
  }
]

Generate exactly ${batchSize} questions now:
`
}

async function generateQuestionsWithGemini(
  prompt: string
): Promise<GeneratedQuestion[]> {
  log('INFO', 'Calling Gemini for question generation')

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.8,  // Higher for creativity
      topP: 0.9,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`)
  }

  const result = await response.json()
  const candidate = result.candidates?.[0]
  const text = candidate?.content?.parts?.[0]?.text || '[]'
  const finishReason = candidate?.finishReason

  if (finishReason === 'MAX_TOKENS') {
    log('WARN', 'Gemini response truncated (MAX_TOKENS), attempting partial recovery')
  }

  // Parse JSON from response (robust extraction handles preamble, code fences, etc.)
  try {
    const questions = extractJSON<GeneratedQuestion[]>(text)
    log('INFO', 'Successfully parsed questions', { count: questions.length })
    return questions
  } catch (parseError) {
    // If truncated, try to recover partial array by closing it
    if (finishReason === 'MAX_TOKENS' || text.includes('[')) {
      try {
        const recovered = recoverTruncatedArray(text)
        if (recovered.length > 0) {
          log('INFO', 'Recovered partial questions from truncated response', { count: recovered.length })
          return recovered
        }
      } catch {
        // Fall through to error
      }
    }
    log('WARN', 'Failed to parse Gemini response, returning empty', { text: text.substring(0, 500), finishReason })
    return []
  }
}

// =============================================================================
// QUESTION STORAGE
// =============================================================================

async function storeGeneratedQuestions(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  questions: GeneratedQuestion[],
  promptHash: string
): Promise<number> {
  const questionsToInsert = questions.map(q => ({
    user_id: userId,
    question_text: q.question,
    category: q.category,
    active: true,
    created_by_ai: true,
    relevance_score: q.relevance_score,
    generation_context: {
      context_factors: q.context_factors,
      generated_at: new Date().toISOString(),
    },
    generation_prompt_hash: promptHash,
  }))

  const { data, error } = await supabase
    .from('daily_questions')
    .insert(questionsToInsert)
    .select('id')

  if (error) {
    log('ERROR', 'Failed to store questions', error.message)
    throw error
  }

  return data?.length || 0
}

async function updateContextBankAfterGeneration(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  questionsGenerated: number,
  inferredContext?: { emotions: string[], themes: string[] }
): Promise<void> {
  // ✅ FIX: Atualiza context bank com emoções/temas inferidos
  const updateData: any = {
    last_generation_at: new Date().toISOString(),
  }

  // Se temos contexto inferido, armazena para próximas gerações
  if (inferredContext) {
    if (inferredContext.emotions.length > 0) {
      updateData.dominant_emotions = inferredContext.emotions
    }
    if (inferredContext.themes.length > 0) {
      updateData.recurring_themes = inferredContext.themes
    }
  }

  const { error } = await supabase
    .from('user_question_context_bank')
    .update(updateData)
    .eq('user_id', userId)

  if (error) {
    log('WARN', 'Failed to update context bank', error.message)
  }

  // Increment generation count (RPC might not exist, that's ok)
  try {
    const { error: rpcErr } = await supabase.rpc('increment_generation_count', { p_user_id: userId })
    if (rpcErr) log('DEBUG', 'increment_generation_count RPC not available', rpcErr.message)
  } catch {
    // Ignore - RPC may not exist
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    )
  }

  const startTime = Date.now()
  let currentStep = 'init'

  try {
    // Validate API key
    if (!GEMINI_API_KEY) {
      log('ERROR', 'GEMINI_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      log('ERROR', 'No Authorization header provided')
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      log('ERROR', 'Missing environment variables', {
        hasUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      })
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '')
    log('DEBUG', 'Validating token', { tokenLength: token.length, tokenPrefix: token.substring(0, 20) })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      log('ERROR', 'Authentication failed', {
        error: authError?.message,
        errorCode: authError?.status,
        hasUser: !!user
      })
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication', details: authError?.message }),
        { status: 401, headers: corsHeaders }
      )
    }

    log('INFO', 'User authenticated', { userId: user.id })

    // Parse request body
    const request: GenerateQuestionsRequest = await req.json().catch(() => ({}))

    const batchSize = Math.min(
      request.batch_size || CONFIG.DEFAULT_BATCH_SIZE,
      CONFIG.MAX_BATCH_SIZE
    )

    const categories: QuestionCategory[] = request.categories || [
      'reflection', 'gratitude', 'energy', 'learning', 'change'
    ]

    log('INFO', 'Processing generation request', {
      userId: user.id,
      batchSize,
      forceRegenerate: request.force_regenerate,
    })

    // Check if generation is allowed (unless forced)
    currentStep = 'check_should_generate'
    if (!request.force_regenerate) {
      const { data: checkResult, error: rpcError } = await supabase
        .rpc('check_should_generate_questions', { p_user_id: user.id })

      if (rpcError) {
        log('WARN', 'check_should_generate RPC failed, proceeding anyway', rpcError.message)
      }

      if (checkResult && checkResult.length > 0) {
        const check = checkResult[0]
        if (!check.should_generate) {
          log('INFO', 'Generation not needed', check)
          return new Response(
            JSON.stringify({
              success: true,
              questions_generated: 0,
              questions: [],
              context_updated: false,
              message: 'Generation not needed yet',
              status: {
                unanswered_count: check.unanswered_count,
                hours_since_last: check.hours_since_last_generation,
                daily_count: check.daily_generation_count,
              },
            }),
            { status: 200, headers: corsHeaders }
          )
        }
      }
    }

    // Get user context and recent data
    currentStep = 'fetch_context'
    log('DEBUG', 'Fetching user context and recent data')
    const [context, recentResponses, recentQuestions] = await Promise.all([
      getOrCreateContextBank(supabase, user.id),
      getRecentResponses(supabase, user.id, 10),
      getRecentQuestions(supabase, user.id, 20),
    ])

    // Analisa respostas para inferir contexto
    currentStep = 'analyze_responses'
    const inferredContext = await analyzeRecentResponses(recentResponses)

    log('DEBUG', 'Inferred context from responses', inferredContext)

    // Build prompt and generate questions
    currentStep = 'call_gemini'
    log('INFO', 'Calling Gemini API')
    const prompt = buildGenerationPrompt(
      context,
      recentResponses,
      recentQuestions,
      batchSize,
      categories,
      inferredContext
    )

    const promptHash = btoa(prompt.substring(0, 100)).substring(0, 32)

    const generatedQuestions = await generateQuestionsWithGemini(prompt)
    log('INFO', 'Gemini returned questions', { count: generatedQuestions.length })

    // Filter out any questions too similar to existing ones
    currentStep = 'filter_duplicates'
    const uniqueQuestions = generatedQuestions.filter(q => {
      const lowerQuestion = q.question.toLowerCase()
      return !recentQuestions.some(rq =>
        rq.toLowerCase().includes(lowerQuestion.substring(0, 30)) ||
        lowerQuestion.includes(rq.toLowerCase().substring(0, 30))
      )
    })

    // Store questions
    currentStep = 'store_questions'
    log('INFO', 'Storing questions', { unique: uniqueQuestions.length })
    const storedCount = await storeGeneratedQuestions(
      supabase,
      user.id,
      uniqueQuestions,
      promptHash
    )

    // Fire-and-forget usage tracking
    supabase.rpc('log_interaction', {
      p_user_id: user.id,
      p_action: 'generate_daily_question',
      p_module: 'journey',
      p_model: GEMINI_MODEL,
      p_tokens_in: 0,
      p_tokens_out: 0,
    }).then(() => {
      log('INFO', 'Logged generate_daily_question interaction')
    }).catch((err: Error) => {
      log('WARN', 'Failed to log interaction', err.message)
    })

    // Update context bank with inferred data
    currentStep = 'update_context'
    await updateContextBankAfterGeneration(supabase, user.id, storedCount, inferredContext)

    const processingTimeMs = Date.now() - startTime

    log('INFO', 'Generation completed', {
      userId: user.id,
      generated: generatedQuestions.length,
      stored: storedCount,
      inferredEmotions: inferredContext.emotions,
      inferredThemes: inferredContext.themes,
      processingTimeMs,
    })

    return new Response(
      JSON.stringify({
        success: true,
        questions_generated: storedCount,
        questions: uniqueQuestions.map(q => ({
          question_text: q.question,
          category: q.category,
          relevance_score: q.relevance_score,
          context_factors: q.context_factors,
        })),
        context_updated: true,
        inferred_context: inferredContext,
        processing_time_ms: processingTimeMs,
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    const err = error as Error
    const step = typeof currentStep !== 'undefined' ? currentStep : 'unknown'
    log('ERROR', `Failed at step: ${step}`, { message: err.message, stack: err.stack })

    return new Response(
      JSON.stringify({
        success: false,
        error: `[${step}] ${err.message || 'Internal server error'}`,
        error_type: err.constructor?.name || 'Error',
        failed_step: step,
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
