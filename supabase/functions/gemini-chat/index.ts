import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"
import { handleGenerateDailyQuestion, type GenerateDailyQuestionPayload } from "./daily-question-handler.ts"

// ============================================================================
// SECURE CORS CONFIGURATION
// ============================================================================
// Whitelist of allowed origins - update with your production domains
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aica-5562559893.southamerica-east1.run.app', // Production Cloud Run URL
  'https://aica-5p22u2w6jq-rj.a.run.app', // Legacy Cloud Run URL
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
  'analyze_edital_structure',
  'generate_auto_briefing',
  'research_guest',
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

  return { generatedText }
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

  return data
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

  return { fields }
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

  return { briefing }
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

  return { improvedText }
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

  return { documents }
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

  return { phases }
}

// ============================================================================
// PDF PROCESSING HANDLERS
// ============================================================================

async function handleParseStatement(genAI: GoogleGenerativeAI, payload: ParseStatementPayload): Promise<any> {
  const { rawText } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 4000,
    },
  })

  const prompt = `Voce e um assistente especializado em extrair dados de extratos bancarios.

Analise o texto e extraia as informacoes em formato JSON:

{
  "bankName": "nome do banco",
  "accountType": "checking|savings|credit_card|investment|other",
  "periodStart": "YYYY-MM-DD",
  "periodEnd": "YYYY-MM-DD",
  "openingBalance": numero,
  "closingBalance": numero,
  "currency": "BRL",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "descricao",
      "amount": numero (positivo=receita, negativo=despesa),
      "type": "income|expense",
      "category": "food|transport|housing|health|education|entertainment|shopping|bills|salary|investment|other"
    }
  ]
}

IMPORTANTE:
- Despesas devem ser NEGATIVAS
- Receitas devem ser POSITIVAS
- Categorias em ingles
- Retorne APENAS o JSON

TEXTO:
${rawText.substring(0, 10000)}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonMatch) {
    throw new Error('Nao foi possivel extrair JSON da resposta')
  }

  const data = JSON.parse(jsonMatch)
  return data
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
    parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
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

  return profile
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
