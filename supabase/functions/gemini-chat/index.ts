import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

// ============================================================================
// TYPES
// ============================================================================

interface BaseRequest {
  action?: string
  payload?: Record<string, any>
  model?: 'fast' | 'smart'
}

// Legacy chat request (backward compatibility)
interface ChatRequest {
  message: string
  context?: string
  history?: Array<{ role: string; content: string }>
  systemPrompt?: string
}

// Sentiment Analysis Types
interface SentimentAnalysisPayload {
  content: string
}

interface SentimentAnalysisResult {
  timestamp: string
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  sentimentScore: number
  emotions: string[]
  triggers: string[]
  energyLevel: number
}

// Weekly Summary Types
interface MomentData {
  id: string
  content: string
  emotion: string
  sentiment_data?: {
    sentiment: string
    sentimentScore: number
  }
  tags: string[]
  created_at: string
}

interface WeeklySummaryPayload {
  moments: MomentData[]
}

interface KeyMoment {
  id: string
  preview: string
  sentiment: string
  created_at: string
}

interface WeeklySummaryResult {
  emotionalTrend: 'ascending' | 'stable' | 'descending' | 'volatile'
  dominantEmotions: string[]
  keyMoments: KeyMoment[]
  insights: string[]
  suggestedFocus: string
}

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

const MODELS = {
  fast: 'gemini-2.0-flash',
  smart: 'gemini-1.5-flash', // Using 1.5-flash as fallback for smart model
} as const

// Actions that require the smart model
const SMART_MODEL_ACTIONS = [
  'generate_weekly_summary',
  'generate_dossier',
  'deep_research',
]

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const PROMPTS = {
  analyze_moment_sentiment: (content: string) => `Analise o sentimento do seguinte momento de diario:

"${content}"

Retorne um JSON com:
- sentiment: 'very_positive', 'positive', 'neutral', 'negative', ou 'very_negative'
- sentimentScore: numero de -1 (muito negativo) a 1 (muito positivo)
- emotions: lista de emocoes detectadas (maximo 5): joy, sadness, anxiety, anger, calm, gratitude, frustration, hope, fear, excitement, disappointment, love, etc
- triggers: lista de gatilhos/contextos (maximo 3): work, health, relationship, finance, family, personal_growth, leisure, etc
- energyLevel: nivel de energia percebido de 0 (exausto) a 100 (energizado)

Seja preciso e sensivel. Retorne APENAS o JSON, sem explicacoes.`,

  generate_weekly_summary: (moments: MomentData[]) => {
    const momentsList = moments.map((m, i) => {
      const sentimentInfo = m.sentiment_data
        ? `Sentimento: ${m.sentiment_data.sentiment} (score: ${m.sentiment_data.sentimentScore})`
        : 'Sentimento: nao analisado'

      return `${i + 1}. [${m.created_at}] Emocao: ${m.emotion}
${sentimentInfo}
Tags: ${m.tags?.join(', ') || 'nenhuma'}
Conteudo: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`
    }).join('\n\n')

    return `Voce e um coach de consciencia emocional. Analise os seguintes ${moments.length} momentos de diario da ultima semana:

${momentsList}

Crie um resumo semanal profundo e empatico retornando um JSON com:

1. **emotionalTrend**:
   - 'ascending': humor melhorando ao longo da semana
   - 'stable': humor consistente
   - 'descending': humor piorando
   - 'volatile': muitas oscilacoes

2. **dominantEmotions**: Lista de 3-5 emocoes mais frequentes/intensas

3. **keyMoments**: Selecione os 3-5 momentos mais significativos (picos emocionais, insights importantes, mudancas). Para cada:
   - id: ID do momento
   - preview: Resumo em 1 frase (max 80 caracteres)
   - sentiment: sentimento do momento
   - created_at: timestamp

4. **insights**: 3-5 insights profundos sobre padroes, aprendizados, ou temas recorrentes. Seja empatico, especifico, e construtivo.

5. **suggestedFocus**: Uma sugestao curta (1-2 frases) do que focar na proxima semana baseado nos padroes observados.

Seja profundo, empatico, e construtivo. Use linguagem acolhedora. Retorne APENAS o JSON.`
  },
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

async function handleAnalyzeMomentSentiment(
  genAI: GoogleGenerativeAI,
  payload: SentimentAnalysisPayload
): Promise<SentimentAnalysisResult> {
  if (!payload.content || typeof payload.content !== 'string') {
    throw new Error('Campo "content" e obrigatorio e deve ser uma string')
  }

  if (payload.content.trim().length < 3) {
    throw new Error('Conteudo muito curto para analise')
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 512,
    }
  })

  const prompt = PROMPTS.analyze_moment_sentiment(payload.content)
  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  // Parse JSON response
  let parsed: Omit<SentimentAnalysisResult, 'timestamp'>
  try {
    // Remove markdown code blocks if present
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[analyze_moment_sentiment] Failed to parse JSON:', text)
    throw new Error('Falha ao processar resposta do modelo')
  }

  // Validate and normalize response
  const validSentiments = ['very_positive', 'positive', 'neutral', 'negative', 'very_negative']
  if (!validSentiments.includes(parsed.sentiment)) {
    parsed.sentiment = 'neutral'
  }

  // Clamp sentimentScore to [-1, 1]
  parsed.sentimentScore = Math.max(-1, Math.min(1, parsed.sentimentScore || 0))

  // Ensure arrays
  parsed.emotions = Array.isArray(parsed.emotions) ? parsed.emotions.slice(0, 5) : []
  parsed.triggers = Array.isArray(parsed.triggers) ? parsed.triggers.slice(0, 3) : []

  // Clamp energyLevel to [0, 100]
  parsed.energyLevel = Math.max(0, Math.min(100, parsed.energyLevel || 50))

  return {
    timestamp: new Date().toISOString(),
    ...parsed,
  }
}

async function handleGenerateWeeklySummary(
  genAI: GoogleGenerativeAI,
  payload: WeeklySummaryPayload
): Promise<WeeklySummaryResult> {
  if (!payload.moments || !Array.isArray(payload.moments)) {
    throw new Error('Campo "moments" e obrigatorio e deve ser um array')
  }

  if (payload.moments.length === 0) {
    throw new Error('Array de momentos esta vazio')
  }

  if (payload.moments.length > 100) {
    throw new Error('Maximo de 100 momentos por resumo')
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    generationConfig: {
      temperature: 0.5,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048,
    }
  })

  const prompt = PROMPTS.generate_weekly_summary(payload.moments)
  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  // Parse JSON response
  let parsed: WeeklySummaryResult
  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[generate_weekly_summary] Failed to parse JSON:', text)
    throw new Error('Falha ao processar resposta do modelo')
  }

  // Validate emotionalTrend
  const validTrends = ['ascending', 'stable', 'descending', 'volatile']
  if (!validTrends.includes(parsed.emotionalTrend)) {
    parsed.emotionalTrend = 'stable'
  }

  // Ensure arrays
  parsed.dominantEmotions = Array.isArray(parsed.dominantEmotions)
    ? parsed.dominantEmotions.slice(0, 5)
    : []

  parsed.keyMoments = Array.isArray(parsed.keyMoments)
    ? parsed.keyMoments.slice(0, 5)
    : []

  parsed.insights = Array.isArray(parsed.insights)
    ? parsed.insights.slice(0, 5)
    : []

  parsed.suggestedFocus = parsed.suggestedFocus || ''

  return parsed
}

// Legacy chat handler (backward compatibility)
async function handleLegacyChat(
  genAI: GoogleGenerativeAI,
  request: ChatRequest
): Promise<{ response: string; success: boolean }> {
  const { message, context, history, systemPrompt } = request

  if (!message) {
    throw new Error('Mensagem e obrigatoria')
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
    }
  })

  const defaultSystemPrompt = `Voce e um assistente financeiro inteligente e amigavel chamado "Assistente Financeiro".
Voce ajuda usuarios a:
- Analisar seus gastos e receitas
- Identificar padroes de consumo
- Dar dicas de economia personalizadas
- Responder perguntas sobre financas pessoais
- Categorizar transacoes

Responda sempre em portugues brasileiro, de forma clara e objetiva.
Use emojis ocasionalmente para tornar a conversa mais amigavel.
Quando mostrar valores monetarios, use o formato brasileiro (R$ 1.234,56).`

  const finalSystemPrompt = systemPrompt || defaultSystemPrompt

  const chatHistory = history?.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  })) || []

  let finalMessage = message
  if (context) {
    finalMessage = `Contexto dos dados financeiros do usuario:\n${context}\n\nPergunta do usuario: ${message}`
  }

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: `Sistema: ${finalSystemPrompt}` }] },
      { role: 'model', parts: [{ text: 'Entendido! Estou pronto para ajudar com suas financas.' }] },
      ...chatHistory
    ]
  })

  const result = await chat.sendMessage(finalMessage)
  const response = await result.response
  const text = response.text()

  return { response: text, success: true }
}

// ============================================================================
// MAIN SERVER
// ============================================================================

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY nao configurada')
      return new Response(
        JSON.stringify({ error: 'API key nao configurada no servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const body = await req.json()

    // Check if this is an action-based request or legacy chat request
    if (body.action) {
      const { action, payload } = body as BaseRequest

      console.log(`[gemini-chat] Action: ${action}`)

      let result: any

      switch (action) {
        case 'analyze_moment_sentiment':
          result = await handleAnalyzeMomentSentiment(genAI, payload as SentimentAnalysisPayload)
          break

        case 'generate_weekly_summary':
          result = await handleGenerateWeeklySummary(genAI, payload as WeeklySummaryPayload)
          break

        case 'finance_chat':
          // Alias for legacy chat with finance context
          const chatResult = await handleLegacyChat(genAI, {
            message: payload?.message,
            context: payload?.context,
            history: payload?.history,
            systemPrompt: payload?.systemPrompt,
          })
          result = chatResult
          break

        default:
          return new Response(
            JSON.stringify({ error: `Action desconhecida: ${action}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
      }

      const latencyMs = Date.now() - startTime
      console.log(`[gemini-chat] Action ${action} completed in ${latencyMs}ms`)

      return new Response(
        JSON.stringify({
          result,
          success: true,
          latencyMs,
          cached: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      // Legacy chat request (backward compatibility)
      const result = await handleLegacyChat(genAI, body as ChatRequest)

      console.log('[gemini-chat] Legacy chat response generated')

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    const err = error as Error
    console.error('[gemini-chat] Error:', err.message)

    // Determine status code based on error type
    let statusCode = 500
    if (err.message.includes('obrigatorio') || err.message.includes('deve ser')) {
      statusCode = 400
    }

    return new Response(
      JSON.stringify({
        error: err.message || 'Erro interno do servidor',
        success: false
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
