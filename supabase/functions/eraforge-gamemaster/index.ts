/**
 * EraForge Game Master — Edge Function
 *
 * AI-powered game master for the EraForge historical simulation module.
 * Generates scenarios, processes decisions, and runs simulations
 * for children (7-8 years) exploring historical eras.
 *
 * Actions:
 *   - generate_scenario: Create a turn scenario with choices and advisor hints
 *   - process_decision: Evaluate a child's choice and produce consequences
 *   - run_simulation: Simulate 14 days of world events
 *
 * Safety: 4-layer content filtering for age-appropriate educational content.
 *
 * @issue #314 (EF-003)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "npm:@google/generative-ai@0.21.0"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"
import { getCorsHeaders } from "../_shared/cors.ts"
import { withHealthTracking } from "../_shared/health-tracker.ts"

// ============================================================================
// CONSTANTS
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MODEL = 'gemini-2.5-flash'

/**
 * Safety settings — BLOCK_LOW_AND_ABOVE on all categories.
 * This is layer 1 of the 4-layer safety system for children's content.
 */
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
]

// ============================================================================
// ERA & ADVISOR DATA
// ============================================================================

const ERA_LABELS: Record<string, string> = {
  stone_age: 'Idade da Pedra (~3M a.C. - 3500 a.C.)',
  ancient_egypt: 'Egito Antigo (3100 a.C. - 30 a.C.)',
  classical_greece: 'Grécia Clássica (800 a.C. - 146 a.C.)',
  roman_empire: 'Império Romano (27 a.C. - 476 d.C.)',
  medieval: 'Idade Média (476 - 1453)',
  renaissance: 'Renascimento (1300 - 1600)',
  industrial_revolution: 'Revolução Industrial (1760 - 1840)',
  modern: 'Era Moderna (1900 - presente)',
  future: 'Futuro (2100+)',
}

const ADVISOR_DESCRIPTIONS: Record<string, string> = {
  historian: 'Prof. Chronos (Historiador) — especialista em fatos históricos e contexto',
  scientist: 'Dra. Eureka (Cientista) — especialista em descobertas científicas da era',
  artist: 'Mestre Artisan (Artista) — especialista em arte, cultura e arquitetura',
  explorer: 'Capitão Vento (Explorador) — especialista em geografia e navegação',
  philosopher: 'Sábio Logos (Filósofo) — especialista em ética e questões filosóficas',
  engineer: 'Eng. Mechanica (Engenheiro) — especialista em tecnologia e engenharia',
  diplomat: 'Embaixador Pax (Diplomata) — especialista em política e dinâmicas sociais',
}

// ============================================================================
// SYSTEM PROMPT — Layer 2 of safety (age restrictions, language, educational)
// ============================================================================

const SYSTEM_PROMPT = `Você é o Mestre do Jogo do EraForge, um jogo educativo de simulação histórica para crianças de 7-8 anos.

REGRAS ABSOLUTAS DE SEGURANÇA:
- Todo conteúdo DEVE ser apropriado para crianças de 7-8 anos
- NUNCA mencione violência gráfica, sangue, morte explícita, armas letais
- NUNCA mencione conteúdo sexual, romântico ou sugestivo
- NUNCA use linguagem ofensiva, preconceituosa ou discriminatória
- NUNCA mencione drogas, álcool ou substâncias
- Conflitos históricos devem ser apresentados de forma leve e educativa (ex: "disputas", "desafios", "competições")
- Personagens históricos devem ser apresentados de forma positiva e inspiradora
- Morte deve ser referida como "partiu em uma longa viagem" ou simplesmente omitida

REGRAS DE CONTEÚDO:
- Idioma: SEMPRE em Português Brasileiro (pt-BR)
- Tom: Aventureiro, divertido, encorajador, educativo
- Vocabulário: Simples e acessível para crianças
- Fatos históricos: Precisos mas simplificados para a faixa etária
- Cada cenário deve ensinar algo real sobre a era histórica
- Escolhas devem promover valores: cooperação, coragem, conhecimento, empatia

OS 7 CONSELHEIROS DISPONÍVEIS:
${Object.entries(ADVISOR_DESCRIPTIONS).map(([id, desc]) => `- ${id}: ${desc}`).join('\n')}

Cada conselheiro tem personalidade única e oferece dicas baseadas em sua especialidade.

FORMATO DE RESPOSTA:
- Retorne SEMPRE um JSON válido (sem markdown, sem texto extra)
- Siga EXATAMENTE a estrutura solicitada em cada ação`

// ============================================================================
// TYPES
// ============================================================================

interface GameMasterRequest {
  action: 'generate_scenario' | 'process_decision' | 'run_simulation'
  payload: Record<string, any>
}

type SocialMode = 'solo' | 'encounter' | 'collaborative' | 'interdependent'

interface GenerateScenarioPayload {
  era: string
  worldName: string
  socialMode?: SocialMode
  memberStats: { knowledge: number; cooperation: number; courage: number }
  turnHistory?: Array<{ title?: string; decision?: string }>
}

interface ProcessDecisionPayload {
  scenario: {
    title?: string
    description?: string
    location?: string
    choices?: Array<{ id: string; text: string; consequence_hint?: string }>
    historical_context?: string
  }
  choiceId: string
  advisorId?: string
  era: string
  memberStats: { knowledge: number; cooperation: number; courage: number }
}

interface RunSimulationPayload {
  worldName: string
  era: string
  eraProgress: number
  memberStats: { knowledge: number; cooperation: number; courage: number }
  days?: number
}

// ============================================================================
// EXTRACT JSON — Robust parser (same pattern as gemini-chat)
// ============================================================================

function extractJSON<T = any>(text: string): T {
  // 1. Strip code fences FIRST
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
// SAFETY LAYER 4 — Post-processing content filter
// ============================================================================

const BLOCKED_WORDS = [
  'matar', 'morrer', 'morte', 'sangue', 'arma', 'espada', 'faca',
  'guerra', 'batalha', 'destruir', 'destruição', 'violência',
  'sexo', 'sexual', 'droga', 'álcool', 'cerveja', 'vinho',
  'estupro', 'assassinato', 'tortura', 'escravo', 'escravidão',
]

function sanitizeText(text: string): string {
  let result = text
  for (const word of BLOCKED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    result = result.replace(regex, '***')
  }
  return result
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') return sanitizeText(obj)
  if (Array.isArray(obj)) return obj.map(sanitizeObject)
  if (obj && typeof obj === 'object') {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value)
    }
    return result
  }
  return obj
}

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

const SOCIAL_MODE_INSTRUCTIONS: Record<SocialMode, string> = {
  solo: 'cenário individual de sobrevivência ou exploração — a criança age sozinha, descobre recursos, enfrenta desafios da natureza',
  encounter: 'encontro com outros exploradores, troca de recursos, primeiro contato com outros grupos — cooperação inicial e curiosidade',
  collaborative: 'construção coletiva, decisões da comunidade, trabalho em equipe para superar desafios comuns',
  interdependent: 'decisões políticas, diplomacia, papéis de liderança, alianças estratégicas e consequências para toda a civilização',
}

function buildGenerateScenarioPrompt(payload: GenerateScenarioPayload): string {
  const eraLabel = ERA_LABELS[payload.era] || payload.era
  const { knowledge, cooperation, courage } = payload.memberStats
  const socialMode = payload.socialMode || 'solo'
  const socialInstruction = SOCIAL_MODE_INSTRUCTIONS[socialMode] || SOCIAL_MODE_INSTRUCTIONS.solo

  const recentTurns = payload.turnHistory?.slice(-3).map((t, i) =>
    `  Turno ${i + 1}: ${t.title || 'Sem título'} — Escolha: ${t.decision || 'nenhuma'}`
  ).join('\n') || '  Nenhum turno anterior (primeiro turno!)'

  return `Gere um cenário de aventura educativa para uma criança explorando a era "${eraLabel}" no mundo "${payload.worldName}".

ESTATÍSTICAS DA CRIANÇA:
- Conhecimento: ${knowledge}/100
- Cooperação: ${cooperation}/100
- Coragem: ${courage}/100

MODO SOCIAL: ${socialMode}
Tipo de cenário esperado: ${socialInstruction}

TURNOS RECENTES (evite repetir temas):
${recentTurns}

REQUISITOS DO CENÁRIO:
- Título criativo e envolvente (máx 60 caracteres)
- Descrição: 2-3 frases descrevendo a situação (máx 200 caracteres) — deve refletir o Modo Social acima
- Local histórico real ou plausível da era
- 3 escolhas distintas que promovam valores diferentes (conhecimento, cooperação, coragem)
- Contexto histórico: 1 fato real simplificado sobre a era
- Dicas dos 7 conselheiros: cada um dá uma dica curta baseada em sua especialidade

Retorne APENAS este JSON:
{
  "title": "string",
  "description": "string",
  "location": "string",
  "choices": [
    { "id": "1", "text": "string", "consequence_hint": "string" },
    { "id": "2", "text": "string", "consequence_hint": "string" },
    { "id": "3", "text": "string", "consequence_hint": "string" }
  ],
  "historical_context": "string",
  "advisor_hints": {
    "historian": "string",
    "scientist": "string",
    "artist": "string",
    "explorer": "string",
    "philosopher": "string",
    "engineer": "string",
    "diplomat": "string"
  }
}`
}

function buildProcessDecisionPrompt(payload: ProcessDecisionPayload): string {
  const eraLabel = ERA_LABELS[payload.era] || payload.era
  const chosenChoice = payload.scenario.choices?.find(c => c.id === payload.choiceId)
  const advisorLabel = payload.advisorId
    ? ADVISOR_DESCRIPTIONS[payload.advisorId] || payload.advisorId
    : 'nenhum conselheiro consultado'

  return `A criança está na era "${eraLabel}" e fez uma escolha.

CENÁRIO: ${payload.scenario.title}
${payload.scenario.description}
Local: ${payload.scenario.location}

ESCOLHA FEITA: "${chosenChoice?.text || 'Escolha desconhecida'}"
(Dica prevista: ${chosenChoice?.consequence_hint || 'nenhuma'})

CONSELHEIRO CONSULTADO: ${advisorLabel}

ESTATÍSTICAS ATUAIS:
- Conhecimento: ${payload.memberStats.knowledge}/100
- Cooperação: ${payload.memberStats.cooperation}/100
- Coragem: ${payload.memberStats.courage}/100

REQUISITOS DA RESPOSTA:
- Narrativa: 2-3 frases descrevendo o resultado da escolha (tom positivo e educativo)
- Deltas de estatísticas: valores entre -5 e +10 (a maioria das escolhas deve dar bônus)
- Progresso da era: 1-5 pontos (escolhas melhores = mais progresso)
- Fato histórico: 1 fato real da era relacionado à escolha
- Conteúdo desbloqueado: 0-2 itens educativos (ex: "Descobriu como faziam cerâmica!")

Retorne APENAS este JSON:
{
  "narrative": "string",
  "knowledge_delta": number,
  "cooperation_delta": number,
  "courage_delta": number,
  "era_progress_delta": number,
  "historical_fact": "string",
  "unlocked_content": ["string"]
}`
}

function buildRunSimulationPrompt(payload: RunSimulationPayload): string {
  const eraLabel = ERA_LABELS[payload.era] || payload.era
  const days = payload.days || 14

  return `Simule ${days} dias passando no mundo "${payload.worldName}" durante a era "${eraLabel}".

ESTADO DO MUNDO:
- Era: ${eraLabel}
- Progresso na era: ${payload.eraProgress}%
- Conhecimento da comunidade: ${payload.memberStats.knowledge}/100
- Cooperação da comunidade: ${payload.memberStats.cooperation}/100
- Coragem da comunidade: ${payload.memberStats.courage}/100

REQUISITOS DA SIMULAÇÃO:
- Gere 5-8 eventos que aconteceram durante esses ${days} dias
- Eventos devem ser educativos e relacionados à era
- Mix de impactos: maioria positiva, alguns neutros, poucos negativos (mas sempre leves)
- Eventos negativos devem ser desafios superáveis (nunca catastróficos)
- Cada evento tem título, descrição curta, a era e seu impacto

Retorne APENAS este JSON:
{
  "events": [
    { "title": "string", "description": "string", "era": "${payload.era}", "impact": "positive|neutral|negative" }
  ],
  "summary": "string (resumo geral dos ${days} dias em 1-2 frases)",
  "stats_delta": {
    "knowledge": number,
    "cooperation": number,
    "courage": number,
    "era_progress": number
  }
}`
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

async function handleGenerateScenario(
  genAI: GoogleGenerativeAI,
  payload: GenerateScenarioPayload,
): Promise<any> {
  if (!payload.era) throw new Error('Campo "era" é obrigatório')
  if (!payload.memberStats) throw new Error('Campo "memberStats" é obrigatório')

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    },
  })

  const prompt = buildGenerateScenarioPrompt(payload)
  const result = await model.generateContent(prompt)
  const text = result.response.text()

  let parsed: any
  try {
    parsed = extractJSON(text)
  } catch (e) {
    console.warn('[generate_scenario] JSON parse failed:', (e as Error).message)
    // Fallback safe scenario
    parsed = {
      title: `Aventura na ${ERA_LABELS[payload.era] || payload.era}`,
      description: 'Uma nova aventura aguarda! Explore este lugar incrível.',
      location: 'Praça central da vila',
      choices: [
        { id: '1', text: 'Explorar a área com cuidado', consequence_hint: 'Pode encontrar algo interessante' },
        { id: '2', text: 'Conversar com os moradores', consequence_hint: 'Pode aprender algo novo' },
        { id: '3', text: 'Ajudar a construir algo', consequence_hint: 'Pode ajudar a comunidade' },
      ],
      historical_context: 'Cada era tem suas próprias descobertas incríveis!',
      advisor_hints: {},
    }
  }

  // Layer 3: Type validation
  parsed.title = String(parsed.title || '').substring(0, 100)
  parsed.description = String(parsed.description || '').substring(0, 300)
  parsed.location = String(parsed.location || '').substring(0, 100)
  parsed.historical_context = String(parsed.historical_context || '').substring(0, 500)

  if (!Array.isArray(parsed.choices) || parsed.choices.length < 2) {
    parsed.choices = [
      { id: '1', text: 'Explorar', consequence_hint: 'Descobrir algo novo' },
      { id: '2', text: 'Ajudar', consequence_hint: 'Fazer amigos' },
      { id: '3', text: 'Aprender', consequence_hint: 'Ganhar conhecimento' },
    ]
  }
  parsed.choices = parsed.choices.slice(0, 4).map((c: any, i: number) => ({
    id: String(c.id || i + 1),
    text: String(c.text || '').substring(0, 150),
    consequence_hint: String(c.consequence_hint || '').substring(0, 150),
  }))

  if (parsed.advisor_hints && typeof parsed.advisor_hints === 'object') {
    const validAdvisors = ['historian', 'scientist', 'artist', 'explorer', 'philosopher', 'engineer', 'diplomat']
    const cleanedHints: Record<string, string> = {}
    for (const id of validAdvisors) {
      if (parsed.advisor_hints[id]) {
        cleanedHints[id] = String(parsed.advisor_hints[id]).substring(0, 200)
      }
    }
    parsed.advisor_hints = cleanedHints
  } else {
    parsed.advisor_hints = {}
  }

  // Layer 4: Post-processing sanitization
  return sanitizeObject(parsed)
}

async function handleProcessDecision(
  genAI: GoogleGenerativeAI,
  payload: ProcessDecisionPayload,
): Promise<any> {
  if (!payload.scenario) throw new Error('Campo "scenario" é obrigatório')
  if (!payload.choiceId) throw new Error('Campo "choiceId" é obrigatório')
  if (!payload.era) throw new Error('Campo "era" é obrigatório')
  if (!payload.memberStats) throw new Error('Campo "memberStats" é obrigatório')

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    },
  })

  const prompt = buildProcessDecisionPrompt(payload)
  const result = await model.generateContent(prompt)
  const text = result.response.text()

  let parsed: any
  try {
    parsed = extractJSON(text)
  } catch (e) {
    console.warn('[process_decision] JSON parse failed:', (e as Error).message)
    parsed = {
      narrative: 'Sua escolha teve um resultado interessante! Você aprendeu algo novo sobre esta era.',
      knowledge_delta: 2,
      cooperation_delta: 1,
      courage_delta: 1,
      era_progress_delta: 2,
      historical_fact: 'Cada decisão nos ensina algo sobre o passado.',
      unlocked_content: [],
    }
  }

  // Layer 3: Type validation + clamping
  parsed.narrative = String(parsed.narrative || '').substring(0, 500)
  parsed.historical_fact = String(parsed.historical_fact || '').substring(0, 300)
  parsed.knowledge_delta = clampDelta(parsed.knowledge_delta)
  parsed.cooperation_delta = clampDelta(parsed.cooperation_delta)
  parsed.courage_delta = clampDelta(parsed.courage_delta)
  parsed.era_progress_delta = Math.max(0, Math.min(10, Number(parsed.era_progress_delta) || 1))
  parsed.unlocked_content = Array.isArray(parsed.unlocked_content)
    ? parsed.unlocked_content.slice(0, 3).map((s: any) => String(s).substring(0, 200))
    : []

  // Layer 4: Post-processing sanitization
  return sanitizeObject(parsed)
}

async function handleRunSimulation(
  genAI: GoogleGenerativeAI,
  payload: RunSimulationPayload,
): Promise<any> {
  if (!payload.era) throw new Error('Campo "era" é obrigatório')
  if (!payload.worldName) throw new Error('Campo "worldName" é obrigatório')
  if (!payload.memberStats) throw new Error('Campo "memberStats" é obrigatório')

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    },
  })

  const prompt = buildRunSimulationPrompt(payload)
  const result = await model.generateContent(prompt)
  const text = result.response.text()

  let parsed: any
  try {
    parsed = extractJSON(text)
  } catch (e) {
    console.warn('[run_simulation] JSON parse failed:', (e as Error).message)
    parsed = {
      events: [{
        title: 'Dia tranquilo na vila',
        description: 'A comunidade trabalhou junta e todos aprenderam algo novo.',
        era: payload.era,
        impact: 'positive',
      }],
      summary: 'Os dias passaram com atividades educativas e descobertas.',
      stats_delta: { knowledge: 3, cooperation: 2, courage: 1, era_progress: 2 },
    }
  }

  // Layer 3: Type validation
  const validImpacts = ['positive', 'neutral', 'negative']
  parsed.events = Array.isArray(parsed.events)
    ? parsed.events.slice(0, 10).map((e: any) => ({
        title: String(e.title || '').substring(0, 100),
        description: String(e.description || '').substring(0, 300),
        era: ERA_LABELS[e.era] ? e.era : payload.era,
        impact: validImpacts.includes(e.impact) ? e.impact : 'neutral',
      }))
    : []

  parsed.summary = String(parsed.summary || '').substring(0, 500)

  if (parsed.stats_delta && typeof parsed.stats_delta === 'object') {
    parsed.stats_delta = {
      knowledge: clampDelta(parsed.stats_delta.knowledge, -10, 20),
      cooperation: clampDelta(parsed.stats_delta.cooperation, -10, 20),
      courage: clampDelta(parsed.stats_delta.courage, -10, 20),
      era_progress: Math.max(0, Math.min(15, Number(parsed.stats_delta.era_progress) || 2)),
    }
  } else {
    parsed.stats_delta = { knowledge: 2, cooperation: 1, courage: 1, era_progress: 2 }
  }

  // Layer 4: Post-processing sanitization
  return sanitizeObject(parsed)
}

// ============================================================================
// HELPERS
// ============================================================================

function clampDelta(value: any, min = -5, max = 10): number {
  return Math.max(min, Math.min(max, Number(value) || 0))
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
      console.error('[eraforge-gamemaster] GEMINI_API_KEY não configurada')
      return new Response(
        JSON.stringify({ success: false, error: 'API key não configurada no servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // JWT auth validation
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Verify JWT via Supabase
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const body: GameMasterRequest = await req.json()
    const { action, payload } = body

    if (!action || !payload) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos "action" e "payload" são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[eraforge-gamemaster] Action: ${action} | User: ${user.id}`)

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    let result: any

    const healthOpts = { functionName: 'eraforge-gamemaster', actionName: action }

    switch (action) {
      case 'generate_scenario':
        result = await withHealthTracking(healthOpts, supabaseAdmin, () =>
          handleGenerateScenario(genAI, payload as GenerateScenarioPayload)
        )
        break

      case 'process_decision':
        result = await withHealthTracking(healthOpts, supabaseAdmin, () =>
          handleProcessDecision(genAI, payload as ProcessDecisionPayload)
        )
        break

      case 'run_simulation':
        result = await withHealthTracking(healthOpts, supabaseAdmin, () =>
          handleRunSimulation(genAI, payload as RunSimulationPayload)
        )
        break

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }

    const elapsed = Date.now() - startTime
    console.log(`[eraforge-gamemaster] ${action} completed in ${elapsed}ms`)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const elapsed = Date.now() - startTime
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[eraforge-gamemaster] Error after ${elapsed}ms:`, message)

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
