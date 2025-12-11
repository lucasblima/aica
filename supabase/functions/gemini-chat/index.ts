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
  context?: string // Optional context from webhook
}

interface SentimentAnalysisResult {
  timestamp: string
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  sentimentScore: number
  emotions: string[]
  triggers: string[]
  energyLevel: number
}

// WhatsApp Message Sentiment Analysis (Webhook)
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

// Dossier Generation Types
interface GenerateDossierPayload {
  guestName: string
  theme?: string
}

interface TechnicalSheet {
  name: string
  profession: string
  socialMedia: {
    platform: string
    handle: string
  }[]
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

// Ice Breakers Generation Types
interface IceBreakerPayload {
  guestName: string
  keyFacts?: string[]
  occupation?: string
}

interface IceBreakerResult {
  iceBreakers: Array<{
    question: string
    rationale: string
  }>
}

// Pauta Questions Generation Types
interface PautaQuestionsPayload {
  guestName: string
  outline: {
    title: string
    mainSections: Array<{ title: string; keyPoints: string[] }>
  }
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

// Pauta Outline Generation Types
interface PautaOutlinePayload {
  guestName: string
  theme: string
  biography?: string
  keyFacts?: string[]
  controversies?: string[]
  duration?: number
  style?: {
    tone: 'formal' | 'casual' | 'investigativo' | 'humano'
    depth: 'shallow' | 'medium' | 'deep'
  }
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

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

const MODELS = {
  fast: 'gemini-2.0-flash-exp',
  smart: 'gemini-2.0-flash-exp', // Using 2.0 flash - stable and capable
} as const

// Actions that require the smart model
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

  generate_dossier: (guestName: string, theme?: string) => `Voce e um pesquisador especializado em preparacao de entrevistas para podcasts.

Crie um dossie completo sobre ${guestName}${theme ? ` com foco no tema "${theme}"` : ''}.

Retorne um JSON estruturado com:

{
  "biography": "Biografia completa e bem escrita (3-5 paragrafos)",
  "controversies": ["Lista de controversias, polemicas ou pontos de debate (se houver)"],
  "suggestedTopics": ["5-10 topicos interessantes para abordar na entrevista"],
  "iceBreakers": ["3-5 perguntas criativas para quebrar o gelo"],
  "technicalSheet": {
    "name": "Nome completo",
    "profession": "Profissao/Cargo principal",
    "socialMedia": [
      {"platform": "Instagram", "handle": "@usuario"},
      {"platform": "Twitter", "handle": "@usuario"}
    ],
    "keyFacts": ["Fato chave 1", "Fato chave 2", "Fato chave 3"]
  }${!theme ? ',\n  "derivedTheme": "Tema principal sugerido para o episodio baseado na pesquisa"' : ''}
}

IMPORTANTE:
- Biography deve ser informativa, bem escrita e envolvente
- Controversies: apenas se houver informacoes relevantes e verificaveis
- SuggestedTopics devem ser especificos e interessantes
- IceBreakers devem ser criativos, nao obvios
- TechnicalSheet com informacoes precisas
- Retorne APENAS o JSON valido, sem markdown ou formatacao extra`,

  generate_ice_breakers: (guestName: string, keyFacts: string[] = [], occupation?: string) => `Voce e um produtor criativo especializado em criar momentos de conexao em entrevistas de podcast.

Crie 5 perguntas quebra-gelo personalizadas para ${guestName}.
${occupation ? `Ocupacao: ${occupation}` : ''}

Informacoes disponiveis:
${keyFacts.length > 0 ? keyFacts.slice(0, 5).map(f => `- ${f}`).join('\n') : '- Nenhuma informacao adicional'}

Diretrizes:
- Perguntas inesperadas mas respeitosas
- Tom leve e descontraido
- Foco em curiosidades e preferencias pessoais
- Evitar cliches como "qual seu hobby?"
- Buscar humanizar o entrevistado

Retorne um JSON:
{
  "iceBreakers": [
    {
      "question": "Pergunta criativa aqui?",
      "rationale": "Por que essa pergunta funciona"
    }
  ]
}

Retorne APENAS JSON valido.`,

  generate_pauta_questions: (payload: PautaQuestionsPayload) => `Voce e um jornalista investigativo experiente que cria perguntas para entrevistas de podcast.

Gere perguntas para entrevista com ${payload.guestName}.

Estrutura da pauta:
${payload.outline.mainSections.map(s => `- ${s.title}: ${s.keyPoints.join(', ')}`).join('\n')}

Contexto da pesquisa:
${payload.keyFacts?.slice(0, 5).map(f => `- ${f}`).join('\n') || '- Nenhum fato disponivel'}
${payload.controversies?.length ? `\nControversias a explorar:\n${payload.controversies.map(c => `- ${c}`).join('\n')}` : ''}
${payload.additionalContext ? `\nContexto adicional: ${payload.additionalContext}` : ''}

Gere 15-20 perguntas distribuidas nas categorias:
- abertura (2-3 perguntas leves para iniciar)
- desenvolvimento (8-10 perguntas principais do tema)
- aprofundamento (3-4 perguntas investigativas/provocativas)
- fechamento (2-3 perguntas de conclusao/reflexao)

Retorne JSON:
{
  "questions": [
    {
      "id": "q1",
      "text": "Pergunta completa aqui?",
      "category": "abertura|desenvolvimento|aprofundamento|fechamento",
      "followUps": ["Follow-up 1?", "Follow-up 2?"],
      "context": "Por que essa pergunta e relevante",
      "priority": "high|medium|low"
    }
  ]
}

IMPORTANTE:
- Perguntas abertas que estimulem respostas ricas
- Evitar perguntas sim/nao
- Usar "como" e "por que" frequentemente
- Incluir contexto quando necessario
- Retorne APENAS JSON valido.`,

  generate_pauta_outline: (payload: PautaOutlinePayload) => `Voce e um produtor de podcast experiente especializado em criar pautas para entrevistas de alta qualidade.

Crie uma pauta estruturada para entrevista com:
- Convidado: ${payload.guestName}
- Tema: ${payload.theme}
- Duracao total: ${payload.duration || 60} minutos
- Tom: ${payload.style?.tone || 'casual'}
- Profundidade: ${payload.style?.depth || 'medium'}

Contexto da pesquisa:
${payload.biography ? `Biografia: ${payload.biography.substring(0, 500)}...` : ''}
${payload.keyFacts?.length ? `\nFatos-chave: ${payload.keyFacts.join('; ')}` : ''}
${payload.controversies?.length ? `\nControversias: ${payload.controversies.join('; ')}` : '\nNenhuma controversia identificada'}

Retorne um JSON:
{
  "title": "Titulo atraente para o episodio",
  "introduction": {
    "title": "Abertura",
    "description": "Como iniciar a entrevista de forma envolvente",
    "duration": 5,
    "keyPoints": ["Ponto 1", "Ponto 2"],
    "suggestedTransition": "Transicao para proximo bloco"
  },
  "mainSections": [
    {
      "title": "Nome da secao",
      "description": "O que abordar nesta secao",
      "duration": 15,
      "keyPoints": ["Ponto 1", "Ponto 2", "Ponto 3"],
      "suggestedTransition": "Transicao para proximo bloco"
    }
  ],
  "conclusion": {
    "title": "Fechamento",
    "description": "Como encerrar de forma memoravel",
    "duration": 5,
    "keyPoints": ["Ponto final 1", "Ponto final 2"]
  }
}

IMPORTANTE:
- Total de duracoes deve somar aproximadamente ${payload.duration || 60} minutos
- Estrutura clara com fluxo narrativo
- Transicoes suaves entre blocos
- Retorne APENAS JSON valido.`,
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

async function handleGenerateDossier(
  genAI: GoogleGenerativeAI,
  payload: GenerateDossierPayload
): Promise<DossierResult> {
  if (!payload.guestName || typeof payload.guestName !== 'string') {
    throw new Error('Campo "guestName" e obrigatorio e deve ser uma string')
  }

  if (payload.guestName.trim().length < 2) {
    throw new Error('Nome do convidado muito curto')
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    }
  })

  const prompt = PROMPTS.generate_dossier(payload.guestName, payload.theme)
  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  // Parse JSON response
  let parsed: DossierResult
  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[generate_dossier] Failed to parse JSON:', text)
    throw new Error('Falha ao processar resposta do modelo')
  }

  // Validate and normalize response
  parsed.biography = parsed.biography || 'Não foi possível gerar biografia'
  parsed.controversies = Array.isArray(parsed.controversies) ? parsed.controversies : []
  parsed.suggestedTopics = Array.isArray(parsed.suggestedTopics) ? parsed.suggestedTopics.slice(0, 10) : []
  parsed.iceBreakers = Array.isArray(parsed.iceBreakers) ? parsed.iceBreakers.slice(0, 5) : []

  return parsed
}

async function handleGenerateIceBreakers(
  genAI: GoogleGenerativeAI,
  payload: IceBreakerPayload
): Promise<IceBreakerResult> {
  if (!payload.guestName || typeof payload.guestName !== 'string') {
    throw new Error('Campo "guestName" e obrigatorio e deve ser uma string')
  }

  if (payload.guestName.trim().length < 2) {
    throw new Error('Nome do convidado muito curto')
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
    }
  })

  const prompt = PROMPTS.generate_ice_breakers(
    payload.guestName,
    payload.keyFacts || [],
    payload.occupation
  )
  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  let parsed: IceBreakerResult
  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[generate_ice_breakers] Failed to parse JSON:', text)
    throw new Error('Falha ao processar resposta do modelo')
  }

  parsed.iceBreakers = Array.isArray(parsed.iceBreakers) ? parsed.iceBreakers.slice(0, 5) : []

  return parsed
}

async function handleGeneratePautaQuestions(
  genAI: GoogleGenerativeAI,
  payload: PautaQuestionsPayload
): Promise<PautaQuestionsResult> {
  if (!payload.guestName || typeof payload.guestName !== 'string') {
    throw new Error('Campo "guestName" e obrigatorio e deve ser uma string')
  }

  if (!payload.outline || !Array.isArray(payload.outline.mainSections)) {
    throw new Error('Campo "outline" com "mainSections" e obrigatorio')
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    }
  })

  const prompt = PROMPTS.generate_pauta_questions(payload)
  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  let parsed: PautaQuestionsResult
  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[generate_pauta_questions] Failed to parse JSON:', text)
    throw new Error('Falha ao processar resposta do modelo')
  }

  parsed.questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 20) : []

  return parsed
}

async function handleGeneratePautaOutline(
  genAI: GoogleGenerativeAI,
  payload: PautaOutlinePayload
): Promise<PautaOutlineResult> {
  if (!payload.guestName || typeof payload.guestName !== 'string') {
    throw new Error('Campo "guestName" e obrigatorio e deve ser uma string')
  }

  if (!payload.theme || typeof payload.theme !== 'string') {
    throw new Error('Campo "theme" e obrigatorio e deve ser uma string')
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    }
  })

  const prompt = PROMPTS.generate_pauta_outline(payload)
  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  let parsed: PautaOutlineResult
  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[generate_pauta_outline] Failed to parse JSON:', text)
    throw new Error('Falha ao processar resposta do modelo')
  }

  parsed.title = parsed.title || 'Entrevista sem titulo'
  parsed.mainSections = Array.isArray(parsed.mainSections) ? parsed.mainSections : []

  return parsed
}

// WhatsApp Message Sentiment Analysis Handler (for webhook)
async function handleWhatsAppSentiment(
  genAI: GoogleGenerativeAI,
  payload: WhatsAppSentimentPayload
): Promise<WhatsAppSentimentResult> {
  const { text } = payload

  if (!text || typeof text !== 'string') {
    throw new Error('Campo "text" e obrigatorio e deve ser uma string')
  }

  if (text.trim().length < 2) {
    throw new Error('Texto muito curto para analise')
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 256,
    }
  })

  const prompt = `Analise o sentimento da seguinte mensagem de WhatsApp:

"${text}"

Retorne APENAS um JSON com:
- sentiment: 'positive', 'neutral', ou 'negative'
- sentimentScore: numero de -1 (negativo) a 1 (positivo)
- triggers: lista de ate 3 gatilhos (work, health, relationship, finance, personal_growth, family, leisure, etc)
- summary: resumo em 1 frase (max 100 caracteres)

Responda APENAS com JSON valido, sem explicacoes.`

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text_response = response.text()

  // Parse JSON response
  let parsed: Omit<WhatsAppSentimentResult, 'timestamp'>
  try {
    const jsonStr = text_response.replace(/```json\n?|\n?```/g, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('[whatsapp_sentiment] Failed to parse JSON:', text_response)
    throw new Error('Falha ao processar resposta do modelo')
  }

  // Validate and normalize response
  const validSentiments = ['positive', 'neutral', 'negative']
  if (!validSentiments.includes(parsed.sentiment)) {
    parsed.sentiment = 'neutral'
  }

  // Clamp sentimentScore to [-1, 1]
  parsed.sentimentScore = Math.max(-1, Math.min(1, parsed.sentimentScore || 0))

  // Ensure array
  parsed.triggers = Array.isArray(parsed.triggers) ? parsed.triggers.slice(0, 3) : []
  parsed.summary = parsed.summary || ''

  return parsed as WhatsAppSentimentResult
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
// JOURNEY MODULE HANDLERS
// ============================================================================

/**
 * Handle real-time content analysis for Journey moments
 */
async function handleAnalyzeContentRealtime(
  genAI: GoogleGenerativeAI,
  payload: any
): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: temperature || 0.8,
      maxOutputTokens: maxOutputTokens || 150,
    }
  })

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  return { text }
}

/**
 * Handle post-capture insight generation
 */
async function handleGeneratePostCaptureInsight(
  genAI: GoogleGenerativeAI,
  payload: any
): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: temperature || 0.7,
      maxOutputTokens: maxOutputTokens || 200,
    }
  })

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  return { text }
}

/**
 * Handle moment clustering by theme
 */
async function handleClusterMomentsByTheme(
  genAI: GoogleGenerativeAI,
  payload: any
): Promise<{ text: string }> {
  const { prompt, temperature, maxOutputTokens } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: temperature || 0.6,
      maxOutputTokens: maxOutputTokens || 500,
    }
  })

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  return { text }
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
          // Alias for legacy chat with finance context
          const chatResult = await handleLegacyChat(genAI, {
            message: payload?.message,
            context: payload?.context,
            history: payload?.history,
            systemPrompt: payload?.systemPrompt,
          })
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
          // Webhook handler for WhatsApp message sentiment analysis
          result = await handleWhatsAppSentiment(genAI, payload as WhatsAppSentimentPayload)
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
