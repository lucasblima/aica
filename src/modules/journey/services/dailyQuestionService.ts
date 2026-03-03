/**
 * Daily Question Service with AI-Driven Question Generation
 *
 * Sistema em 3 níveis:
 * 1. AI-Driven (Gemini): Perguntas geradas dinamicamente baseadas no contexto do usuário
 * 2. Journey Fallback: Perguntas específicas da trilha ativa
 * 3. Pool Fixo: Pool rotativo de perguntas reflexivas genéricas
 */

import { supabase } from '@/services/supabaseClient'
import { GeminiClient } from '@/lib/gemini'
import type { GeminiChatResponse } from '@/lib/gemini'
import { createNamespacedLogger } from '@/lib/logger'
import { trackAIUsage } from '@/services/aiUsageTrackingService'
import { QuestionWithResponse, DailyQuestion, QuestionCategory } from '../types/dailyQuestion'

const log = createNamespacedLogger('DailyQuestion')

interface UserContext {
  healthStatus: {
    burnoutCount: number
    mentalHealthFlags: string[]
    energyLevel?: number
  }
  criticalAreas: Array<{
    areaId: string
    areaName: string
    severity: 'low' | 'medium' | 'high'
    isBlocking: boolean
  }>
  activeJourneys: Array<{
    areaId: string
    journeyType: string
    completionPercentage: number
  }>
  recentResponses: Array<{
    questionText: string
    answer: string
    date: string
  }>
  momentHistory?: Array<{
    emotion: string
    tags: string[]
    date: string
  }>
  // Enriched context (Wave 3)
  lifeCouncil?: {
    headline: string
    synthesis: string
    status: string
    actions: string[]
  } | null
  patterns?: Array<{
    type: string
    description: string
    confidence: number
  }>
  weeklySummary?: {
    emotionalTrend: string
    dominantEmotions: string[]
    insights: string[]
    suggestedFocus: string
  } | null
  timeOfDay?: 'morning' | 'afternoon' | 'evening'
}

interface DailyQuestionResult {
  question: QuestionWithResponse
  source: 'ai' | 'journey' | 'pool'
  generatedAt: string
}

/**
 * Pool fixo de perguntas reflexivas (Fallback Level 3)
 */
const FALLBACK_QUESTION_POOL: DailyQuestion[] = [
  // reflection (4)
  {
    id: 'pool-1',
    question_text: 'Como você está se sentindo neste momento?',
    category: 'reflection',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-2',
    question_text: 'Qual área da sua vida precisa de mais atenção?',
    category: 'reflection',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-3',
    question_text: 'Se pudesse mudar uma coisa hoje, o que seria?',
    category: 'reflection',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-4',
    question_text: 'O que seus pensamentos recentes revelam sobre você?',
    category: 'reflection',
    active: true,
    created_at: new Date().toISOString(),
  },
  // gratitude (4)
  {
    id: 'pool-5',
    question_text: 'O que te deixaria orgulhoso hoje?',
    category: 'gratitude',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-6',
    question_text: 'Qual foi a melhor parte do seu dia?',
    category: 'gratitude',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-7',
    question_text: 'Por qual pessoa na sua vida você é grato hoje?',
    category: 'gratitude',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-8',
    question_text: 'Qual pequena conquista recente você ainda não celebrou?',
    category: 'gratitude',
    active: true,
    created_at: new Date().toISOString(),
  },
  // energy (4)
  {
    id: 'pool-9',
    question_text: 'Como você pode se cuidar melhor agora?',
    category: 'energy',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-10',
    question_text: 'Como você quer se sentir nesta semana?',
    category: 'energy',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-11',
    question_text: 'O que drena sua energia e como reduzir isso?',
    category: 'energy',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-12',
    question_text: 'Qual atividade te recarrega que você tem negligenciado?',
    category: 'energy',
    active: true,
    created_at: new Date().toISOString(),
  },
  // learning (4)
  {
    id: 'pool-13',
    question_text: 'O que você aprendeu recentemente que mudou sua perspectiva?',
    category: 'learning',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-14',
    question_text: 'Qual erro recente te ensinou algo valioso?',
    category: 'learning',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-15',
    question_text: 'Que habilidade você gostaria de dominar este ano?',
    category: 'learning',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-16',
    question_text: 'Quem te inspirou recentemente e por quê?',
    category: 'learning',
    active: true,
    created_at: new Date().toISOString(),
  },
  // change (4)
  {
    id: 'pool-17',
    question_text: 'O que você quer conquistar hoje?',
    category: 'change',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-18',
    question_text: 'Qual hábito antigo você está pronto para abandonar?',
    category: 'change',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-19',
    question_text: 'Que primeiro passo você pode dar agora rumo ao seu objetivo?',
    category: 'change',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-20',
    question_text: 'O que te impede de fazer a mudança que deseja?',
    category: 'change',
    active: true,
    created_at: new Date().toISOString(),
  },
  // connection (4)
  {
    id: 'pool-21',
    question_text: 'Com quem você gostaria de se reconectar esta semana?',
    category: 'connection',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-22',
    question_text: 'Qual relacionamento merece mais da sua atenção agora?',
    category: 'connection',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-23',
    question_text: 'Como você pode demonstrar mais carinho por alguém hoje?',
    category: 'connection',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-24',
    question_text: 'Que conversa importante você tem adiado?',
    category: 'connection',
    active: true,
    created_at: new Date().toISOString(),
  },
  // purpose (4)
  {
    id: 'pool-25',
    question_text: 'O que dá sentido ao seu dia a dia?',
    category: 'purpose',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-26',
    question_text: 'Seu trabalho atual reflete seus valores mais profundos?',
    category: 'purpose',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-27',
    question_text: 'Que legado você quer construir com suas ações?',
    category: 'purpose',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-28',
    question_text: 'Qual causa maior que você te motiva a seguir?',
    category: 'purpose',
    active: true,
    created_at: new Date().toISOString(),
  },
  // creativity (4)
  {
    id: 'pool-29',
    question_text: 'Quando foi a última vez que você criou algo por prazer?',
    category: 'creativity',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-30',
    question_text: 'Que ideia tem ocupado sua mente que merece ação?',
    category: 'creativity',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-31',
    question_text: 'Como você pode trazer mais criatividade para sua rotina?',
    category: 'creativity',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-32',
    question_text: 'Que projeto pessoal te empolga mas nunca começa?',
    category: 'creativity',
    active: true,
    created_at: new Date().toISOString(),
  },
  // health (4)
  {
    id: 'pool-33',
    question_text: 'Como está a qualidade do seu sono ultimamente?',
    category: 'health',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-34',
    question_text: 'Você tem se movimentado o suficiente nos últimos dias?',
    category: 'health',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-35',
    question_text: 'Que sinal do seu corpo você tem ignorado?',
    category: 'health',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-36',
    question_text: 'O que você pode fazer hoje para nutrir melhor seu corpo?',
    category: 'health',
    active: true,
    created_at: new Date().toISOString(),
  },
  // mindfulness (4)
  {
    id: 'pool-37',
    question_text: 'Quantas vezes hoje você parou para respirar fundo?',
    category: 'mindfulness',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-38',
    question_text: 'O que está presente ao seu redor que você não notou?',
    category: 'mindfulness',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-39',
    question_text: 'Que pensamento repetitivo está ocupando sua mente hoje?',
    category: 'mindfulness',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-40',
    question_text: 'Você está vivendo o presente ou preso no futuro?',
    category: 'mindfulness',
    active: true,
    created_at: new Date().toISOString(),
  },
]

/**
 * Mapeia jornadas para perguntas específicas (Fallback Level 2)
 */
const JOURNEY_QUESTION_MAP: Record<string, string> = {
  'financial-recovery': 'Qual é o primeiro passo para organizar suas finanças agora?',
  'burnout-recovery': 'Você conseguiu descansar adequadamente nos últimos dias?',
  'health-recovery': 'Como você está cuidando de sua saúde física hoje?',
  'relationship-improvement': 'Como você pode fortalecer seus relacionamentos?',
  'career-development': 'Qual habilidade você gostaria de desenvolver na sua carreira?',
  'habit-formation': 'Qual hábito você está construindo com sucesso?',
}

/**
 * Fetch contexto do usuário para geração de perguntas AI
 */
async function getUserContext(userId: string): Promise<UserContext> {
  try {
    // 1. Fetch saúde/bem-estar do usuário (moments recentes)
    const { data: recentMoments } = await supabase
      .from('moments')
      .select('emotion, tags, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Contar burnouts e emoções negativas
    const burnoutCount = recentMoments?.filter(
      m => m.emotion === 'burnt out' || m.emotion === 'stressed'
    ).length || 0

    const emotionPattern = recentMoments?.map(m => m.emotion) || []
    const mentalHealthFlags = []

    if (emotionPattern.includes('depressed') || emotionPattern.includes('anxious')) {
      mentalHealthFlags.push('depression_anxiety')
    }
    if (burnoutCount >= 2) {
      mentalHealthFlags.push('burnout')
    }
    if (emotionPattern.includes('overwhelmed')) {
      mentalHealthFlags.push('overwhelm')
    }

    // 2. Critical areas — user_areas table not yet created (future feature)
    const criticalAreas: UserContext['criticalAreas'] = []

    // 3. Active journeys — user_journeys table not yet created (future feature)
    const activeJourneys: Array<{ area_id: string; journey_type: string; completion_percentage: number }> = []

    // 4. Fetch respostas recentes a perguntas (últimos 7 dias)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentResponses } = await supabase
      .from('question_responses')
      .select(`
        id,
        response_text,
        responded_at,
        daily_questions (question_text)
      `)
      .eq('user_id', userId)
      .gt('responded_at', sevenDaysAgo)
      .order('responded_at', { ascending: false })
      .limit(5)

    // 5. Enriched context — fetch in parallel, graceful degradation
    const [councilResult, patternsResult, summaryResult] = await Promise.allSettled([
      supabase
        .from('daily_council_insights')
        .select('headline, synthesis, overall_status, actions')
        .eq('user_id', userId)
        .order('insight_date', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('user_patterns')
        .select('pattern_type, description, confidence_score')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('confidence_score', { ascending: false })
        .limit(5),
      supabase
        .from('weekly_summaries')
        .select('summary_data')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    // Extract enriched context (null if fetch failed)
    const councilData = councilResult.status === 'fulfilled' && councilResult.value.data
      ? {
          headline: councilResult.value.data.headline,
          synthesis: councilResult.value.data.synthesis,
          status: councilResult.value.data.overall_status,
          actions: (councilResult.value.data.actions as any[])?.map((a: any) => a.text || a.action || String(a)) || [],
        }
      : null

    const patternsData = patternsResult.status === 'fulfilled' && patternsResult.value.data
      ? patternsResult.value.data.map((p: any) => ({
          type: p.pattern_type,
          description: p.description,
          confidence: p.confidence_score,
        }))
      : []

    const summaryRaw = summaryResult.status === 'fulfilled' && summaryResult.value.data?.summary_data
      ? summaryResult.value.data.summary_data as any
      : null

    const weeklySummaryData = summaryRaw
      ? {
          emotionalTrend: summaryRaw.emotionalTrend || summaryRaw.emotional_trend || 'stable',
          dominantEmotions: summaryRaw.dominantEmotions || summaryRaw.dominant_emotions || [],
          insights: summaryRaw.insights || [],
          suggestedFocus: summaryRaw.suggestedFocus || summaryRaw.suggested_focus || '',
        }
      : null

    // 6. Time of day
    const hour = new Date().getHours()
    const timeOfDay: 'morning' | 'afternoon' | 'evening' =
      hour >= 5 && hour < 12 ? 'morning' :
      hour >= 12 && hour < 18 ? 'afternoon' : 'evening'

    return {
      healthStatus: {
        burnoutCount,
        mentalHealthFlags,
        energyLevel: undefined,
      },
      criticalAreas,
      activeJourneys: activeJourneys?.map(j => ({
        areaId: j.area_id,
        journeyType: j.journey_type,
        completionPercentage: j.completion_percentage,
      })) || [],
      recentResponses: (recentResponses || []).map(r => ({
        questionText: (r.daily_questions as any)?.question_text || '',
        answer: r.response_text,
        date: r.responded_at,
      })),
      momentHistory: (recentMoments || []).map(m => ({
        emotion: m.emotion,
        tags: m.tags || [],
        date: m.created_at,
      })),
      lifeCouncil: councilData,
      patterns: patternsData,
      weeklySummary: weeklySummaryData,
      timeOfDay,
    }
  } catch (error) {
    log.error('Error fetching user context:', error)
    return {
      healthStatus: {
        burnoutCount: 0,
        mentalHealthFlags: [],
      },
      criticalAreas: [],
      activeJourneys: [],
      recentResponses: [],
      momentHistory: [],
    }
  }
}

/**
 * Gera pergunta dinâmica usando Gemini (Level 1: AI-Driven)
 * Com timeout de 3s para fallback rápido
 */
async function generateAIDrivenQuestion(
  userId: string,
  context: UserContext,
  retries: number = 2
): Promise<string | null> {
  const client = GeminiClient.getInstance()
  const startTime = Date.now()

  // Estruturar prompt contextual enriquecido (Wave 3)
  const timeLabels = { morning: 'manhã', afternoon: 'tarde', evening: 'noite' }
  const timePreferences = {
    morning: 'Prefira categorias: energy, change, purpose, creativity (intenção e planejamento)',
    afternoon: 'Prefira categorias: learning, connection, mindfulness (produtividade e presença)',
    evening: 'Prefira categorias: reflection, gratitude, health (revisão e descanso)',
  }

  const systemPrompt = `Você é um assistente compassivo de bem-estar para o Aica Life OS.

Responsabilidades:
- Gerar UMA pergunta reflexiva e profundamente relevante baseada no contexto COMPLETO do usuário
- Use os insights do Life Council, padrões comportamentais e tendências emocionais para personalizar
- A pergunta deve ser útil para auto-compreensão ou ação concreta
- Deve ser curta (máximo 15 palavras)
- Nunca repetir perguntas recentes da mesma pessoa
- Adaptar tom baseado no estado emocional (mais suave se stressado, mais motivador se energizado)

Categorias disponíveis: reflection, gratitude, energy, learning, change, connection, purpose, creativity, health, mindfulness
${context.timeOfDay ? timePreferences[context.timeOfDay] : ''}

Estilo:
- Compaixão e empatia
- Linguagem simples e clara em português brasileiro
- Perguntas abertas que estimulam reflexão profunda
- Evitar julgamentos ou pressão
- Referência sutil a padrões detectados quando relevante

Formato:
Responda APENAS com a pergunta, sem explicações adicionais.`

  // Build enriched context summary
  const councilSection = context.lifeCouncil
    ? `\nInsight do Life Council:
- Status: ${context.lifeCouncil.status}
- Resumo: ${context.lifeCouncil.headline}
- Síntese: ${context.lifeCouncil.synthesis?.substring(0, 200) || ''}
- Ações sugeridas: ${context.lifeCouncil.actions?.slice(0, 3).join('; ') || 'nenhuma'}`
    : ''

  const patternsSection = context.patterns && context.patterns.length > 0
    ? `\nPadrões comportamentais detectados:
${context.patterns.map(p => `- [${p.type}] ${p.description} (confiança: ${Math.round(p.confidence * 100)}%)`).join('\n')}`
    : ''

  const weeklySection = context.weeklySummary
    ? `\nResumo semanal:
- Tendência emocional: ${context.weeklySummary.emotionalTrend}
- Emoções dominantes: ${context.weeklySummary.dominantEmotions?.join(', ') || 'não detectadas'}
- Foco sugerido: ${context.weeklySummary.suggestedFocus || 'nenhum'}
- Insights: ${context.weeklySummary.insights?.slice(0, 2).join('; ') || 'nenhum'}`
    : ''

  const contextSummary = `
Período do dia: ${context.timeOfDay ? timeLabels[context.timeOfDay] : 'desconhecido'}

Estado do usuário:
- Saúde: ${context.healthStatus.burnoutCount} burnouts, ${context.healthStatus.mentalHealthFlags.join(', ') || 'estável'}
- Áreas críticas: ${context.criticalAreas.map(a => a.areaName).join(', ') || 'nenhuma'}
- Trilhas ativas: ${context.activeJourneys.map(j => j.journeyType).join(', ') || 'nenhuma'}
- Emoções recentes: ${context.momentHistory?.slice(0, 5).map(m => m.emotion).join(', ') || 'não rastreadas'}
${councilSection}${patternsSection}${weeklySection}

Respostas recentes (evitar repetição):
${context.recentResponses.map(r => `- Pergunta: ${r.questionText}`).join('\n') || 'Sem respostas recentes'}

Gere uma pergunta reflexiva, personalizada e apropriada para este momento:
  `

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Timeout de 8s — Gemini 2.5 Flash needs more time with thinking tokens
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 8000)
      })

      const geminiPromise = client.call({
        action: 'generate_daily_question',
        payload: {
          userContext: context,
          systemPrompt,
          contextSummary,
        },
        model: 'fast', // Usar modelo rápido
      })

      const result = (await Promise.race([
        geminiPromise,
        timeoutPromise,
      ])) as GeminiChatResponse | null

      if (result?.result) {
        const question = String(result.result).trim()

        // Validar resposta (deve ter entre 5 e 100 caracteres)
        if (question.length >= 5 && question.length <= 200) {
          // Track AI usage (non-blocking, fire-and-forget)
          trackAIUsage({
            operation_type: 'text_generation',
            ai_model: result.model || 'gemini-2.5-flash',
            input_tokens: result.usageMetadata?.promptTokenCount || 0,
            output_tokens: result.usageMetadata?.candidatesTokenCount || 0,
            module_type: 'journey',
            duration_seconds: (Date.now() - startTime) / 1000,
            request_metadata: {
              function_name: 'generateAIDrivenQuestion',
              operation: 'daily_question',
              has_user_context: !!context,
            }
          }).catch(error => {
            // Non-blocking: log error but don't throw
            log.warn('[Journey AI Tracking] Non-blocking error:', error.message);
          });

          return question
        }
      }
    } catch (error) {
      if (attempt < retries - 1) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500))
      }
    }
  }

  return null
}

/**
 * Obtém pergunta da trilha ativa (Level 2: Journey Fallback)
 */
async function getJourneyQuestion(
  userId: string,
  context: UserContext
): Promise<DailyQuestion | null> {
  try {
    // Pegar trilha mais crítica/ativa
    const mostCriticalJourney = context.activeJourneys[0]

    if (!mostCriticalJourney) return null

    // Buscar pergunta na banco de dados específica da trilha
    const { data: journeyQuestions } = await supabase
      .from('daily_questions')
      .select('*')
      .eq('journey_id', mostCriticalJourney.areaId)
      .eq('active', true)
      .limit(1)

    if (journeyQuestions && journeyQuestions.length > 0) {
      return journeyQuestions[0]
    }

    // Fallback: usar mapa de perguntas padrão
    const journeyKey = Object.keys(JOURNEY_QUESTION_MAP).find(key =>
      mostCriticalJourney.journeyType.toLowerCase().includes(key.split('-')[0])
    )

    if (journeyKey) {
      return {
        id: `journey-${mostCriticalJourney.areaId}`,
        question_text: JOURNEY_QUESTION_MAP[journeyKey],
        category: 'reflection',
        active: true,
        created_at: new Date().toISOString(),
      }
    }
  } catch (error) {
    log.error('Error getting journey question:', error)
  }

  return null
}

/**
 * Obtém pergunta do pool fixo aleatoriamente (Level 3: Final Fallback)
 */
/**
 * Time-of-day category preferences for fallback pool selection
 */
const TIME_CATEGORY_WEIGHTS: Record<string, QuestionCategory[]> = {
  morning: ['energy', 'change', 'purpose', 'creativity'],
  afternoon: ['learning', 'connection', 'mindfulness'],
  evening: ['reflection', 'gratitude', 'health'],
}

/**
 * Track recently shown question IDs to avoid repetition.
 * Uses sessionStorage to persist across re-renders but reset on new session.
 */
function getRecentlyShownIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = sessionStorage.getItem('daily_question_recent_ids')
    if (stored) return new Set(JSON.parse(stored))
  } catch { /* ignore */ }
  return new Set()
}

function addRecentlyShownId(id: string): void {
  if (typeof window === 'undefined') return
  try {
    const recent = getRecentlyShownIds()
    recent.add(id)
    // Keep only last 20 IDs to prevent the pool from being exhausted
    const arr = Array.from(recent)
    if (arr.length > 20) arr.splice(0, arr.length - 20)
    sessionStorage.setItem('daily_question_recent_ids', JSON.stringify(arr))
  } catch { /* ignore */ }
}

function getPoolQuestion(userId: string): DailyQuestion {
  const hour = new Date().getHours()
  const timeOfDay = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening'
  const preferredCategories = TIME_CATEGORY_WEIGHTS[timeOfDay]
  const recentIds = getRecentlyShownIds()

  // Filter out recently shown questions
  const notRecent = FALLBACK_QUESTION_POOL.filter(q => !recentIds.has(q.id))
  const pool = notRecent.length > 0 ? notRecent : FALLBACK_QUESTION_POOL // Reset if all shown

  // 70% chance to pick from time-preferred categories, 30% fully random
  let selected: DailyQuestion
  if (Math.random() < 0.7) {
    const timeFiltered = pool.filter(q => preferredCategories.includes(q.category))
    if (timeFiltered.length > 0) {
      selected = timeFiltered[Math.floor(Math.random() * timeFiltered.length)]
    } else {
      selected = pool[Math.floor(Math.random() * pool.length)]
    }
  } else {
    selected = pool[Math.floor(Math.random() * pool.length)]
  }

  addRecentlyShownId(selected.id)
  return selected
}

/**
 * Get multiple non-repeating pool questions for the carousel.
 */
function getPoolQuestions(userId: string, count: number): DailyQuestion[] {
  const hour = new Date().getHours()
  const timeOfDay = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening'
  const preferredCategories = TIME_CATEGORY_WEIGHTS[timeOfDay]
  const recentIds = getRecentlyShownIds()

  // Filter out recently shown questions
  const notRecent = FALLBACK_QUESTION_POOL.filter(q => !recentIds.has(q.id))
  const pool = notRecent.length >= count ? notRecent : FALLBACK_QUESTION_POOL

  // Separate time-preferred and other questions
  const preferred = pool.filter(q => preferredCategories.includes(q.category))
  const other = pool.filter(q => !preferredCategories.includes(q.category))

  // Shuffle both pools
  const shuffleArray = <T>(arr: T[]): T[] => {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  const shuffledPreferred = shuffleArray(preferred)
  const shuffledOther = shuffleArray(other)

  // Pick ~70% from preferred, rest from other (ensures category variety)
  const preferredCount = Math.min(Math.ceil(count * 0.7), shuffledPreferred.length)
  const otherCount = Math.min(count - preferredCount, shuffledOther.length)

  const selected = [
    ...shuffledPreferred.slice(0, preferredCount),
    ...shuffledOther.slice(0, otherCount),
  ]

  // If still not enough, fill from whatever is available
  if (selected.length < count) {
    const selectedIds = new Set(selected.map(q => q.id))
    const remaining = shuffleArray(pool.filter(q => !selectedIds.has(q.id)))
    selected.push(...remaining.slice(0, count - selected.length))
  }

  // Track all as recently shown
  selected.forEach(q => addRecentlyShownId(q.id))

  // Shuffle final selection so preferred aren't always first
  return shuffleArray(selected)
}

/**
 * Level 1.5: Template-based question generation
 * Uses the user context already built by getUserContext() to produce
 * a contextual question without needing an AI call.
 * Returns null if no meaningful context is available.
 */
function generateTemplateQuestion(context: UserContext): string | null {
  const candidates: string[] = []

  // Template based on recent emotions
  const recentEmotions = context.momentHistory?.slice(0, 3).map(m => m.emotion).filter(Boolean) || []
  if (recentEmotions.includes('stressed') || recentEmotions.includes('burnt out')) {
    candidates.push('O que voce pode soltar hoje para aliviar a pressao?')
  }
  if (recentEmotions.includes('happy') || recentEmotions.includes('grateful')) {
    candidates.push('O que contribuiu para essa energia positiva recente?')
  }
  if (recentEmotions.includes('anxious') || recentEmotions.includes('overwhelmed')) {
    candidates.push('Qual e a menor acao que te ajudaria a se sentir mais no controle agora?')
  }
  if (recentEmotions.includes('sad') || recentEmotions.includes('depressed')) {
    candidates.push('Qual pequeno gesto de cuidado voce pode fazer por si mesmo hoje?')
  }

  // Template based on critical areas
  if (context.criticalAreas.length > 0) {
    const area = context.criticalAreas[0]
    candidates.push(`O que voce precisa para desbloquear progresso em ${area.areaName}?`)
  }

  // Template based on time of day
  if (context.timeOfDay === 'morning') {
    candidates.push('Qual e a sua intencao principal para hoje?')
  } else if (context.timeOfDay === 'evening') {
    candidates.push('Qual foi o momento mais significativo do seu dia?')
  } else if (context.timeOfDay === 'afternoon') {
    candidates.push('O que voce conquistou ate agora que merece reconhecimento?')
  }

  // Template based on Life Council insights
  if (context.lifeCouncil?.headline) {
    candidates.push('Refletindo sobre seu momento atual, o que voce gostaria de mudar primeiro?')
  }

  // Template based on patterns
  if (context.patterns && context.patterns.length > 0) {
    candidates.push('Voce notou algum padrao se repetindo na sua vida recentemente?')
  }

  if (candidates.length === 0) return null

  // Pick a random candidate
  return candidates[Math.floor(Math.random() * candidates.length)]
}

/**
 * Sistema em cascata para obter pergunta do dia
 * Level 1 → Level 1.5 → Level 2 → Level 3
 * Fetches user context ONCE and reuses across all levels.
 */
export async function getDailyQuestionWithContext(
  userId: string
): Promise<DailyQuestionResult> {
  const generatedAt = new Date().toISOString()

  // Fetch user context ONCE — reuse across all fallback levels
  let userContext: UserContext
  try {
    userContext = await getUserContext(userId)
  } catch (error) {
    log.warn('Failed to fetch user context, using empty context:', error)
    userContext = {
      healthStatus: { burnoutCount: 0, mentalHealthFlags: [] },
      criticalAreas: [],
      activeJourneys: [],
      recentResponses: [],
      momentHistory: [],
    }
  }

  try {
    // LEVEL 1: AI-Driven (Gemini)
    const aiQuestion = await generateAIDrivenQuestion(userId, userContext)
    if (aiQuestion) {
      const question: QuestionWithResponse = {
        id: `ai-${Date.now()}`,
        question_text: aiQuestion,
        category: 'reflection',
        active: true,
        created_at: generatedAt,
      }

      return {
        question,
        source: 'ai',
        generatedAt,
      }
    }

    log.debug('AI-driven question failed, trying template fallback')
  } catch (error) {
    log.warn('Level 1 (AI-Driven) failed:', error)
  }

  try {
    // LEVEL 1.5: Template-based fallback using already-fetched user context
    const templateQuestion = generateTemplateQuestion(userContext)
    if (templateQuestion) {
      log.info('Using Level 1.5 template-based question')
      const question: QuestionWithResponse = {
        id: `template-${Date.now()}`,
        question_text: templateQuestion,
        category: 'reflection',
        active: true,
        created_at: generatedAt,
      }

      return {
        question,
        source: 'ai', // counts as AI-like since it's context-based
        generatedAt,
      }
    }

    log.debug('Template fallback produced no question, trying journey fallback')
  } catch (error) {
    log.warn('Level 1.5 (Template) failed:', error)
  }

  try {
    // LEVEL 2: Journey Fallback
    const journeyQuestion = await getJourneyQuestion(userId, userContext)

    if (journeyQuestion) {
      return {
        question: journeyQuestion,
        source: 'journey',
        generatedAt,
      }
    }

    log.debug('Journey question unavailable, using pool fallback')
  } catch (error) {
    log.warn('Level 2 (Journey) failed:', error)
  }

  // LEVEL 3: Pool Fixo
  const poolQuestion = getPoolQuestion(userId)
  return {
    question: poolQuestion,
    source: 'pool',
    generatedAt,
  }
}

/**
 * Get multiple daily questions for carousel display.
 * Returns 3-5 questions from different sources, de-duplicated.
 */
export async function getDailyQuestionsForCarousel(
  userId: string,
  count: number = 5
): Promise<DailyQuestionResult[]> {
  const generatedAt = new Date().toISOString()
  const results: DailyQuestionResult[] = []
  const usedTexts = new Set<string>()

  // Fetch user context ONCE
  let userContext: UserContext
  try {
    userContext = await getUserContext(userId)
  } catch (error) {
    log.warn('Failed to fetch user context for carousel:', error)
    userContext = {
      healthStatus: { burnoutCount: 0, mentalHealthFlags: [] },
      criticalAreas: [],
      activeJourneys: [],
      recentResponses: [],
      momentHistory: [],
    }
  }

  // Try to get 1 AI question first (most valuable)
  try {
    const aiQuestion = await generateAIDrivenQuestion(userId, userContext)
    if (aiQuestion && !usedTexts.has(aiQuestion.toLowerCase())) {
      usedTexts.add(aiQuestion.toLowerCase())
      results.push({
        question: {
          id: `ai-${Date.now()}`,
          question_text: aiQuestion,
          category: 'reflection',
          active: true,
          created_at: generatedAt,
        },
        source: 'ai',
        generatedAt,
      })
    }
  } catch (error) {
    log.warn('AI question for carousel failed:', error)
  }

  // Try to get 1 template question
  try {
    const templateQuestion = generateTemplateQuestion(userContext)
    if (templateQuestion && !usedTexts.has(templateQuestion.toLowerCase())) {
      usedTexts.add(templateQuestion.toLowerCase())
      results.push({
        question: {
          id: `template-${Date.now()}-${results.length}`,
          question_text: templateQuestion,
          category: 'reflection',
          active: true,
          created_at: generatedAt,
        },
        source: 'ai',
        generatedAt,
      })
    }
  } catch (error) {
    log.warn('Template question for carousel failed:', error)
  }

  // Fill remaining with pool questions (guaranteed variety via getPoolQuestions)
  const remaining = count - results.length
  if (remaining > 0) {
    const poolQuestions = getPoolQuestions(userId, remaining)
    for (const pq of poolQuestions) {
      if (!usedTexts.has(pq.question_text.toLowerCase())) {
        usedTexts.add(pq.question_text.toLowerCase())
        results.push({
          question: pq,
          source: 'pool',
          generatedAt,
        })
      }
    }
  }

  return results.slice(0, count)
}

/**
 * Salva resposta a pergunta no banco de dados
 */
export async function saveDailyResponse(
  userId: string,
  questionId: string,
  responseText: string,
  source: 'ai' | 'journey' | 'pool'
): Promise<boolean> {
  try {
    // question_responses.question_id is FK to daily_questions(id) — only valid UUIDs work.
    // AI/template/pool questions use synthetic IDs (ai-xxx, pool-X) that aren't in the DB.
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(questionId)
    if (!isValidUUID) {
      log.info(`Skipping question_responses insert for non-DB question: ${questionId} (source=${source})`)
      return true
    }

    const { error } = await supabase.from('question_responses').insert({
      user_id: userId,
      question_id: questionId,
      response_text: responseText,
      responded_at: new Date().toISOString(),
      question_source: source,
      is_ai_generated_question: source === 'ai',
    })

    if (source === 'ai') {
      log.info(`AI question response saved: questionId=${questionId}, length=${responseText.length}`)
    }

    if (error) {
      log.error('Error saving response:', error)
      return false
    }

    return true
  } catch (error) {
    log.error('Error saving daily response:', error)
    return false
  }
}

/**
 * Registra métrica de uso (para otimização de custos)
 * NOTE: gemini_api_logs table was never created. Usage is now tracked
 * via aiUsageTrackingService (ai_usage_logs table). This function is
 * kept as a no-op for backward compatibility.
 */
export async function logDailyQuestionUsage(
  _userId: string,
  _source: 'ai' | 'journey' | 'pool',
  _responseTime: number
): Promise<void> {
  // No-op: usage tracked via trackAIUsage() in generateAIDrivenQuestion()
}
