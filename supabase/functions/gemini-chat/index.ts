import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"
import { handleGenerateDailyQuestion, type GenerateDailyQuestionPayload } from "./daily-question-handler.ts"

// ============================================================================
// SECURE CORS CONFIGURATION
// ============================================================================
// Whitelist of allowed origins - update with your production domains
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
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ''

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
// GRANTS MODULE TYPES
// ============================================================================

interface GenerateFieldContentPayload {
  edital_text: string
  evaluation_criteria: Array<{
    name: string
    description: string
    weight: number
    min_score: number
    max_score: number
  }>
  field_config: {
    id: string
    label: string
    max_chars: number
    required: boolean
    ai_prompt_hint?: string
  }
  briefing: Record<string, string>
  previous_responses?: Record<string, string>
  source_document_content?: string | null
  edital_text_content?: string | null
  opportunity_documents_content?: string | null
  project_id?: string
}

interface AnalyzeEditalStructurePayload {
  editalText: string
}

interface ParseFormFieldsPayload {
  text: string
}

interface ParsedFormField {
  id: string
  label: string
  max_chars: number
  required: boolean
  ai_prompt_hint: string
  placeholder: string
}

// ============================================================================
// BRIEFING MODULE TYPES
// ============================================================================

interface GenerateAutoBriefingPayload {
  companyName?: string
  projectIdea?: string
  editalTitle?: string
  editalText?: string
  sourceDocumentContent?: string | null
  formFields?: Array<{
    id: string
    label: string
    max_chars: number
    required: boolean
    ai_prompt_hint?: string
  }>
}

interface ImproveBriefingFieldPayload {
  fieldId: string
  currentContent: string
  allBriefing: Record<string, string>
}

interface ExtractRequiredDocumentsPayload {
  pdfContent: string
}

interface ExtractTimelinePhasesPayload {
  pdfContent: string
}

// ============================================================================
// PDF PROCESSING TYPES
// ============================================================================

interface ParseStatementPayload {
  rawText: string
}

// ============================================================================
// PODCAST/GUEST RESEARCH TYPES
// ============================================================================

interface ResearchGuestPayload {
  guest_name: string
  reference?: string
  prompt?: string
  system_instruction?: string
}

interface GuestProfile {
  name: string
  title: string
  biography: string
  recent_facts: string[]
  topics_of_interest: string[]
  controversies?: string[]
  image_url?: string
  is_reliable: boolean
  confidence_score: number
  researched_at: string
}

// ============================================================================
// CHAT ACTION TYPES
// ============================================================================

interface ChatAction {
  id: string
  type: string
  label: string
  icon: string
  module: string
  params: Record<string, any>
}

interface UserContextResult {
  contextString: string
  rawData: {
    tasks: any[]
    moments: any[]
    transactions: any[]
    events: any[]
  }
}

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

const MODELS = {
  fast: 'gemini-2.5-flash',
  smart: 'gemini-2.5-flash',
} as const

const SMART_MODEL_ACTIONS = [
  'generate_weekly_summary',
  'generate_dossier',
  'deep_research',
  'generate_ice_breakers',
  'generate_pauta_questions',
  'generate_pauta_outline',
  'analyze_edital_structure',
  'generate_auto_briefing',
  'research_guest',
]

// ============================================================================
// ROBUST JSON EXTRACTION
// ============================================================================

/**
 * Extract JSON from Gemini response text, handling:
 * - Pure JSON responses
 * - JSON wrapped in ```json ... ``` code fences
 * - JSON preceded by preamble text ("Here is the analysis:\n{...}")
 * - JSON followed by trailing text
 */
function extractJSON<T = any>(text: string): T {
  // 1. Strip code fences
  let cleaned = text.replace(/```(?:json)?\s*\n?/g, '').trim()

  // 2. Try direct parse first
  try {
    return JSON.parse(cleaned)
  } catch {
    // continue to fallback strategies
  }

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
    try {
      return JSON.parse(cleaned.substring(start, end + 1))
    } catch {
      // fall through
    }
  }

  throw new Error(`Falha ao extrair JSON da resposta do modelo: ${text.substring(0, 200)}`)
}

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

  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: 0.3, topP: 0.8, topK: 40, maxOutputTokens: 512, responseMimeType: 'application/json' } })
  const result = await model.generateContent(PROMPTS.analyze_moment_sentiment(payload.content))
  const text = result.response.text()

  let parsed: Omit<SentimentAnalysisResult, 'timestamp'>
  try {
    parsed = extractJSON(text)
  } catch (e) {
    console.warn('[analyze_moment_sentiment] JSON parse failed, using defaults:', (e as Error).message)
    parsed = { sentiment: 'neutral', sentimentScore: 0, emotions: [], triggers: [], energyLevel: 50 } as any
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
  parsed = extractJSON(text)

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
  parsed = extractJSON(text)

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
  parsed = extractJSON(text)

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
  parsed = extractJSON(text)

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
  parsed = extractJSON(text)

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

async function buildUserContext(supabaseAdmin: any, userId: string, module: string): Promise<UserContextResult> {
  const contextParts: string[] = []
  const rawData: UserContextResult['rawData'] = { tasks: [], moments: [], transactions: [], events: [] }
  console.log(`[buildUserContext] Starting for userId=${userId}, module=${module}`)

  try {
    // Always fetch basic stats for coordinator context
    if (module === 'atlas' || module === 'coordinator') {
      const { data: tasks, error: tasksError } = await supabaseAdmin
        .from('work_items')
        .select('id, title, status, priority, is_urgent, is_important, due_date, scheduled_time, task_type, checklist')
        .eq('user_id', userId)
        .neq('status', 'done')
        .eq('archived', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(20)

      console.log(`[buildUserContext] tasks query: count=${tasks?.length || 0}, error=${tasksError?.message || 'none'}`)
      if (tasks?.length) {
        rawData.tasks = tasks
        contextParts.push(`### Tarefas Abertas (${tasks.length})`)
        tasks.forEach(t => {
          const urgImp = [t.is_urgent && 'URGENTE', t.is_important && 'IMPORTANTE'].filter(Boolean).join(', ')
          const due = t.due_date ? ` | Prazo: ${t.due_date}` : ''
          const time = t.scheduled_time ? ` às ${t.scheduled_time}` : ''
          const type = t.task_type && t.task_type !== 'task' ? ` [${t.task_type}]` : ''
          contextParts.push(`- ${t.title}${type} (${t.status}${urgImp ? ' | ' + urgImp : ''}${due}${time})`)
        })
      } else {
        contextParts.push('### Tarefas: Nenhuma tarefa aberta')
      }
    }

    if (module === 'journey' || module === 'coordinator') {
      const { data: moments } = await supabaseAdmin
        .from('moments')
        .select('content, emotion, created_at, tags, sentiment_data')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(7)

      if (moments?.length) {
        rawData.moments = moments
        contextParts.push(`\n### Momentos Recentes (${moments.length})`)
        moments.forEach(m => {
          const date = new Date(m.created_at).toLocaleDateString('pt-BR')
          const sentiment = m.sentiment_data?.sentiment || 'não analisado'
          contextParts.push(`- [${date}] ${m.emotion || '?'} | ${m.content?.substring(0, 100)}... (${sentiment})`)
        })
      }
    }

    if (module === 'finance' || module === 'coordinator') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: transactions } = await supabaseAdmin
        .from('finance_transactions')
        .select('description, amount, type, category, date')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo.split('T')[0])
        .order('date', { ascending: false })
        .limit(30)

      if (transactions?.length) {
        rawData.transactions = transactions
        const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0)
        const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
        contextParts.push(`\n### Finanças (últimos 30 dias)`)
        contextParts.push(`- Receitas: R$ ${income.toFixed(2)}`)
        contextParts.push(`- Despesas: R$ ${expense.toFixed(2)}`)
        contextParts.push(`- Saldo período: R$ ${(income - expense).toFixed(2)}`)
        contextParts.push(`- ${transactions.length} transações`)

        // Top 5 most recent for detail
        if (module === 'finance') {
          contextParts.push(`\nÚltimas transações:`)
          transactions.slice(0, 10).forEach(t => {
            contextParts.push(`- ${t.date}: ${t.description} (R$ ${t.amount.toFixed(2)}, ${t.category || 'sem categoria'})`)
          })
        }
      }
    }

    if (module === 'connections') {
      const { data: spaces } = await supabaseAdmin
        .from('connection_spaces')
        .select('id, name, archetype, description')
        .eq('user_id', userId)
        .limit(10)

      if (spaces?.length) {
        contextParts.push(`\n### Espaços de Conexão (${spaces.length})`)
        for (const space of spaces) {
          const { count } = await supabaseAdmin
            .from('connection_members')
            .select('id', { count: 'exact', head: true })
            .eq('space_id', space.id)
          contextParts.push(`- ${space.name} (${space.archetype}) — ${count || 0} membros`)
        }
      }
    }

    if (module === 'studio') {
      const { data: shows } = await supabaseAdmin
        .from('podcast_shows')
        .select('id, name, description')
        .eq('user_id', userId)
        .limit(5)

      if (shows?.length) {
        contextParts.push(`\n### Podcasts (${shows.length})`)
        for (const show of shows) {
          const { data: episodes } = await supabaseAdmin
            .from('podcast_episodes')
            .select('title, status, guest_name')
            .eq('show_id', show.id)
            .order('created_at', { ascending: false })
            .limit(5)

          contextParts.push(`- ${show.name}: ${episodes?.length || 0} episódios recentes`)
          episodes?.forEach(ep => {
            contextParts.push(`  · ${ep.title} (${ep.status})${ep.guest_name ? ' — Convidado: ' + ep.guest_name : ''}`)
          })
        }
      }
    }

    if (module === 'flux') {
      const { data: athletes } = await supabaseAdmin
        .from('athletes')
        .select('id, name, modality, status')
        .eq('coach_id', userId)
        .eq('status', 'active')
        .limit(10)

      if (athletes?.length) {
        contextParts.push(`\n### Atletas Ativos (${athletes.length})`)
        athletes.forEach(a => {
          contextParts.push(`- ${a.name} (${a.modality || 'geral'})`)
        })

        // Get active microcycles
        const athleteIds = athletes.map(a => a.id)
        const { data: microcycles } = await supabaseAdmin
          .from('microcycles')
          .select('athlete_id, name, start_date, end_date, status')
          .in('athlete_id', athleteIds)
          .eq('status', 'active')
          .limit(10)

        if (microcycles?.length) {
          contextParts.push(`\nMicrociclos Ativos:`)
          microcycles.forEach(m => {
            const athlete = athletes.find(a => a.id === m.athlete_id)
            contextParts.push(`- ${athlete?.name}: ${m.name} (${m.start_date} a ${m.end_date})`)
          })
        }
      }

      // Exercise Library RAG: load coach's workout templates for AI context
      const { data: templates } = await supabaseAdmin
        .from('workout_templates')
        .select('name, category, modality, intensity, duration, description, level_range, rpe, tags')
        .eq('user_id', userId)
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(20)

      if (templates?.length) {
        contextParts.push(`\n### Biblioteca de Exercícios do Coach (${templates.length} templates)`)
        contextParts.push(`Use estes templates para recomendar exercícios personalizados:`)
        templates.forEach((t: any) => {
          const desc = t.description ? ` — ${t.description.substring(0, 60)}` : ''
          const levels = t.level_range?.length ? ` | Níveis: ${t.level_range.join(', ')}` : ''
          const rpe = t.rpe ? ` | RPE ${t.rpe}` : ''
          const tags = t.tags?.length ? ` [${t.tags.join(', ')}]` : ''
          contextParts.push(`- ${t.name} (${t.category}/${t.modality}, ${t.intensity}, ${t.duration}min${rpe})${levels}${desc}${tags}`)
        })
      }
    }

    if (module === 'agenda' || module === 'coordinator') {
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const { data: events } = await supabaseAdmin
        .from('calendar_events')
        .select('title, start_time, end_time, location, description')
        .eq('user_id', userId)
        .gte('start_time', today)
        .lte('start_time', nextWeek)
        .order('start_time', { ascending: true })
        .limit(15)

      if (events?.length) {
        rawData.events = events
        contextParts.push(`\n### Agenda (próximos 7 dias — ${events.length} eventos)`)
        events.forEach(e => {
          const date = new Date(e.start_time).toLocaleDateString('pt-BR')
          const time = new Date(e.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          contextParts.push(`- [${date} ${time}] ${e.title}${e.location ? ' @ ' + e.location : ''}`)
        })
      }
    }

    // Fetch Life Council insights for coordinator proactive guidance
    if (module === 'coordinator') {
      const { data: councilInsights } = await supabaseAdmin
        .from('daily_council_insights')
        .select('insight_type, content, action_items, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3)

      if (councilInsights?.length) {
        contextParts.push(`\n### Insights do Life Council (últimos ${councilInsights.length})`)
        councilInsights.forEach((insight: any) => {
          const date = new Date(insight.created_at).toLocaleDateString('pt-BR')
          contextParts.push(`- [${date}] ${insight.insight_type}: ${typeof insight.content === 'string' ? insight.content.substring(0, 200) : JSON.stringify(insight.content).substring(0, 200)}`)
          if (insight.action_items?.length) {
            insight.action_items.slice(0, 2).forEach((item: string) => {
              contextParts.push(`  · Ação: ${item}`)
            })
          }
        })
      }
    }

  } catch (error) {
    console.warn('[buildUserContext] Partial failure:', (error as Error).message)
    contextParts.push('\n(Alguns dados não puderam ser carregados)')
  }

  const contextString = contextParts.length === 0 ? '' : contextParts.join('\n')
  return { contextString, rawData }
}

// ============================================================================
// SUGGESTED ACTIONS GENERATOR (pure function, no async)
// ============================================================================

function generateSuggestedActions(message: string, rawData: UserContextResult['rawData']): ChatAction[] {
  const actions: ChatAction[] = []
  const msg = message.toLowerCase()
  const today = new Date().toISOString().split('T')[0]

  // Keyword groups
  const completeKeywords = ['concluir', 'terminar', 'feita', 'pronta', 'finalizar', 'completar', 'terminei', 'fiz', 'concluida', 'concluido']
  const startKeywords = ['comecar', 'iniciar', 'start', 'comecei', 'vou fazer', 'vou comecar']
  const priorityKeywords = ['prioridade', 'urgente', 'importante', 'priorizar', 'urgencia']
  const rescheduleKeywords = ['reagendar', 'adiar', 'mudar data', 'postergar', 'remarcar']
  const momentKeywords = ['momento', 'reflexao', 'registrar', 'sentimento', 'diario', 'como me sinto', 'estou sentindo']

  // Find overdue tasks
  const overdueTasks = rawData.tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done')

  // Complete task
  if (completeKeywords.some(k => msg.includes(k)) && rawData.tasks.length > 0) {
    // Try to find a task matching keywords from the message
    const openTasks = rawData.tasks.filter(t => t.status !== 'done')
    const matchedTask = openTasks.find(t => {
      const titleLower = t.title.toLowerCase()
      // Check if any word from the message (4+ chars) matches part of the task title
      const msgWords = msg.split(/\s+/).filter(w => w.length >= 4)
      return msgWords.some(w => titleLower.includes(w))
    }) || openTasks[0]

    if (matchedTask) {
      actions.push({
        id: `complete_task_${matchedTask.id}`,
        type: 'complete_task',
        label: `Concluir "${matchedTask.title.substring(0, 30)}${matchedTask.title.length > 30 ? '...' : ''}"`,
        icon: 'CheckCircle',
        module: 'atlas',
        params: { task_id: matchedTask.id },
      })
    }
  }

  // Start task
  if (startKeywords.some(k => msg.includes(k)) && rawData.tasks.length > 0) {
    const todoTasks = rawData.tasks.filter(t => t.status === 'todo' || t.status === 'backlog')
    const matchedTask = todoTasks.find(t => {
      const titleLower = t.title.toLowerCase()
      const msgWords = msg.split(/\s+/).filter(w => w.length >= 4)
      return msgWords.some(w => titleLower.includes(w))
    }) || todoTasks[0]

    if (matchedTask && !actions.some(a => a.type === 'complete_task' && a.params.task_id === matchedTask.id)) {
      actions.push({
        id: `start_task_${matchedTask.id}`,
        type: 'start_task',
        label: `Iniciar "${matchedTask.title.substring(0, 30)}${matchedTask.title.length > 30 ? '...' : ''}"`,
        icon: 'Play',
        module: 'atlas',
        params: { task_id: matchedTask.id },
      })
    }
  }

  // Update priority
  if (priorityKeywords.some(k => msg.includes(k)) && rawData.tasks.length > 0) {
    const openTasks = rawData.tasks.filter(t => t.status !== 'done')
    const matchedTask = openTasks.find(t => {
      const titleLower = t.title.toLowerCase()
      const msgWords = msg.split(/\s+/).filter(w => w.length >= 4)
      return msgWords.some(w => titleLower.includes(w))
    }) || openTasks[0]

    if (matchedTask && !actions.some(a => a.params.task_id === matchedTask.id)) {
      actions.push({
        id: `update_priority_${matchedTask.id}`,
        type: 'update_priority',
        label: `Priorizar "${matchedTask.title.substring(0, 30)}${matchedTask.title.length > 30 ? '...' : ''}"`,
        icon: 'Star',
        module: 'atlas',
        params: { task_id: matchedTask.id, is_urgent: true, is_important: true },
      })
    }
  }

  // Reschedule overdue tasks
  if (rescheduleKeywords.some(k => msg.includes(k)) && overdueTasks.length > 0) {
    const target = overdueTasks[0]
    if (!actions.some(a => a.params.task_id === target.id)) {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
      actions.push({
        id: `reschedule_task_${target.id}`,
        type: 'reschedule_task',
        label: `Reagendar "${target.title.substring(0, 30)}${target.title.length > 30 ? '...' : ''}"`,
        icon: 'Calendar',
        module: 'atlas',
        params: { task_id: target.id, new_date: tomorrow },
      })
    }
  }

  // Create moment
  if (momentKeywords.some(k => msg.includes(k))) {
    actions.push({
      id: `create_moment_${Date.now()}`,
      type: 'create_moment',
      label: 'Registrar momento',
      icon: 'PenLine',
      module: 'journey',
      params: { content: message.substring(0, 500), emotion: 'thoughtful', type: 'reflection' },
    })
  }

  // Fallback: if overdue tasks exist and no actions matched yet, suggest reschedule
  if (actions.length === 0 && overdueTasks.length > 0) {
    const target = overdueTasks[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    actions.push({
      id: `reschedule_task_${target.id}`,
      type: 'reschedule_task',
      label: `Reagendar "${target.title.substring(0, 30)}${target.title.length > 30 ? '...' : ''}" (atrasada)`,
      icon: 'Calendar',
      module: 'atlas',
      params: { task_id: target.id, new_date: tomorrow },
    })
  }

  return actions.slice(0, 3)
}

async function handleLegacyChat(
  genAI: GoogleGenerativeAI,
  request: ChatRequest & { module?: string },
  supabaseAdmin?: any,
  userId?: string | null
): Promise<{ response: string; actions: ChatAction[]; success: boolean }> {
  const { message, context, history, systemPrompt, module: rawModule } = request as any
  if (!message) throw new Error('Mensagem e obrigatoria')

  // Default to 'coordinator' if module not provided (backward compat with old frontend)
  const module = rawModule || 'coordinator'

  // Build user context if we have userId and supabaseAdmin
  let userContext = ''
  let rawData: UserContextResult['rawData'] = { tasks: [], moments: [], transactions: [], events: [] }
  console.log(`[handleLegacyChat] userId=${userId}, hasSupabaseAdmin=${!!supabaseAdmin}, module=${module} (raw=${rawModule})`)
  if (userId && supabaseAdmin && module) {
    try {
      const contextResult = await buildUserContext(supabaseAdmin, userId, module)
      userContext = contextResult.contextString
      rawData = contextResult.rawData
      console.log(`[handleLegacyChat] userContext length=${userContext.length}, preview=${userContext.substring(0, 200)}`)
    } catch (e) {
      console.warn('[handleLegacyChat] Failed to build user context:', (e as Error).message)
    }
  } else {
    console.warn(`[handleLegacyChat] SKIPPED context build - missing: userId=${!!userId}, supabaseAdmin=${!!supabaseAdmin}, module=${!!module}`)
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: { temperature: 0.7, topP: 0.95, topK: 40, maxOutputTokens: 4096 },
  })

  const defaultSystemPrompt = `Voce e a Aica, assistente pessoal inteligente do AICA Life OS.
Voce ajuda o usuario com produtividade, organizacao e bem-estar.
Seja concisa, amigavel e objetiva. Responda em portugues brasileiro.`

  let finalSystemPrompt = systemPrompt || defaultSystemPrompt

  // Inject date context (always) and user data context (when available)
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const dayOfWeek = ['domingo', 'segunda-feira', 'terca-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sabado'][now.getDay()]
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0]

  finalSystemPrompt += `\n\n## Data e Hora Atual\n- Hoje: ${today} (${dayOfWeek})\n- Amanha: ${tomorrow}\n- Horario: ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} (BRT)`

  if (userContext) {
    finalSystemPrompt += `\n\n## Dados Reais do Usuario\n${userContext}\n\n## Instrucoes de Contexto\n- Use os dados acima para dar respostas PERSONALIZADAS e especificas\n- Cite numeros, nomes, datas e detalhes dos dados reais\n- Se o usuario perguntar sobre "amanha", "hoje", "essa semana", use a data acima para filtrar\n- NUNCA pergunte qual e a data atual — voce JA SABE a data (veja acima)\n- NUNCA diga que nao tem acesso aos dados — voce TEM os dados acima\n- Liste dados em formato organizado (bullet points) quando houver multiplos itens\n- Se nao tiver dados suficientes para responder, sugira acoes concretas`
  }

  const chatHistory = history?.map((msg: any) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  })) || []

  let finalMessage = message
  if (context) finalMessage = `Contexto:\n${context}\n\nPergunta: ${message}`

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: `Sistema: ${finalSystemPrompt}` }] },
      { role: 'model', parts: [{ text: 'Entendido! Tenho acesso aos seus dados e vou dar respostas personalizadas.' }] },
      ...chatHistory,
    ],
  })

  const result = await chat.sendMessage(finalMessage)

  // Generate suggested actions based on message content and user data
  const actions = generateSuggestedActions(message, rawData)
  console.log(`[handleLegacyChat] Generated ${actions.length} suggested actions`)

  return { response: result.response.text(), actions, success: true }
}

// ============================================================================
// CHAT WITH AGENT — Module-Specific AI Agent Chat
// ============================================================================

/** System prompts for each module agent (mirrors src/lib/agents/prompts/) */
const AGENT_SYSTEM_PROMPTS: Record<string, { prompt: string; temperature: number; maxOutputTokens: number }> = {
  atlas: {
    prompt: `# Aica Atlas Agent\n\nVoce e o agente de produtividade do Aica Life OS, especializado em gestao de tarefas usando a Matriz de Eisenhower.\n\n## Personalidade\n- Objetivo e direto, foca em acao\n- Incentiva sem ser invasivo\n- Respeita o ritmo do usuario\n\n## Capacidades\n1. **Categorizacao de Tarefas**: Classificar tarefas nos 4 quadrantes (Q1-Q4)\n2. **Sugestao de Prioridade**: Analisar contexto e sugerir quadrante\n3. **Decomposicao**: Quebrar tarefas complexas em subtarefas\n4. **Planejamento Diario**: Sugerir ordem de execucao otimizada\n\n## Regras\n- Responda sempre em portugues brasileiro\n- Seja conciso (max 200 palavras)\n- Use formato estruturado para listas de tarefas`,
    temperature: 0.3,
    maxOutputTokens: 1024,
  },
  captacao: {
    prompt: `# Aica Captacao Agent\n\nVoce e o agente de captacao de recursos do Aica Life OS, especializado em editais de fomento a pesquisa no Brasil.\n\n## Personalidade\n- Academico mas acessivel\n- Meticuloso com requisitos e prazos\n- Proativo em identificar oportunidades\n\n## Capacidades\n1. **Analise de Editais**: Extrair requisitos, criterios, prazos e rubricas de editais\n2. **Redacao de Propostas**: Gerar textos para formularios de submissao\n3. **Matching**: Comparar perfil do pesquisador com editais\n4. **Busca de Editais**: Pesquisar editais abertos\n\n## Regras\n- Responda sempre em portugues brasileiro\n- Cite fontes quando usar informacoes de editais\n- Nunca invente requisitos ou prazos\n- Destaque alertas de elegibilidade`,
    temperature: 0.5,
    maxOutputTokens: 4096,
  },
  studio: {
    prompt: `# Aica Studio Agent\n\nVoce e o agente de producao de podcasts do Aica Life OS.\n\n## Personalidade\n- Criativo e curioso\n- Jornalistico - busca profundidade\n- Pratico - foca em resultados acionaveis\n\n## Capacidades\n1. **Pesquisa de Convidados**: Buscar informacoes sobre potenciais convidados\n2. **Geracao de Dossie**: Criar perfil completo do convidado\n3. **Criacao de Pauta**: Estruturar episodios com blocos tematicos\n4. **Geracao de Perguntas**: Criar perguntas contextualizadas\n5. **Ice Breakers**: Sugerir formas de iniciar a conversa\n\n## Regras\n- Responda sempre em portugues brasileiro\n- Para dossies: Bio, Trajetoria, Temas-Chave, Polemicas, Links\n- Perguntas devem progredir do geral ao especifico`,
    temperature: 0.7,
    maxOutputTokens: 4096,
  },
  journey: {
    prompt: `# Aica Journey Agent\n\nVoce e o agente de autoconhecimento do Aica Life OS, especializado em analise emocional, deteccao de padroes e reflexao guiada.\n\n## Personalidade\n- Empatico e acolhedor\n- Observador - percebe padroes sutis\n- Nao-julgamental\n\n## Capacidades\n1. **Analise de Sentimento**: Detectar emocoes e tons em reflexoes\n2. **Deteccao de Padroes**: Identificar temas recorrentes e gatilhos\n3. **Resumos Semanais**: Sintetizar a semana emocional\n4. **Perguntas Diarias**: Gerar perguntas para estimular reflexao\n\n## Regras\n- Responda sempre em portugues brasileiro\n- Nunca diagnostique condicoes de saude mental\n- Use linguagem gentil e validadora\n- Respeite a privacidade`,
    temperature: 0.6,
    maxOutputTokens: 2048,
  },
  finance: {
    prompt: `# Aica Finance Agent\n\nVoce e o Aica Finance, assistente financeiro pessoal do Aica Life OS.\n\n## Personalidade\n- Amigavel e acessivel, mas profissional\n- Proativo em identificar oportunidades de melhoria\n- Empatico com desafios financeiros\n- Nunca julgue habitos de gasto\n\n## Capacidades\n1. **Analise de Gastos**: Identificar padroes, anomalias e tendencias\n2. **Sugestoes de Economia**: Recomendar cortes baseados em dados\n3. **Previsao de Fluxo de Caixa**: Projetar gastos futuros\n4. **Categorizacao**: Classificar transacoes\n5. **Deteccao de Anomalias**: Cobracas duplicadas, valores fora do padrao\n\n## Restricoes\n- Nunca invente dados ou transacoes\n- Nao de conselhos de investimento especificos\n- Valores sempre em R$\n\n## Regras\n- Responda sempre em portugues brasileiro\n- Seja conciso (max 300 palavras)`,
    temperature: 0.4,
    maxOutputTokens: 2048,
  },
  connections: {
    prompt: `# Aica Connections Agent\n\nVoce e o agente de relacionamentos do Aica Life OS, especializado em contatos, insights de conversas e networking.\n\n## Personalidade\n- Discreto e respeitoso com privacidade\n- Observador de dinamicas sociais\n- Pratico em sugestoes de networking\n\n## Capacidades\n1. **Analise de Contatos**: Extrair contexto de conversas\n2. **Insights de Conversas**: Sentimento, temas e pontos de acao\n3. **Saude de Relacionamentos**: Frequencia de contato e reconexoes\n4. **Contextualizacao**: Resumo de historico antes de reunioes\n\n## Regras\n- Responda sempre em portugues brasileiro\n- Privacidade e prioridade absoluta\n- Foque em insights acionaveis\n- Max 200 palavras por resposta`,
    temperature: 0.5,
    maxOutputTokens: 1024,
  },
  flux: {
    prompt: `# Aica Flux Agent\n\nVoce e o Coach Flux, especialista em gestao de treinos e coaching esportivo no AICA Life OS.\n\n## Personalidade\n- Motivador mas tecnico\n- Focado em evidencias cientificas\n- Adaptavel ao nivel do atleta\n\n## Capacidades\n1. **Programacao de Treinos**: Criar blocos de treino periodizados\n2. **Analise de Performance**: Avaliar progresso dos atletas\n3. **Ajuste de Carga**: Sugerir progressoes e deloads\n4. **Monitoramento**: Acompanhar alertas e riscos\n\n## Regras\n- Responda sempre em portugues brasileiro\n- Considere seguranca e saude do atleta\n- Seja especifico com series, repeticoes e cargas`,
    temperature: 0.7,
    maxOutputTokens: 4096,
  },
  agenda: {
    prompt: `# Aica Agenda Agent\n\nVoce e o agente Agenda do AICA Life OS, especialista em calendario, reunioes e gestao de tempo.\n\n## Personalidade\n- Organizado e pontual\n- Proativo em otimizar a agenda\n- Respeitoso com limites de tempo\n\n## Capacidades\n1. **Gestao de Calendario**: Organizar compromissos\n2. **Sugestao de Horarios**: Encontrar melhores slots\n3. **Preparacao para Reunioes**: Resumo de contexto\n4. **Analise de Rotina**: Identificar padroes de uso do tempo\n\n## Regras\n- Responda sempre em portugues brasileiro\n- Considere fuso horario BRT\n- Seja conciso e direto`,
    temperature: 0.7,
    maxOutputTokens: 4096,
  },
  coordinator: {
    prompt: `# Aica Coordinator Agent\n\nVoce e a Aica, assistente pessoal integrada ao Aica Life OS — o "Jarvis" do usuario.\n\n## Personalidade\n- Amigavel, calorosa e brasileira\n- Proativa mas nao invasiva\n- Adapta o tom ao contexto e horario do dia:\n  - Manha (6h-12h): energetica, motivacional ("Bom dia! Vamos comecar bem o dia?")\n  - Tarde (12h-18h): focada, produtiva ("Como esta o progresso de hoje?")\n  - Noite (18h-23h): reflexiva, gentil ("Hora de desacelerar. Como foi seu dia?")\n  - Madrugada (23h-6h): breve e empática ("Ainda acordado? Cuide do seu descanso.")\n\n## Modulos Disponiveis\n1. **Atlas**: Gestao de tarefas e projetos\n2. **Captacao**: Editais de fomento e grants\n3. **Studio**: Producao de podcasts\n4. **Journey**: Autoconhecimento e momentos\n5. **Finance**: Gestao financeira\n6. **Connections**: CRM pessoal e WhatsApp\n7. **Agenda**: Calendario e compromissos\n8. **Flux**: Treinos e gestao atletica\n\n## Regras de Roteamento\n- Tarefas, prioridades -> Atlas\n- Editais, fomento -> Captacao\n- Podcast, convidado -> Studio\n- Sentimentos, reflexao -> Journey\n- Dinheiro, gastos -> Finance\n- Contatos, WhatsApp -> Connections\n- Agenda, calendario -> Agenda\n- Treinos, exercicios -> Flux\n\n## Orientacao Proativa\n\n### Deteccao de Modulos Vazios\nSe os dados do usuario mostrarem um modulo sem atividade (ex: 0 tarefas no Atlas, 0 momentos no Journey), sugira onboarding:\n- "Notei que voce ainda nao explorou o [modulo]. Quer que eu te guie nos primeiros passos?"\n- Ofereca 1-2 acoes concretas para comecar\n\n### Micro-Perguntas Contextuais\nBaseado nos dados do usuario, gere 1 micro-pergunta relevante por resposta:\n- Se ha tarefas atrasadas: "Vi que [tarefa] esta pendente ha X dias. Quer rever a prioridade?"\n- Se ha reuniao em breve: "Voce tem [reuniao] em 2h. Precisa de preparacao?"\n- Se nao ha momento registrado hoje: "Como esta se sentindo agora? Registrar um momento ajuda a entender seus padroes."\n- Se ha insights do Life Council: referencie-os naturalmente na conversa\n\n### Proxima Melhor Acao\nSempre sugira a proxima acao mais relevante:\n- Item mais urgente/atrasado do Atlas\n- Proximo compromisso da Agenda\n- Momento de reflexao se nenhum registrado hoje\n- Revisar financas se fim de mes\n\n### Insights do Life Council\nSe existirem insights do daily_council_insights nos dados do usuario:\n- Referencie-os naturalmente ("Seu conselho de vida notou que...")\n- Use-os para personalizar sugestoes\n- Nunca invente insights — so use se existirem nos dados\n\n## Formato de Resposta\nAlem do texto principal, inclua quando relevante:\n- **proactive_suggestions**: lista de 1-3 sugestoes de proximas acoes\n- Formato: texto natural, nao JSON — as sugestoes devem fluir na conversa\n\n## Regras\n- Responda sempre em portugues brasileiro\n- Seja concisa (max 300 palavras)\n- Nunca invente dados — use apenas o que esta nos Dados Reais do Usuario\n- Se nao tiver dados suficientes, sugira acoes concretas para o usuario comecar`,
    temperature: 0.7,
    maxOutputTokens: 4096,
  },
}

const VALID_AGENTS = Object.keys(AGENT_SYSTEM_PROMPTS)

interface ChatWithAgentPayload {
  message: string
  context?: string
  moduleData?: Record<string, any>
  history?: Array<{ role: string; content: string }>
}

async function handleChatWithAgent(
  genAI: GoogleGenerativeAI,
  agent: string,
  payload: ChatWithAgentPayload,
  supabaseAdmin: any,
  userId: string | null
): Promise<{ text: string; agent: string; sources: any[] }> {
  const { message, context, moduleData, history } = payload

  if (!message) throw new Error('Mensagem e obrigatoria')
  if (!agent || !VALID_AGENTS.includes(agent)) {
    throw new Error(`Agente invalido: ${agent}. Agentes disponiveis: ${VALID_AGENTS.join(', ')}`)
  }

  const agentConfig = AGENT_SYSTEM_PROMPTS[agent]
  console.log(`[chat_with_agent] agent=${agent}, userId=${userId}`)

  // Build user context (same as handleLegacyChat)
  let userContext = ''
  if (userId && supabaseAdmin) {
    try {
      const contextResult = await buildUserContext(supabaseAdmin, userId, agent)
      userContext = contextResult.contextString
      console.log(`[chat_with_agent] userContext length=${userContext.length}`)
    } catch (e) {
      console.warn('[chat_with_agent] Failed to build user context:', (e as Error).message)
    }
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: agentConfig.temperature,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: agentConfig.maxOutputTokens,
    },
  })

  // Build final system prompt with date context and user data
  let finalSystemPrompt = agentConfig.prompt

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const dayOfWeek = ['domingo', 'segunda-feira', 'terca-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sabado'][now.getDay()]
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0]

  finalSystemPrompt += `\n\n## Data e Hora Atual\n- Hoje: ${today} (${dayOfWeek})\n- Amanha: ${tomorrow}\n- Horario: ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} (BRT)`

  if (userContext) {
    finalSystemPrompt += `\n\n## Dados Reais do Usuario\n${userContext}\n\n## Instrucoes de Contexto\n- Use os dados acima para dar respostas PERSONALIZADAS\n- Cite numeros, nomes, datas e detalhes dos dados reais\n- NUNCA diga que nao tem acesso aos dados — voce TEM os dados acima\n- Se nao tiver dados suficientes, sugira acoes concretas`
  }

  if (moduleData) {
    finalSystemPrompt += `\n\n## Dados do Modulo (contexto adicional)\n${JSON.stringify(moduleData, null, 2)}`
  }

  // Build chat history
  const chatHistory = history?.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  })) || []

  let finalMessage = message
  if (context) finalMessage = `Contexto:\n${context}\n\nPergunta: ${message}`

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: `Sistema: ${finalSystemPrompt}` }] },
      { role: 'model', parts: [{ text: 'Entendido! Estou pronto para ajudar como agente especializado.' }] },
      ...chatHistory,
    ],
  })

  const result = await chat.sendMessage(finalMessage)

  return {
    text: result.response.text(),
    agent,
    sources: [],
    __usageMetadata: result.response.usageMetadata,
  } as any
}

async function handleAnalyzeContentRealtime(genAI: GoogleGenerativeAI, payload: any): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload
  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: temperature || 0.8, maxOutputTokens: maxOutputTokens || 150 } })
  const result = await model.generateContent(prompt)
  return {
    text: result.response.text(),
    __usageMetadata: result.response.usageMetadata
  }
}

async function handleGeneratePostCaptureInsight(genAI: GoogleGenerativeAI, payload: any): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload
  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: temperature || 0.7, maxOutputTokens: maxOutputTokens || 200 } })
  const result = await model.generateContent(prompt)
  return {
    text: result.response.text(),
    __usageMetadata: result.response.usageMetadata
  }
}

async function handleClusterMomentsByTheme(genAI: GoogleGenerativeAI, payload: any): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload
  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: temperature || 0.6, maxOutputTokens: maxOutputTokens || 500 } })
  const result = await model.generateContent(prompt)
  return {
    text: result.response.text(),
    __usageMetadata: result.response.usageMetadata
  }
}

// ============================================================================
// VOICE-TO-TASK EXTRACTION HANDLER (Atlas - Voice Input)
// ============================================================================

async function handleExtractTaskFromVoice(genAI: GoogleGenerativeAI, payload: { transcription: string }) {
  const { transcription } = payload

  if (!transcription) {
    throw new Error('transcription e obrigatorio')
  }

  const today = new Date().toISOString().split('T')[0]
  const dayOfWeek = ['domingo', 'segunda-feira', 'terca-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sabado'][new Date().getDay()]

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  })

  const prompt = `Voce e um assistente que extrai dados estruturados de tarefas a partir de texto falado em portugues brasileiro.

Data de hoje: ${today} (${dayOfWeek})

A partir da transcricao abaixo, extraia os seguintes campos:
- title: titulo curto e claro da tarefa (max 100 chars)
- description: descricao adicional se houver detalhes relevantes (opcional)
- priority: "urgent" | "high" | "medium" | "low" (baseado no tom e urgencia)
- is_urgent: true se a tarefa precisa ser feita logo (prazo proximo ou linguagem urgente)
- is_important: true se a tarefa tem impacto significativo
- due_date: data no formato YYYY-MM-DD (resolva datas relativas como "amanha", "segunda", "semana que vem" a partir da data de hoje)
- scheduled_time: horario no formato HH:MM se mencionado (ex: "meio dia" → "12:00", "tres da tarde" → "15:00", "oito horas" → "08:00"). Omitir se nenhum horario for mencionado.
- estimated_duration: duracao estimada em minutos (1-480)
- task_type: "task" | "list" | "event" — classifique o tipo:
  * "event": encontros, almocos, jantares, reunioes, compromissos com horario marcado ou com outras pessoas
  * "list": listas de compras, itens enumerados separados por virgula ou "e", multiplos itens a fazer/comprar
  * "task": qualquer outra tarefa simples (padrao)
- checklist_items: array de strings com os itens da lista (SOMENTE quando task_type = "list"). Cada item deve ser curto e claro.

Exemplos:
Input: "Almoco com Rodrigo amanha meio dia"
Output: {"title":"Almoco com Rodrigo","due_date":"${new Date(Date.now() + 86400000).toISOString().split('T')[0]}","scheduled_time":"12:00","task_type":"event","priority":"medium","is_urgent":false,"is_important":true}

Input: "Comprar leite, pao e ovos"
Output: {"title":"Lista de compras","task_type":"list","checklist_items":["Leite","Pao","Ovos"],"priority":"medium","is_urgent":false,"is_important":false}

Input: "Preparar apresentacao do projeto"
Output: {"title":"Preparar apresentacao do projeto","task_type":"task","priority":"medium","is_urgent":false,"is_important":true,"estimated_duration":120}

Transcricao: "${transcription}"

Responda APENAS com JSON valido. Campos opcionais podem ser omitidos.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  try {
    const parsed = extractJSON(text)
    return {
      ...parsed,
      __usageMetadata: result.response.usageMetadata,
    }
  } catch {
    // Fallback: use transcription as title
    console.warn('[gemini-chat] extract_task_from_voice: JSON parse failed, using fallback')
    return {
      title: transcription.slice(0, 100),
      priority: 'medium',
      is_urgent: false,
      is_important: false,
      __usageMetadata: result.response.usageMetadata,
    }
  }
}

// ============================================================================
// AUDIO TRANSCRIPTION HANDLER (Universal Input Funnel - Phase 0)
// ============================================================================

async function handleTranscribeAudio(genAI: GoogleGenerativeAI, payload: any): Promise<{ transcription: string; language: string; confidence: number }> {
  const { audioBase64, mimeType = 'audio/webm' } = payload

  if (!audioBase64) {
    throw new Error('audioBase64 is required')
  }

  const model = genAI.getGenerativeModel({ model: MODELS.fast })
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: audioBase64,
      },
    },
    { text: 'Transcreva o audio acima em portugues. Retorne APENAS o texto transcrito, sem formatacao adicional.' },
  ])

  const raw = result.response.text().trim()
  // Strip Gemini thinking tokens that leak with 2.5 Flash
  const transcription = raw.replace(/<THINK>[\s\S]*?<\/THINK>\s*/gi, '').trim()

  return {
    transcription,
    language: 'pt-BR',
    confidence: 0.9,
    __usageMetadata: result.response.usageMetadata,
  } as any
}

// ============================================================================
// AUTO-TAGGING HANDLER
// ============================================================================

async function handleGenerateTags(genAI: GoogleGenerativeAI, payload: any): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload
  const model = genAI.getGenerativeModel({ model: MODELS.fast, generationConfig: { temperature: temperature || 0.7, maxOutputTokens: maxOutputTokens || 200 } })
  const result = await model.generateContent(prompt)
  return {
    text: result.response.text(),
    __usageMetadata: result.response.usageMetadata,
  } as any
}

// ============================================================================
// ANALYZE MOMENT (Combined tags + mood + sentiment in 1 call)
// ============================================================================

interface AnalyzeMomentPayload {
  content: string
  user_emotion?: string
}

const VALID_EMOTION_VALUES = ['happy', 'sad', 'anxious', 'angry', 'thoughtful', 'calm', 'grateful', 'tired', 'inspired', 'neutral', 'excited', 'disappointed', 'frustrated', 'loving', 'scared', 'determined', 'sleepy', 'overwhelmed', 'confident', 'confused'] as const

interface AnalyzeMomentResult {
  tags: string[]
  mood: { emoji: string; label: string; value: string }
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  sentimentScore: number
  emotions: string[]
  triggers: string[]
  energyLevel: number
}

async function handleAnalyzeMoment(genAI: GoogleGenerativeAI, payload: AnalyzeMomentPayload): Promise<AnalyzeMomentResult> {
  if (!payload.content || typeof payload.content !== 'string') throw new Error('Campo "content" e obrigatorio')
  if (payload.content.trim().length < 3) throw new Error('Conteudo muito curto para analise')

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.6,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    },
  })

  const prompt = `Analise a emocao deste registro de diario em portugues. Retorne SOMENTE JSON.

EXEMPLOS:

Entrada: "Estou com muitas saudades das minhas filhas"
{"tags":["saudade","filhas","familia"],"mood":{"emoji":"😢","label":"Saudade","value":"sad"},"sentiment":"negative","sentimentScore":-0.6,"emotions":["saudade","tristeza"],"triggers":["distancia da familia"],"energyLevel":30}

Entrada: "Hoje foi um dia produtivo, consegui entregar tudo"
{"tags":["produtividade","entrega","trabalho"],"mood":{"emoji":"😎","label":"Confiante","value":"confident"},"sentiment":"very_positive","sentimentScore":0.8,"emotions":["satisfacao","orgulho"],"triggers":["trabalho concluido"],"energyLevel":85}

Entrada: "Nao consigo parar de pensar no que aconteceu"
{"tags":["ruminacao","pensamento","preocupacao"],"mood":{"emoji":"😰","label":"Ansioso","value":"anxious"},"sentiment":"negative","sentimentScore":-0.5,"emotions":["ansiedade","preocupacao"],"triggers":["evento passado"],"energyLevel":60}

Entrada: "Acordei repleto de energia e motivacao"
{"tags":["motivacao","energia","inicio"],"mood":{"emoji":"🤩","label":"Inspirado","value":"inspired"},"sentiment":"very_positive","sentimentScore":0.9,"emotions":["inspiracao","entusiasmo"],"triggers":["novo dia"],"energyLevel":95}

AGORA ANALISE:

Entrada: "${payload.content.replace(/"/g, '\\"')}"

REGRAS: Responda SOMENTE com o JSON. Nunca use "neutral" exceto para textos puramente factuais sem emocao. mood.value DEVE ser um destes: happy, sad, anxious, angry, thoughtful, calm, grateful, tired, inspired, excited, disappointed, frustrated, loving, scared, determined, sleepy, overwhelmed, confident, confused`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  console.log('[analyze_moment] Raw Gemini response:', text.substring(0, 500))

  // Build fallback mood from user_emotion if available
  let fallbackMood: AnalyzeMomentResult['mood'] = { emoji: '😐', label: 'Neutro', value: 'neutral' }
  if (payload.user_emotion) {
    // user_emotion can be a value string ('happy') or legacy "emoji label" format
    const isValueString = VALID_EMOTION_VALUES.includes(payload.user_emotion as any)
    if (isValueString) {
      fallbackMood = { emoji: '😐', label: payload.user_emotion, value: payload.user_emotion }
    } else {
      const emojiMatch = payload.user_emotion.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u)
      const fallbackEmoji = emojiMatch ? emojiMatch[0] : '😐'
      const fallbackLabel = payload.user_emotion.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim() || 'Neutro'
      fallbackMood = { emoji: fallbackEmoji, label: fallbackLabel, value: 'neutral' }
    }
  }

  let parsed: AnalyzeMomentResult
  try {
    parsed = extractJSON(text)
  } catch (e) {
    console.warn('[analyze_moment] JSON parse failed, using user_emotion as fallback:', (e as Error).message)
    parsed = {
      tags: [],
      mood: fallbackMood,
      sentiment: 'neutral',
      sentimentScore: 0,
      emotions: [],
      triggers: [],
      energyLevel: 50,
    }
  }

  // Validate and normalize
  parsed.tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 7).map(t => String(t).toLowerCase()) : []
  if (!parsed.mood || typeof parsed.mood !== 'object') parsed.mood = { emoji: '😐', label: 'Neutro', value: 'neutral' }
  parsed.mood.label = String(parsed.mood.label || 'Neutro').substring(0, 20)
  parsed.mood.emoji = String(parsed.mood.emoji || '😐').substring(0, 4)
  // Normalize mood.value to a valid emotion value
  if (!parsed.mood.value || !VALID_EMOTION_VALUES.includes(parsed.mood.value as any)) {
    parsed.mood.value = 'neutral'
  }

  const validSentiments = ['very_positive', 'positive', 'neutral', 'negative', 'very_negative']
  if (!validSentiments.includes(parsed.sentiment)) parsed.sentiment = 'neutral'
  parsed.sentimentScore = Math.max(-1, Math.min(1, parsed.sentimentScore || 0))
  parsed.emotions = Array.isArray(parsed.emotions) ? parsed.emotions.slice(0, 5) : []
  parsed.triggers = Array.isArray(parsed.triggers) ? parsed.triggers.slice(0, 3) : []
  parsed.energyLevel = Math.max(0, Math.min(100, parsed.energyLevel || 50))

  return {
    ...parsed,
    __usageMetadata: result.response.usageMetadata,
  } as any
}

// ============================================================================
// QUALITY EVALUATION HANDLER
// ============================================================================

interface EvaluateQualityPayload {
  input_type: 'moment' | 'question_answer' | 'reflection'
  content: string
  question_text?: string
  summary_context?: string
}

interface EvaluateQualityResult {
  quality_score: number
  relevance: number
  depth: number
  authenticity: number
  clarity: number
  feedback_message: string
  feedback_tier: 'low' | 'medium' | 'high' | 'exceptional'
}

async function handleEvaluateQuality(genAI: GoogleGenerativeAI, payload: EvaluateQualityPayload): Promise<EvaluateQualityResult> {
  if (!payload.content || typeof payload.content !== 'string') {
    // Empty/missing content → minimum score
    return {
      quality_score: 0.0,
      relevance: 0.0,
      depth: 0.0,
      authenticity: 0.0,
      clarity: 0.0,
      feedback_message: 'Tente escrever algo para ganhar mais pontos!',
      feedback_tier: 'low',
    }
  }

  const trimmed = payload.content.trim()
  if (trimmed.length < 2) {
    return {
      quality_score: 0.1,
      relevance: 0.1,
      depth: 0.0,
      authenticity: 0.1,
      clarity: 0.1,
      feedback_message: 'Obrigado por compartilhar! Tente escrever um pouco mais.',
      feedback_tier: 'low',
    }
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 256,
      responseMimeType: 'application/json',
    },
  })

  let contextLine = ''
  if (payload.input_type === 'question_answer' && payload.question_text) {
    contextLine = `Pergunta: "${payload.question_text}"\n`
  } else if (payload.input_type === 'reflection' && payload.summary_context) {
    contextLine = `Contexto do resumo semanal: "${payload.summary_context}"\n`
  }

  const prompt = `Voce e um avaliador empatico de reflexoes pessoais.
O publico-alvo tem escolaridade variada.
Respostas curtas mas genuinas devem ser VALORIZADAS.
Uma resposta simples e honesta vale MAIS que uma longa e vaga.

Tipo: ${payload.input_type}
${contextLine}Texto: "${trimmed}"

Avalie 0.0-1.0:
- relevance (30%): Aborda o proposto? (momentos: qualquer registro e relevante)
- depth (30%): Vai alem do superficial? (frases curtas podem ser profundas)
- authenticity (20%): Genuino e pessoal? (favor honestidade sobre elaboracao)
- clarity (20%): Compreensivel? (linguagem simples e OK)

CALIBRACAO:
- 1-3 palavras sinceras: quality_score minimo 0.3
- 1 frase genuina: minimo 0.5
- 2+ frases com reflexao: minimo 0.65
- NAO penalize erros de ortografia ou linguagem informal
- Respostas vagas/genericas: quality_score maximo 0.4

Tiers: low (<0.35), medium (0.35-0.6), high (0.6-0.85), exceptional (>=0.85)

Retorne JSON: { "quality_score": number, "relevance": number, "depth": number, "authenticity": number, "clarity": number, "feedback_message": "1 frase empatica em portugues", "feedback_tier": "low|medium|high|exceptional" }`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = extractJSON<EvaluateQualityResult>(text)

    // Validate and clamp values
    parsed.quality_score = Math.max(0, Math.min(1, Number(parsed.quality_score) || 0.5))
    parsed.relevance = Math.max(0, Math.min(1, Number(parsed.relevance) || 0.5))
    parsed.depth = Math.max(0, Math.min(1, Number(parsed.depth) || 0.5))
    parsed.authenticity = Math.max(0, Math.min(1, Number(parsed.authenticity) || 0.5))
    parsed.clarity = Math.max(0, Math.min(1, Number(parsed.clarity) || 0.5))
    parsed.feedback_message = String(parsed.feedback_message || 'Obrigado por compartilhar!').substring(0, 200)

    const validTiers = ['low', 'medium', 'high', 'exceptional'] as const
    if (!validTiers.includes(parsed.feedback_tier as any)) {
      parsed.feedback_tier = parsed.quality_score < 0.35 ? 'low'
        : parsed.quality_score < 0.6 ? 'medium'
        : parsed.quality_score < 0.85 ? 'high'
        : 'exceptional'
    }

    return parsed
  } catch (error) {
    console.error('[evaluate_quality] Gemini call failed, using fallback:', (error as Error).message)
    // Fallback: quality=0.5 → 11 CP (median, safe experience)
    return {
      quality_score: 0.5,
      relevance: 0.5,
      depth: 0.5,
      authenticity: 0.5,
      clarity: 0.5,
      feedback_message: 'Obrigado por compartilhar sua reflexao!',
      feedback_tier: 'medium',
    }
  }
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
// GRANTS MODULE HANDLERS
// ============================================================================

async function handleGenerateFieldContent(genAI: GoogleGenerativeAI, payload: GenerateFieldContentPayload): Promise<{ generatedText: string }> {
  const { edital_text, evaluation_criteria, field_config, briefing, previous_responses, source_document_content, edital_text_content, opportunity_documents_content } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: Math.ceil(field_config.max_chars * 2),
    },
  })

  // Build system prompt
  let systemPrompt = `Voce e um especialista em redacao de propostas para editais de fomento a inovacao no Brasil.

Sua tarefa e escrever respostas tecnicas, objetivas e persuasivas para campos de formularios de inscricao em editais.

**CONTEXTO DO EDITAL:**
${edital_text || 'Nao fornecido'}
`

  if (evaluation_criteria && evaluation_criteria.length > 0) {
    systemPrompt += `\n**CRITERIOS DE AVALIACAO:**\nOs avaliadores considerarao os seguintes criterios:\n\n`
    evaluation_criteria.forEach(c => {
      systemPrompt += `- **${c.name}** (Peso: ${c.weight}/10): ${c.description}\n`
    })
  }

  systemPrompt += `\n**DIRETRIZES:**
1. Use linguagem tecnica mas acessivel
2. Seja objetivo e direto
3. Inclua dados quantitativos quando possivel
4. Demonstre conhecimento do mercado
5. Mostre diferenciais competitivos
6. Use paragrafos curtos
`

  // Build user prompt
  let userPrompt = `**CAMPO A SER PREENCHIDO:**
${field_config.label}
${field_config.ai_prompt_hint ? `Dica: ${field_config.ai_prompt_hint}\n` : ''}Limite de caracteres: ${field_config.max_chars}

`

  if (edital_text_content && edital_text_content.trim().length > 0) {
    userPrompt += `**EDITAL OFICIAL:**\n${edital_text_content.substring(0, 20000)}\n\n`
  }

  if (opportunity_documents_content && opportunity_documents_content.trim().length > 0) {
    userPrompt += `**DOCUMENTOS DO EDITAL:**\n${opportunity_documents_content.substring(0, 15000)}\n\n`
  }

  if (source_document_content && source_document_content.trim().length > 0) {
    userPrompt += `**DOCUMENTOS DO PROJETO:**\n${source_document_content.substring(0, 15000)}\n\n`
  }

  userPrompt += `**CONTEXTO DO PROJETO:**\n\n`
  Object.entries(briefing).forEach(([fieldId, content]) => {
    if (content && content.trim().length > 0) {
      const fieldLabel = fieldId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      userPrompt += `**${fieldLabel}:**\n${content}\n\n`
    }
  })

  if (previous_responses && Object.keys(previous_responses).length > 0) {
    userPrompt += `**RESPOSTAS JA FORNECIDAS:**\n`
    Object.entries(previous_responses).forEach(([fieldId, content]) => {
      userPrompt += `${fieldId}: ${content.substring(0, 200)}...\n`
    })
    userPrompt += `\n`
  }

  userPrompt += `**TAREFA:**\nEscreva uma resposta completa e persuasiva para "${field_config.label}", respeitando o limite de ${field_config.max_chars} caracteres.\n\nSua resposta:`

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }, { text: userPrompt }] }
    ],
  })

  let generatedText = result.response.text()

  // Truncate intelligently
  if (generatedText.length > field_config.max_chars) {
    generatedText = generatedText.substring(0, field_config.max_chars - 3) + '...'
  }

  return {
    generatedText,
    __usageMetadata: result.response.usageMetadata
  }
}

async function handleAnalyzeEditalStructure(genAI: GoogleGenerativeAI, payload: AnalyzeEditalStructurePayload): Promise<any> {
  const { editalText } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    generationConfig: {
      temperature: 0.3,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8000,
    },
  })

  const prompt = `Voce e um especialista em analise de editais de fomento a inovacao no Brasil.

Analise o edital abaixo e retorne um JSON estruturado com TODAS as informacoes.

REGRAS:
1. Retorne APENAS o JSON, sem texto adicional
2. Use aspas duplas em todas as strings
3. Todos os campos sao obrigatorios (use null se nao encontrar)
4. Datas no formato ISO: "YYYY-MM-DD"
5. Valores monetarios como numeros (sem R$)
6. IDs em snake_case sem acentos

ESTRUTURA:
{
  "title": "Titulo completo",
  "funding_agency": "Agencia (FAPERJ, FINEP, etc)",
  "program_name": "Nome do programa",
  "edital_number": "Numero (ex: 32/2025)",
  "min_funding": 375000,
  "max_funding": 600000,
  "counterpart_percentage": 5.0,
  "submission_start": "2025-01-15",
  "submission_deadline": "2025-03-31",
  "result_date": "2025-06-30",
  "eligible_themes": ["Saude", "Biotecnologia"],
  "eligibility_requirements": {
    "min_company_age_years": 2,
    "must_have_cnpj": true,
    "headquarter_location": "Rio de Janeiro"
  },
  "evaluation_criteria": [
    {
      "id": "innovation",
      "name": "Grau de Inovacao",
      "description": "Descricao",
      "weight": 30,
      "min_score": 7,
      "max_score": 10
    }
  ],
  "form_fields": [
    {
      "id": "company_presentation",
      "label": "Apresentacao da Empresa",
      "max_chars": 3000,
      "required": true,
      "ai_prompt_hint": "Descreva historico, porte, setor",
      "placeholder": "Descreva..."
    }
  ],
  "external_system_url": "https://sistema.gov.br"
}

TEXTO DO EDITAL:
${editalText.substring(0, 50000)}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Clean JSON from markdown
  const jsonText = text.replace(/```json\n?|\n?```/g, '').trim()
  const data = JSON.parse(jsonText)

  return {
    ...data,
    __usageMetadata: result.response.usageMetadata
  }
}

async function handleParseFormFields(genAI: GoogleGenerativeAI, payload: ParseFormFieldsPayload): Promise<{ fields: ParsedFormField[] }> {
  const { text } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 4000,
    },
  })

  const prompt = `Voce e um especialista em analise de formularios de editais.

Parsear o texto abaixo e extraia os campos do formulario.

REGRAS:
1. Identifique TODAS as perguntas/campos
2. Extraia limite de caracteres ("max X caracteres", "ate X chars")
3. Se nao houver limite, estime entre 1000-5000
4. Crie ID em snake_case sem acentos
5. Marque required: true por padrao
6. Crie dicas uteis para ai_prompt_hint
7. Retorne APENAS o JSON array

FORMATO:
[
  {
    "id": "company_presentation",
    "label": "Apresentacao da Empresa",
    "max_chars": 3000,
    "required": true,
    "ai_prompt_hint": "Descreva historico, porte, setor",
    "placeholder": "Descreva o historico..."
  }
]

TEXTO:
${text}`

  const result = await model.generateContent(prompt)
  const jsonText = result.response.text().replace(/```json\n?|\n?```/g, '').trim()
  const fields = JSON.parse(jsonText) as ParsedFormField[]

  return {
    fields,
    __usageMetadata: result.response.usageMetadata
  }
}

// ============================================================================
// BRIEFING MODULE HANDLERS
// ============================================================================

async function handleGenerateAutoBriefing(genAI: GoogleGenerativeAI, payload: GenerateAutoBriefingPayload): Promise<{ briefing: Record<string, string> }> {
  const { companyName, projectIdea, editalTitle, editalText, sourceDocumentContent, formFields } = payload

  const hasSourceDocument = sourceDocumentContent && sourceDocumentContent.trim().length > 100
  const hasMinimalContext = companyName || projectIdea

  if (!hasSourceDocument && !hasMinimalContext) {
    throw new Error('Documento fonte obrigatorio. Faca upload de um arquivo com informacoes do projeto.')
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 20,
      maxOutputTokens: 4000,
    },
  })

  const jsonStructure = formFields?.map(f => `  "${f.id}": "Extrair: ${f.ai_prompt_hint || f.label}"`).join(',\n') || ''

  const systemPrompt = `Voce e um especialista em analise de documentos para editais de fomento.

Sua tarefa e EXTRAIR e ORGANIZAR informacoes do documento fonte para preencher um briefing.

REGRAS CRITICAS:
1. APENAS EXTRAIA informacoes EXPLICITAMENTE no documento
2. NUNCA invente dados ou informacoes
3. Se nao encontrar, retorne "" (string vazia)
4. Use CITACOES DIRETAS quando possivel
5. Retorne APENAS o JSON

${formFields && formFields.length > 0 ? `ESTRUTURA:\n{\n${jsonStructure}\n}` : ''}`

  const userPrompt = hasSourceDocument
    ? `DOCUMENTO FONTE:
---
${sourceDocumentContent!.substring(0, 30000)}
---

${editalTitle ? `Edital: ${editalTitle}\n` : ''}${editalText ? `Requisitos: ${editalText.substring(0, 2000)}\n` : ''}
INSTRUCAO: Analise o documento e EXTRAIA as informacoes. NAO INVENTE nada.

Retorne APENAS o JSON.`
    : `INFORMACOES DISPONIVEIS:
${companyName ? `Empresa: ${companyName}\n` : ''}${projectIdea ? `Projeto: ${projectIdea}\n` : ''}${editalTitle ? `Edital: ${editalTitle}\n` : ''}
Documento fonte nao fornecido. Organize as informacoes disponiveis.

Retorne APENAS o JSON.`

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: userPrompt }
  ])

  const jsonText = result.response.text().replace(/```json\n?|\n?```/g, '').trim()
  const briefing = JSON.parse(jsonText) as Record<string, string>

  return {
    briefing,
    __usageMetadata: result.response.usageMetadata
  }
}

async function handleImproveBriefingField(genAI: GoogleGenerativeAI, payload: ImproveBriefingFieldPayload): Promise<{ improvedText: string }> {
  const { fieldId, currentContent, allBriefing } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2000,
    },
  })

  const prompt = `Voce e um especialista em redacao de projetos para editais de inovacao.

TAREFA: Melhore e expanda o texto do campo "${fieldId}":

TEXTO ATUAL:
${currentContent}

CONTEXTO ADICIONAL:
${JSON.stringify(allBriefing, null, 2)}

INSTRUCOES:
1. Expanda para 300-500 palavras
2. Adicione detalhes tecnicos e numeros
3. Mantenha coerencia com outros campos
4. Use linguagem profissional
5. Retorne APENAS o texto melhorado

Texto melhorado:`

  const result = await model.generateContent(prompt)
  const improvedText = result.response.text().trim()

  return {
    improvedText,
    __usageMetadata: result.response.usageMetadata
  }
}

async function handleExtractRequiredDocuments(genAI: GoogleGenerativeAI, payload: ExtractRequiredDocumentsPayload): Promise<{ documents: Array<{ name: string; description?: string; dueDate?: string }> }> {
  const { pdfContent } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 20,
      maxOutputTokens: 4000,
    },
  })

  const prompt = `Analise o edital e extraia TODOS os documentos exigidos.

TEXTO:
${pdfContent.substring(0, 20000)}

FORMATO:
[
  {
    "name": "Certidao Negativa de Debitos",
    "description": "Descricao",
    "dueDate": "2025-12-31"
  }
]

Retorne APENAS o JSON.`

  const result = await model.generateContent(prompt)
  const jsonText = result.response.text().replace(/```json\n?|\n?```/g, '').trim()
  const documents = JSON.parse(jsonText)

  return {
    documents,
    __usageMetadata: result.response.usageMetadata
  }
}

async function handleExtractTimelinePhases(genAI: GoogleGenerativeAI, payload: ExtractTimelinePhasesPayload): Promise<{ phases: Array<{ name: string; description?: string; date: string }> }> {
  const { pdfContent } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 20,
      maxOutputTokens: 4000,
    },
  })

  const prompt = `Extraia o cronograma/timeline do edital com TODAS as datas.

TEXTO:
${pdfContent.substring(0, 20000)}

FORMATO (ORDENADO por data):
[
  {
    "name": "Submissao de Propostas",
    "description": "Descricao",
    "date": "2025-12-15"
  }
]

Use formato ISO (YYYY-MM-DD). Retorne APENAS o JSON.`

  const result = await model.generateContent(prompt)
  const jsonText = result.response.text().replace(/```json\n?|\n?```/g, '').trim()
  const phases = JSON.parse(jsonText)

  // Sort by date
  phases.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return {
    phases,
    __usageMetadata: result.response.usageMetadata
  }
}

// ============================================================================
// PDF PROCESSING HANDLERS
// ============================================================================

async function handleParseStatement(genAI: GoogleGenerativeAI, payload: ParseStatementPayload): Promise<any> {
  const { rawText } = payload

  console.log(`[parse_statement] Starting. rawText length: ${rawText?.length || 0}`)

  // Use gemini-2.5-flash with HIGH maxOutputTokens — thinking tokens are included
  // in the budget, and bank statements can produce large JSON (100+ transactions).
  // Previously 4096 caused truncated JSON → extractJSON failure → 500.
  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 65536,
    },
  })

  const prompt = `Voce e um assistente especializado em extrair dados de extratos bancarios brasileiros.

Analise o texto e extraia as informacoes em formato JSON:

{
  "bankName": "nome do banco (ex: Nubank, Inter, Itau, Bradesco, Santander, C6 Bank)",
  "accountType": "checking|savings|credit_card|investment|other",
  "periodStart": "YYYY-MM-DD",
  "periodEnd": "YYYY-MM-DD",
  "openingBalance": numero,
  "closingBalance": numero,
  "currency": "BRL",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "descricao limpa sem caracteres especiais",
      "amount": numero (positivo=receita, negativo=despesa),
      "type": "income|expense",
      "category": "food|transport|housing|health|education|entertainment|shopping|bills|salary|investment|transfer|other"
    }
  ]
}

REGRAS:
- Despesas devem ser NEGATIVAS
- Receitas devem ser POSITIVAS
- Categorias em ingles
- Detecte o banco pelo cabecalho, logo ou formato do extrato
- PIX recebidos sao "income", PIX enviados sao "expense"
- Retorne APENAS o JSON, sem explicacao

TEXTO:
${rawText.substring(0, 15000)}`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    const usageMetadata = response.usageMetadata

    console.log(`[parse_statement] Gemini response received. Usage:`, JSON.stringify(usageMetadata))

    // Check for blocked/empty response
    const candidates = response.candidates
    if (!candidates || candidates.length === 0) {
      console.error(`[parse_statement] No candidates in response. finishReason may be safety block.`)
      throw new Error('Gemini retornou resposta vazia — possivelmente bloqueado por filtro de seguranca.')
    }

    const finishReason = candidates[0].finishReason
    console.log(`[parse_statement] finishReason: ${finishReason}`)

    if (finishReason === 'MAX_TOKENS') {
      console.warn(`[parse_statement] Response truncated by MAX_TOKENS. Usage: ${JSON.stringify(usageMetadata)}`)
    }

    const text = response.text()
    console.log(`[parse_statement] Response text length: ${text?.length || 0}`)

    if (!text || text.trim().length === 0) {
      throw new Error('Gemini retornou texto vazio para parse_statement.')
    }

    const data = extractJSON(text)
    console.log(`[parse_statement] JSON parsed successfully. Transactions: ${data?.transactions?.length || 0}`)

    return {
      ...data,
      __usageMetadata: usageMetadata
    }
  } catch (err) {
    const error = err as Error
    console.error(`[parse_statement] FAILED:`, error.message)
    console.error(`[parse_statement] Stack:`, error.stack)
    throw error
  }
}

// ============================================================================
// PODCAST GUEST RESEARCH HANDLER
// ============================================================================

async function handleResearchGuest(genAI: GoogleGenerativeAI, payload: ResearchGuestPayload): Promise<GuestProfile> {
  const { guest_name, reference, prompt: customPrompt, system_instruction } = payload

  if (!guest_name || typeof guest_name !== 'string' || guest_name.trim().length < 2) {
    throw new Error('Campo "guest_name" e obrigatorio e deve ter pelo menos 2 caracteres')
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    },
  })

  const defaultSystemInstruction = `Voce e um assistente de pesquisa especializado em preparar entrevistas para podcasts.

Responsabilidades:
- Pesquisar informacoes precisas e verificaveis sobre figuras publicas
- Focar em conquistas e fatos recentes (ultimos 2 anos)
- Identificar topicos de interesse relevantes para uma entrevista
- Alertar sobre controversias importantes que o entrevistador deve conhecer
- Retornar apenas informacoes confiaveis

Estilo:
- Seja conciso mas informativo
- Use linguagem clara e objetiva
- Priorize qualidade sobre quantidade
- Indique quando informacoes nao sao confiaveis

Formato:
Retorne APENAS um objeto JSON valido, sem markdown ou texto adicional.`

  const defaultPrompt = `Pesquise a seguinte pessoa para uma entrevista de podcast:

Nome: ${guest_name}
${reference ? `Contexto/Referencia: ${reference}` : ''}

Por favor, forneca:
1. Nome completo e titulo profissional
2. Uma biografia de 2-3 frases
3. 3-5 fatos notaveis ou conquistas recentes (ultimos 2 anos)
4. 3-5 topicos pelos quais a pessoa e conhecida ou apaixonada
5. Quaisquer controversias significativas que um entrevistador deveria saber

Retorne as informacoes no seguinte formato JSON:
{
  "name": "string (nome completo)",
  "title": "string (titulo profissional/cargo)",
  "biography": "string (biografia de 2-3 frases)",
  "recent_facts": ["string", "string", ...],
  "topics_of_interest": ["string", "string", ...],
  "controversies": ["string", "string", ...],
  "is_reliable": true/false (true se encontrou informacoes confiaveis),
  "confidence_score": number (0-100, confianca na precisao das informacoes)
}

Se voce nao conseguir encontrar informacoes confiaveis sobre esta pessoa, retorne um objeto com is_reliable: false e confidence_score: 0.

IMPORTANTE: Retorne APENAS o objeto JSON, sem markdown, sem blocos de codigo, sem texto adicional.`

  const finalSystemInstruction = system_instruction || defaultSystemInstruction
  const finalPrompt = customPrompt || defaultPrompt

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: finalSystemInstruction }, { text: finalPrompt }] }
    ],
  })

  const text = result.response.text()

  let parsed: Omit<GuestProfile, 'researched_at'>
  try {
    parsed = extractJSON(text)
  } catch {
    console.error('[research_guest] Failed to parse JSON response:', text)
    throw new Error('Falha ao processar resposta do modelo')
  }

  // Validate and normalize response
  const profile: GuestProfile = {
    name: String(parsed.name || guest_name),
    title: String(parsed.title || reference || ''),
    biography: String(parsed.biography || 'Informacoes detalhadas nao disponiveis no momento.'),
    recent_facts: Array.isArray(parsed.recent_facts) ? parsed.recent_facts.map(String).slice(0, 10) : [],
    topics_of_interest: Array.isArray(parsed.topics_of_interest) ? parsed.topics_of_interest.map(String).slice(0, 10) : [],
    controversies: Array.isArray(parsed.controversies) ? parsed.controversies.map(String).slice(0, 5) : [],
    image_url: parsed.image_url ? String(parsed.image_url) : undefined,
    is_reliable: Boolean(parsed.is_reliable),
    confidence_score: typeof parsed.confidence_score === 'number' ? Math.max(0, Math.min(100, parsed.confidence_score)) : 0,
    researched_at: new Date().toISOString(),
  }

  return {
    ...profile,
    __usageMetadata: result.response.usageMetadata
  } as any
}

// ============================================================================
// CLASSIFY INTENT HANDLER
// ============================================================================

async function handleClassifyIntent(payload: any, apiKey: string) {
  const { message, history, userPatterns } = payload;

  if (!message) {
    return { success: false, error: 'Message is required' };
  }

  const systemPrompt = `Você é um classificador de intenções para o AICA Life OS.
Analise a mensagem do usuário e classifique em UM dos módulos:
- atlas: gestão de tarefas, prioridades, Eisenhower Matrix, produtividade, to-do, prazos
- journey: momentos, emoções, diário, autoconhecimento, reflexão, meditação, gratidão
- connections: contatos, CRM pessoal, WhatsApp, pessoas, networking, relacionamentos
- finance: dinheiro, contas, orçamento, extratos, investimentos, gastos, receitas
- flux: treinos, atletas, exercícios, coaching esportivo, academia, séries
- studio: podcast, episódios, convidados, gravação, pauta, entrevistas
- captacao: editais, grants, FAPERJ, CNPq, propostas, captação de recursos, patrocínio
- agenda: reuniões, eventos, calendário, horários, compromissos, agendamentos
- coordinator: conversa geral sem módulo específico, ou envolve múltiplos módulos

${userPatterns ? `Padrões conhecidos do usuário: ${userPatterns.join(', ')}` : ''}

Retorne APENAS JSON válido:
{ "module": "nome_do_modulo", "confidence": 0.0-1.0, "action_hint": "breve descrição da ação detectada", "reasoning": "justificativa curta da classificação" }`;

  const contents = [];

  // Add history if provided (last 5 messages for context)
  if (history && Array.isArray(history)) {
    for (const msg of history.slice(-5)) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  // Add current message
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[classify_intent] API error:', errText);
    return { success: false, error: 'Classification API error' };
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  let classification;
  try {
    classification = extractJSON(text);
  } catch {
    console.warn('[classify_intent] Failed to parse classification, falling back to coordinator');
    return {
      success: true,
      classification: {
        module: 'coordinator',
        confidence: 0.3,
        action_hint: 'Classificação inconclusiva',
        reasoning: 'Não foi possível determinar o módulo',
      },
    };
  }

  if (!classification || !classification.module) {
    return {
      success: true,
      classification: {
        module: 'coordinator',
        confidence: 0.3,
        action_hint: 'Classificação inconclusiva',
        reasoning: 'Não foi possível determinar o módulo',
      },
    };
  }

  return {
    success: true,
    classification: {
      module: classification.module,
      confidence: Math.min(classification.confidence || 0.5, 1.0),
      action_hint: classification.action_hint || '',
      reasoning: classification.reasoning || '',
    },
  };
}

// ============================================================================
// EXECUTE CHAT ACTION HANDLER
// ============================================================================

const ALLOWED_ACTION_TYPES = ['complete_task', 'start_task', 'update_priority', 'reschedule_task', 'create_moment'] as const

async function handleExecuteChatAction(
  supabaseAdmin: any,
  userId: string,
  payload: { action_type: string; params: Record<string, any> }
): Promise<{ success: boolean; action_type: string; result?: any; error?: string }> {
  const { action_type, params } = payload

  if (!action_type || !ALLOWED_ACTION_TYPES.includes(action_type as any)) {
    return { success: false, action_type: action_type || 'unknown', error: `Tipo de acao invalido: ${action_type}` }
  }

  if (!params || typeof params !== 'object') {
    return { success: false, action_type, error: 'Parametros invalidos' }
  }

  try {
    switch (action_type) {
      case 'complete_task': {
        if (!params.task_id) return { success: false, action_type, error: 'task_id e obrigatorio' }
        const { data, error } = await supabaseAdmin
          .from('work_items')
          .update({ status: 'done', updated_at: new Date().toISOString() })
          .eq('id', params.task_id)
          .eq('user_id', userId)
          .select('id, title, status')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      case 'start_task': {
        if (!params.task_id) return { success: false, action_type, error: 'task_id e obrigatorio' }
        const { data, error } = await supabaseAdmin
          .from('work_items')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', params.task_id)
          .eq('user_id', userId)
          .select('id, title, status')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      case 'update_priority': {
        if (!params.task_id) return { success: false, action_type, error: 'task_id e obrigatorio' }
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
        if (params.is_urgent !== undefined) updateData.is_urgent = Boolean(params.is_urgent)
        if (params.is_important !== undefined) updateData.is_important = Boolean(params.is_important)
        const { data, error } = await supabaseAdmin
          .from('work_items')
          .update(updateData)
          .eq('id', params.task_id)
          .eq('user_id', userId)
          .select('id, title, is_urgent, is_important')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      case 'reschedule_task': {
        if (!params.task_id) return { success: false, action_type, error: 'task_id e obrigatorio' }
        if (!params.new_date) return { success: false, action_type, error: 'new_date e obrigatorio' }
        const { data, error } = await supabaseAdmin
          .from('work_items')
          .update({ due_date: params.new_date, updated_at: new Date().toISOString() })
          .eq('id', params.task_id)
          .eq('user_id', userId)
          .select('id, title, due_date')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      case 'create_moment': {
        if (!params.content) return { success: false, action_type, error: 'content e obrigatorio' }
        const { data, error } = await supabaseAdmin
          .from('moments')
          .insert({
            user_id: userId,
            content: params.content,
            emotion: params.emotion || 'neutral',
            type: params.type || 'reflection',
          })
          .select('id, content, emotion')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      default:
        return { success: false, action_type, error: `Tipo de acao nao implementado: ${action_type}` }
    }
  } catch (error) {
    console.error(`[execute_chat_action] Error executing ${action_type}:`, (error as Error).message)
    return { success: false, action_type, error: (error as Error).message }
  }
}

// ============================================================================
// MAIN SERVER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

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

    // Extract user ID from JWT for usage logging (best-effort, non-blocking)
    let userId: string | null = null
    try {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        // Decode JWT payload without verification (service-role will handle the RPC)
        const payloadB64 = token.split('.')[1]
        if (payloadB64) {
          const decoded = JSON.parse(atob(payloadB64))
          userId = decoded.sub || null
        }
      }
    } catch {
      // Non-critical: if we can't extract user ID, just skip logging
    }

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
        case 'chat_aica':
        case 'finance_chat': {
          const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          const chatResult = await handleLegacyChat(
            genAI,
            { message: payload?.message, context: payload?.context, history: payload?.history, systemPrompt: payload?.systemPrompt, module: payload?.module },
            supabaseAdmin,
            userId
          )
          result = chatResult
          break
        }
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
        case 'generate_field_content':
          result = await handleGenerateFieldContent(genAI, payload as GenerateFieldContentPayload)
          break
        case 'analyze_edital_structure':
          result = await handleAnalyzeEditalStructure(genAI, payload as AnalyzeEditalStructurePayload)
          break
        case 'parse_form_fields':
          result = await handleParseFormFields(genAI, payload as ParseFormFieldsPayload)
          break
        case 'generate_auto_briefing':
          result = await handleGenerateAutoBriefing(genAI, payload as GenerateAutoBriefingPayload)
          break
        case 'improve_briefing_field':
          result = await handleImproveBriefingField(genAI, payload as ImproveBriefingFieldPayload)
          break
        case 'extract_required_documents':
          result = await handleExtractRequiredDocuments(genAI, payload as ExtractRequiredDocumentsPayload)
          break
        case 'extract_timeline_phases':
          result = await handleExtractTimelinePhases(genAI, payload as ExtractTimelinePhasesPayload)
          break
        case 'parse_statement':
          result = await handleParseStatement(genAI, payload as ParseStatementPayload)
          break
        case 'generate_daily_question':
          result = await handleGenerateDailyQuestion(genAI, payload as GenerateDailyQuestionPayload)
          break
        case 'research_guest':
          result = await handleResearchGuest(genAI, payload as ResearchGuestPayload)
          break
        case 'transcribe_audio':
          result = await handleTranscribeAudio(genAI, payload)
          break
        case 'extract_task_from_voice':
          result = await handleExtractTaskFromVoice(genAI, payload as { transcription: string })
          break
        case 'generate_tags':
          result = await handleGenerateTags(genAI, payload)
          break
        case 'analyze_moment':
          result = await handleAnalyzeMoment(genAI, payload as AnalyzeMomentPayload)
          break
        case 'evaluate_quality':
          result = await handleEvaluateQuality(genAI, payload as EvaluateQualityPayload)
          break
        case 'classify_intent':
          result = await handleClassifyIntent(payload, GEMINI_API_KEY)
          break
        case 'execute_chat_action': {
          if (!userId) {
            return new Response(JSON.stringify({ error: 'Autenticacao necessaria', success: false }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
          const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          result = await handleExecuteChatAction(supabaseAdmin, userId, payload as { action_type: string; params: Record<string, any> })
          break
        }
        case 'chat_with_agent': {
          const agentName = (body as any).agent || payload?.agent || 'coordinator'
          const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          result = await handleChatWithAgent(
            genAI,
            agentName,
            payload as ChatWithAgentPayload,
            supabaseAdmin,
            userId
          )
          break
        }
        default:
          return new Response(JSON.stringify({ error: `Action desconhecida: ${action}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const latencyMs = Date.now() - startTime
      console.log(`[gemini-chat] Action ${action} completed in ${latencyMs}ms`)

      // Extract usageMetadata if present (for AI cost tracking)
      const usageMetadata = (result as any)?.__usageMetadata || null

      // Determine which model was used for this action
      const modelName = SMART_MODEL_ACTIONS.includes(action!) ? MODELS.smart : MODELS.fast

      // Fire-and-forget: log interaction for billing/usage tracking
      if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
        supabaseAdmin.rpc('log_interaction', {
          p_user_id: userId,
          p_action: action,
          p_module: payload?.module || (body as any)?.agent || null,
          p_model: modelName,
          p_tokens_in: usageMetadata?.promptTokenCount || 0,
          p_tokens_out: usageMetadata?.candidatesTokenCount || 0,
        }).then(() => {
          console.log(`[gemini-chat] Logged interaction: ${action}`)
        }).catch((err: any) => {
          console.warn(`[gemini-chat] Failed to log interaction: ${err.message}`)
        })
      }

      return new Response(
        JSON.stringify({
          result: (result as any)?.__usageMetadata ? { ...(result as any), __usageMetadata: undefined } : result,
          success: true,
          latencyMs,
          cached: false,
          ...(usageMetadata && { usageMetadata })
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      const result = await handleLegacyChat(genAI, body as ChatRequest)
      console.log('[gemini-chat] Legacy chat response generated')
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

  } catch (error) {
    const err = error as Error
    console.error('[gemini-chat] Error:', err.message)

    let statusCode = 500
    let errorCode = 'SERVER_ERROR'
    let userMessage = err.message || 'Erro interno do servidor'

    // Detect specific error types for better diagnostics
    if (err.message.includes('obrigatorio') || err.message.includes('deve ser')) {
      statusCode = 400
      errorCode = 'VALIDATION_ERROR'
    } else if (err.message.includes('API key expired') || err.message.includes('API key not valid') || err.message.includes('API_KEY_INVALID')) {
      statusCode = 503
      errorCode = 'API_KEY_EXPIRED'
      userMessage = 'Servico de IA temporariamente indisponivel. A chave da API precisa ser renovada. Contate o administrador.'
      console.error('[gemini-chat] CRITICAL: Gemini API key is expired or invalid! See docs/GEMINI_API_SETUP.md for renewal instructions.')
    } else if (err.message.includes('quota') || err.message.includes('Resource exhausted')) {
      statusCode = 429
      errorCode = 'RATE_LIMITED'
      userMessage = 'Limite de requisicoes excedido. Tente novamente em alguns minutos.'
    } else if (err.message.includes('permission') || err.message.includes('403')) {
      statusCode = 403
      errorCode = 'PERMISSION_DENIED'
      userMessage = 'Permissao negada para acessar o servico de IA.'
    }

    return new Response(
      JSON.stringify({
        error: userMessage,
        errorCode,
        success: false
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
