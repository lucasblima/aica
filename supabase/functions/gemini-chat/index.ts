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

interface ChatRequest {
  message: string
  context?: string
  history?: Array<{ role: string; content: string }>
  systemPrompt?: string
}

interface SentimentAnalysisPayload {
  content: string
  context?: string
}

interface SentimentAnalysisResult {
  timestamp: string
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  sentimentScore: number
  emotions: string[]
  triggers: string[]
  energyLevel: number
}

interface WhatsAppSentimentPayload {
  text: string
  instance?: string
}

interface WhatsAppSentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative'
  sentimentScore: number
  triggers: string[]
  summary: string
}

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

interface GenerateDossierPayload {
  guestName: string
  theme?: string
}

interface TechnicalSheet {
  name: string
  profession: string
  socialMedia: { platform: string; handle: string }[]
  keyFacts?: string[]
}

interface DossierResult {
  biography: string
  controversies: string[]
  suggestedTopics: string[]
  iceBreakers: string[]
  technicalSheet?: TechnicalSheet
  derivedTheme?: string
}

interface IceBreakerPayload {
  guestName: string
  keyFacts?: string[]
  occupation?: string
}

interface IceBreakerResult {
  iceBreakers: Array<{ question: string; rationale: string }>
}

interface PautaQuestionsPayload {
  guestName: string
  outline: { title: string; mainSections: Array<{ title: string; keyPoints: string[] }> }
  keyFacts?: string[]
  controversies?: string[]
  additionalContext?: string
}

interface PautaQuestionsResult {
  questions: Array<{
    id: string
    text: string
    category: 'abertura' | 'desenvolvimento' | 'aprofundamento' | 'fechamento'
    followUps: string[]
    context?: string
    priority: 'high' | 'medium' | 'low'
  }>
}

interface PautaOutlinePayload {
  guestName: string
  theme: string
  biography?: string
  keyFacts?: string[]
  controversies?: string[]
  duration?: number
  style?: { tone: 'formal' | 'casual' | 'investigativo' | 'humano'; depth: 'shallow' | 'medium' | 'deep' }
}

interface OutlineSection {
  title: string
  description: string
  duration: number
  keyPoints: string[]
  suggestedTransition?: string
}

interface PautaOutlineResult {
  title: string
  introduction: OutlineSection
  mainSections: OutlineSection[]
  conclusion: OutlineSection
}

interface DailyReportPayload {
  userId: string
  date: string
  tasksCompleted: number
  tasksTotal: number
  productivityScore: number
  moodScore?: number
  energyLevel?: number
  activeModules?: string[]
  content?: string
}

interface DailyReportResult {
  summary: string
  insights: string[]
  recommendations: string[]
  motivationalMessage: string
}

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

const MODELS = {
  fast: 'gemini-2.0-flash-exp',
  smart: 'gemini-2.0-flash-exp',
} as const

const SMART_MODEL_ACTIONS = [
  'generate_weekly_summary',
  'generate_dossier',
  'deep_research',
  'generate_ice_breakers',
  'generate_pauta_questions',
  'generate_pauta_outline',
]

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const PROMPTS = {
  analyze_moment_sentiment: (content: string) => `Analise o sentimento do seguinte momento de diario:\n\n"${content}"\n\nRetorne um JSON com:\n- sentiment: 'very_positive', 'positive', 'neutral', 'negative', ou 'very_negative'\n- sentimentScore: numero de -1 (muito negativo) a 1 (muito positivo)\n- emotions: lista de emocoes detectadas (maximo 5)\n- triggers: lista de gatilhos/contextos (maximo 3)\n- energyLevel: nivel de energia percebido de 0 a 100\n\nRetorne APENAS o JSON.`,

  generate_weekly_summary: (moments: MomentData[]) => {
    const momentsList = moments.map((m, i) => {
      const sentimentInfo = m.sentiment_data ? `Sentimento: ${m.sentiment_data.sentiment} (score: ${m.sentiment_data.sentimentScore})` : 'Sentimento: nao analisado'
      return `${i + 1}. [${m.created_at}] Emocao: ${m.emotion}\n${sentimentInfo}\nTags: ${m.tags?.join(', ') || 'nenhuma'}\nConteudo: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`
    }).join('\n\n')
    return `Voce e um coach de consciencia emocional. Analise os seguintes ${moments.length} momentos de diario da ultima semana:\n\n${momentsList}\n\nCrie um resumo semanal profundo e empatico retornando um JSON com emotionalTrend, dominantEmotions, keyMoments, insights, suggestedFocus. Retorne APENAS o JSON.`
  },

  generate_dossier: (guestName: string, theme?: string) => `Voce e um pesquisador especializado em preparacao de entrevistas para podcasts. Crie um dossie completo sobre ${guestName}${theme ? ` com foco no tema "${theme}"` : ''}. Retorne um JSON com biography, controversies, suggestedTopics, iceBreakers, technicalSheet. Retorne APENAS o JSON valido.`,

  generate_ice_breakers: (guestName: string, keyFacts: string[] = [], occupation?: string) => `Crie 5 perguntas quebra-gelo personalizadas para ${guestName}. ${occupation ? `Ocupacao: ${occupation}` : ''} Retorne um JSON com iceBreakers array. Retorne APENAS JSON valido.`,

  generate_pauta_questions: (payload: PautaQuestionsPayload) => `Gere perguntas para entrevista com ${payload.guestName}. Retorne JSON com questions array. Retorne APENAS JSON valido.`,

  generate_pauta_outline: (payload: PautaOutlinePayload) => `Crie uma pauta estruturada para entrevista com ${payload.guestName} sobre ${payload.theme}. Retorne JSON com title, introduction, mainSections, conclusion. Retorne APENAS JSON valido.`,
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

async function handleAnalyzeMomentSentiment(genAI: GoogleGenerativeAI, payload: SentimentAnalysisPayload): Promise<SentimentAnalysisResult> {
  if (!payload.content || typeof payload.content !== 'string') throw new Error('Campo "content" e obrigatorio')
  if (payload.content.trim().length < 3) throw new Error('Conteudo muito curto para analise')

  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: 0.3, topP: 0.8, topK: 40, maxOutputTokens: 512 } })
  const result = await model.generateContent(PROMPTS.analyze_moment_sentiment(payload.content))
  const text = result.response.text()

  let parsed: Omit<SentimentAnalysisResult, 'timestamp'>
  try {
    parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    throw new Error('Falha ao processar resposta do modelo')
  }

  const validSentiments = ['very_positive', 'positive', 'neutral', 'negative', 'very_negative']
  if (!validSentiments.includes(parsed.sentiment)) parsed.sentiment = 'neutral'
  parsed.sentimentScore = Math.max(-1, Math.min(1, parsed.sentimentScore || 0))
  parsed.emotions = Array.isArray(parsed.emotions) ? parsed.emotions.slice(0, 5) : []
  parsed.triggers = Array.isArray(parsed.triggers) ? parsed.triggers.slice(0, 3) : []
  parsed.energyLevel = Math.max(0, Math.min(100, parsed.energyLevel || 50))

  return { timestamp: new Date().toISOString(), ...parsed }
}

async function handleGenerateWeeklySummary(genAI: GoogleGenerativeAI, payload: WeeklySummaryPayload): Promise<WeeklySummaryResult> {
  if (!payload.moments || !Array.isArray(payload.moments)) throw new Error('Campo "moments" e obrigatorio')
  if (payload.moments.length === 0) throw new Error('Array de momentos esta vazio')

  const model = genAI.getGenerativeModel({ model: MODELS.smart, generationConfig: { temperature: 0.5, topP: 0.9, topK: 40, maxOutputTokens: 2048 } })
  const result = await model.generateContent(PROMPTS.generate_weekly_summary(payload.moments))
  const text = result.response.text()

  let parsed: WeeklySummaryResult
  try {
    parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    throw new Error('Falha ao processar resposta do modelo')
  }

  const validTrends = ['ascending', 'stable', 'descending', 'volatile']
  if (!validTrends.includes(parsed.emotionalTrend)) parsed.emotionalTrend = 'stable'
  parsed.dominantEmotions = Array.isArray(parsed.dominantEmotions) ? parsed.dominantEmotions.slice(0, 5) : []
  parsed.keyMoments = Array.isArray(parsed.keyMoments) ? parsed.keyMoments.slice(0, 5) : []
  parsed.insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 5) : []
  parsed.suggestedFocus = parsed.suggestedFocus || ''

  return parsed
}

async function handleGenerateDossier(genAI: GoogleGenerativeAI, payload: GenerateDossierPayload): Promise<DossierResult> {
  if (!payload.guestName) throw new Error('Campo "guestName" e obrigatorio')

  const model = genAI.getGenerativeModel({ model: MODELS.smart, generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 4096 } })
  const result = await model.generateContent(PROMPTS.generate_dossier(payload.guestName, payload.theme))
  const text = result.response.text()

  let parsed: DossierResult
  try {
    parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    throw new Error('Falha ao processar resposta do modelo')
  }

  parsed.biography = parsed.biography || 'Nao foi possivel gerar biografia'
  parsed.controversies = Array.isArray(parsed.controversies) ? parsed.controversies : []
  parsed.suggestedTopics = Array.isArray(parsed.suggestedTopics) ? parsed.suggestedTopics.slice(0, 10) : []
  parsed.iceBreakers = Array.isArray(parsed.iceBreakers) ? parsed.iceBreakers.slice(0, 5) : []

  return parsed
}

async function handleGenerateIceBreakers(genAI: GoogleGenerativeAI, payload: IceBreakerPayload): Promise<IceBreakerResult> {
  if (!payload.guestName) throw new Error('Campo "guestName" e obrigatorio')

  const model = genAI.getGenerativeModel({ model: MODELS.smart, generationConfig: { temperature: 0.8, topP: 0.95, topK: 40, maxOutputTokens: 2048 } })
  const result = await model.generateContent(PROMPTS.generate_ice_breakers(payload.guestName, payload.keyFacts || [], payload.occupation))
  const text = result.response.text()

  let parsed: IceBreakerResult
  try {
    parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    throw new Error('Falha ao processar resposta do modelo')
  }

  parsed.iceBreakers = Array.isArray(parsed.iceBreakers) ? parsed.iceBreakers.slice(0, 5) : []
  return parsed
}

async function handleGeneratePautaQuestions(genAI: GoogleGenerativeAI, payload: PautaQuestionsPayload): Promise<PautaQuestionsResult> {
  if (!payload.guestName) throw new Error('Campo "guestName" e obrigatorio')
  if (!payload.outline || !Array.isArray(payload.outline.mainSections)) throw new Error('Campo "outline" e obrigatorio')

  const model = genAI.getGenerativeModel({ model: MODELS.smart, generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 4096 } })
  const result = await model.generateContent(PROMPTS.generate_pauta_questions(payload))
  const text = result.response.text()

  let parsed: PautaQuestionsResult
  try {
    parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    throw new Error('Falha ao processar resposta do modelo')
  }

  parsed.questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 20) : []
  return parsed
}

async function handleGeneratePautaOutline(genAI: GoogleGenerativeAI, payload: PautaOutlinePayload): Promise<PautaOutlineResult> {
  if (!payload.guestName) throw new Error('Campo "guestName" e obrigatorio')
  if (!payload.theme) throw new Error('Campo "theme" e obrigatorio')

  const model = genAI.getGenerativeModel({ model: MODELS.smart, generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 4096 } })
  const result = await model.generateContent(PROMPTS.generate_pauta_outline(payload))
  const text = result.response.text()

  let parsed: PautaOutlineResult
  try {
    parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    throw new Error('Falha ao processar resposta do modelo')
  }

  parsed.title = parsed.title || 'Entrevista sem titulo'
  parsed.mainSections = Array.isArray(parsed.mainSections) ? parsed.mainSections : []
  return parsed
}

async function handleWhatsAppSentiment(genAI: GoogleGenerativeAI, payload: WhatsAppSentimentPayload): Promise<WhatsAppSentimentResult> {
  const { text } = payload
  if (!text || typeof text !== 'string') throw new Error('Campo "text" e obrigatorio')
  if (text.trim().length < 2) throw new Error('Texto muito curto para analise')

  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: 0.3, topP: 0.8, topK: 40, maxOutputTokens: 256 } })
  const prompt = `Analise o sentimento da seguinte mensagem de WhatsApp:\n\n"${text}"\n\nRetorne APENAS um JSON com sentiment ('positive', 'neutral', 'negative'), sentimentScore (-1 a 1), triggers (lista de ate 3), summary (max 100 chars).`
  const result = await model.generateContent(prompt)
  const text_response = result.response.text()

  let parsed: Omit<WhatsAppSentimentResult, 'timestamp'>
  try {
    parsed = JSON.parse(text_response.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    throw new Error('Falha ao processar resposta do modelo')
  }

  const validSentiments = ['positive', 'neutral', 'negative']
  if (!validSentiments.includes(parsed.sentiment)) parsed.sentiment = 'neutral'
  parsed.sentimentScore = Math.max(-1, Math.min(1, parsed.sentimentScore || 0))
  parsed.triggers = Array.isArray(parsed.triggers) ? parsed.triggers.slice(0, 3) : []
  parsed.summary = parsed.summary || ''

  return parsed as WhatsAppSentimentResult
}

async function handleLegacyChat(genAI: GoogleGenerativeAI, request: ChatRequest): Promise<{ response: string; success: boolean }> {
  const { message, context, history, systemPrompt } = request
  if (!message) throw new Error('Mensagem e obrigatoria')

  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: 0.7, topP: 0.95, topK: 40, maxOutputTokens: 2048 } })
  const defaultSystemPrompt = `Voce e um assistente financeiro inteligente. Responda em portugues brasileiro.`
  const finalSystemPrompt = systemPrompt || defaultSystemPrompt
  const chatHistory = history?.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })) || []
  let finalMessage = message
  if (context) finalMessage = `Contexto:\n${context}\n\nPergunta: ${message}`

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: `Sistema: ${finalSystemPrompt}` }] },
      { role: 'model', parts: [{ text: 'Entendido!' }] },
      ...chatHistory
    ]
  })

  const result = await chat.sendMessage(finalMessage)
  return { response: result.response.text(), success: true }
}

async function handleAnalyzeContentRealtime(genAI: GoogleGenerativeAI, payload: any): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload
  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: temperature || 0.8, maxOutputTokens: maxOutputTokens || 150 } })
  const result = await model.generateContent(prompt)
  return { text: result.response.text() }
}

async function handleGeneratePostCaptureInsight(genAI: GoogleGenerativeAI, payload: any): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload
  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: temperature || 0.7, maxOutputTokens: maxOutputTokens || 200 } })
  const result = await model.generateContent(prompt)
  return { text: result.response.text() }
}

async function handleClusterMomentsByTheme(genAI: GoogleGenerativeAI, payload: any): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload
  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: temperature || 0.6, maxOutputTokens: maxOutputTokens || 500 } })
  const result = await model.generateContent(prompt)
  return { text: result.response.text() }
}

// ============================================================================
// DAILY REPORT HANDLER
// ============================================================================

async function handleGenerateDailyReport(genAI: GoogleGenerativeAI, payload: DailyReportPayload): Promise<DailyReportResult> {
  const { date, tasksCompleted, tasksTotal, productivityScore, moodScore, energyLevel, activeModules, content } = payload

  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 1024 } })
  const completionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0

  const prompt = `Voce e um coach de produtividade e bem-estar. Gere um relatorio diario baseado nos dados abaixo:

Data: ${date}
Tarefas concluidas: ${tasksCompleted} de ${tasksTotal} (${completionRate}%)
Score de produtividade: ${productivityScore}%
${moodScore !== undefined ? `Score de humor: ${moodScore} (-1 a 1)` : ''}
${energyLevel !== undefined ? `Nivel de energia: ${energyLevel}%` : ''}
${activeModules?.length ? `Modulos ativos: ${activeModules.join(', ')}` : ''}
${content ? `Contexto adicional: ${content}` : ''}

Retorne um JSON com:
{
  "summary": "Resumo de 2-3 frases sobre o dia",
  "insights": ["3-4 insights sobre padroes e comportamentos observados"],
  "recommendations": ["2-3 recomendacoes praticas para melhoria"],
  "motivationalMessage": "Mensagem motivacional personalizada de 1-2 frases"
}

Seja empatico, construtivo e especifico. Retorne APENAS JSON valido.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  let parsed: DailyReportResult
  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[generate_daily_report] Failed to parse JSON:', text)
    return {
      summary: `Hoje voce completou ${tasksCompleted} de ${tasksTotal} tarefas.`,
      insights: ['Continue acompanhando seu progresso diariamente.'],
      recommendations: ['Defina prioridades claras para amanha.'],
      motivationalMessage: 'Cada dia e uma nova oportunidade de crescimento!'
    }
  }

  parsed.summary = parsed.summary || 'Relatorio do dia gerado com sucesso.'
  parsed.insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 4) : []
  parsed.recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : []
  parsed.motivationalMessage = parsed.motivationalMessage || 'Continue assim!'

  return parsed
}

// ============================================================================
// MAIN SERVER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY nao configurada')
      return new Response(JSON.stringify({ error: 'API key nao configurada no servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const body = await req.json()

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
        case 'generate_dossier':
          result = await handleGenerateDossier(genAI, payload as GenerateDossierPayload)
          break
        case 'generate_ice_breakers':
          result = await handleGenerateIceBreakers(genAI, payload as IceBreakerPayload)
          break
        case 'generate_pauta_questions':
          result = await handleGeneratePautaQuestions(genAI, payload as PautaQuestionsPayload)
          break
        case 'generate_pauta_outline':
          result = await handleGeneratePautaOutline(genAI, payload as PautaOutlinePayload)
          break
        case 'finance_chat':
          const chatResult = await handleLegacyChat(genAI, { message: payload?.message, context: payload?.context, history: payload?.history, systemPrompt: payload?.systemPrompt })
          result = chatResult
          break
        case 'analyze_content_realtime':
          result = await handleAnalyzeContentRealtime(genAI, payload)
          break
        case 'generate_post_capture_insight':
          result = await handleGeneratePostCaptureInsight(genAI, payload)
          break
        case 'cluster_moments_by_theme':
          result = await handleClusterMomentsByTheme(genAI, payload)
          break
        case 'whatsapp_sentiment':
        case 'sentiment_analysis':
          result = await handleWhatsAppSentiment(genAI, payload as WhatsAppSentimentPayload)
          break
        case 'generate_daily_report':
          result = await handleGenerateDailyReport(genAI, payload as DailyReportPayload)
          break
        default:
          return new Response(JSON.stringify({ error: `Action desconhecida: ${action}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const latencyMs = Date.now() - startTime
      console.log(`[gemini-chat] Action ${action} completed in ${latencyMs}ms`)

      return new Response(JSON.stringify({ result, success: true, latencyMs, cached: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } else {
      const result = await handleLegacyChat(genAI, body as ChatRequest)
      console.log('[gemini-chat] Legacy chat response generated')
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

  } catch (error) {
    const err = error as Error
    console.error('[gemini-chat] Error:', err.message)
    let statusCode = 500
    if (err.message.includes('obrigatorio') || err.message.includes('deve ser')) statusCode = 400
    return new Response(JSON.stringify({ error: err.message || 'Erro interno do servidor', success: false }), { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
