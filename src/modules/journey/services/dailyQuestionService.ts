/**
 * Daily Question Service with AI-Driven Question Generation
 *
 * Sistema em 3 níveis:
 * 1. AI-Driven (Gemini): Perguntas geradas dinamicamente baseadas no contexto do usuário
 * 2. Journey Fallback: Perguntas específicas da trilha ativa
 * 3. Pool Fixo: Pool rotativo de perguntas reflexivas genéricas
 */

import { supabase } from '@/lib/supabase'
import { GeminiClient } from '@/lib/gemini'
import type { GeminiChatResponse } from '@/lib/gemini'
import { trackAIUsage } from '@/services/aiUsageTrackingService'
import { QuestionWithResponse, DailyQuestion } from '../types/dailyQuestion'

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
  {
    id: 'pool-1',
    question_text: 'O que você quer conquistar hoje?',
    category: 'change',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-2',
    question_text: 'Como você está se sentindo neste momento?',
    category: 'reflection',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-3',
    question_text: 'Qual área da sua vida precisa de mais atenção?',
    category: 'reflection',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-4',
    question_text: 'O que te deixaria orgulhoso hoje?',
    category: 'gratitude',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-5',
    question_text: 'Como você pode se cuidar melhor agora?',
    category: 'energy',
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
    question_text: 'O que você aprendeu recentemente que mudou sua perspectiva?',
    category: 'learning',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'pool-8',
    question_text: 'Como você quer se sentir nesta semana?',
    category: 'energy',
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

    // 2. Fetch áreas críticas (áreas com problemas bloqueados)
    const { data: userAreas } = await supabase
      .from('user_areas')
      .select('id, name, status, is_critical')
      .eq('user_id', userId)

    const criticalAreas = (userAreas || [])
      .filter(a => a.is_critical)
      .map(a => ({
        areaId: a.id,
        areaName: a.name,
        severity: a.status === 'critical' ? 'high' : 'medium',
        isBlocking: true,
      }))

    // 3. Fetch trilhas ativas
    const { data: activeJourneys } = await supabase
      .from('user_journeys')
      .select('area_id, journey_type, completion_percentage')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(5)

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

    return {
      healthStatus: {
        burnoutCount,
        mentalHealthFlags,
        energyLevel: undefined, // Could be fetched from consciousness points
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
    }
  } catch (error) {
    console.error('Error fetching user context:', error)
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

  // Estruturar prompt contextual
  const systemPrompt = `Você é um assistente compassivo de bem-estar para o Aica Life OS.

Responsabilidades:
- Gerar UMA pergunta reflexiva e relevante baseada no contexto do usuário
- A pergunta deve ser útil para auto-compreensão ou ação concreta
- Deve ser curta (máximo 15 palavras)
- Nunca repetir perguntas recentes da mesma pessoa
- Adaptar tom baseado no estado emocional (mais suave se stressado, mais motivador se energizado)

Estilo:
- Compaixão e empatia
- Linguagem simples e clara
- Perguntas abertas que estimulam reflexão
- Evitar julgamentos ou pressão

Formato:
Responda APENAS com a pergunta, sem explicações adicionais.`

  const contextSummary = `
Estado do usuário:
- Saúde: ${context.healthStatus.burnoutCount} burnouts, ${context.healthStatus.mentalHealthFlags.join(', ') || 'estável'}
- Áreas críticas: ${context.criticalAreas.map(a => a.areaName).join(', ') || 'nenhuma'}
- Trilhas ativas: ${context.activeJourneys.map(j => j.journeyType).join(', ') || 'nenhuma'}
- Emoções recentes: ${context.momentHistory?.slice(0, 3).map(m => m.emotion).join(', ') || 'não rastreadas'}

Respostas recentes (evitar repetição):
${context.recentResponses.map(r => `- Pergunta: ${r.questionText}`).join('\n') || 'Sem respostas recentes'}

Gere uma pergunta reflexiva e apropriada:
  `

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Timeout de 3s para fallback rápido
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3000)
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
            ai_model: result.model || 'gemini-2.0-flash',
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
            console.warn('[Journey AI Tracking] Non-blocking error:', error.message);
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
    console.error('Error getting journey question:', error)
  }

  return null
}

/**
 * Obtém pergunta do pool fixo aleatoriamente (Level 3: Final Fallback)
 */
function getPoolQuestion(userId: string): DailyQuestion {
  const randomIndex = Math.floor(Math.random() * FALLBACK_QUESTION_POOL.length)
  return FALLBACK_QUESTION_POOL[randomIndex]
}

/**
 * Sistema em cascata para obter pergunta do dia
 * Level 1 → Level 2 → Level 3
 */
export async function getDailyQuestionWithContext(
  userId: string
): Promise<DailyQuestionResult> {
  const generatedAt = new Date().toISOString()

  try {
    // LEVEL 1: AI-Driven (Gemini)
    const userContext = await getUserContext(userId)

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

    console.log('AI-driven question failed, trying journey fallback')
  } catch (error) {
    console.warn('Level 1 (AI-Driven) failed:', error)
  }

  try {
    // LEVEL 2: Journey Fallback
    const userContext = await getUserContext(userId)
    const journeyQuestion = await getJourneyQuestion(userId, userContext)

    if (journeyQuestion) {
      return {
        question: journeyQuestion,
        source: 'journey',
        generatedAt,
      }
    }

    console.log('Journey question unavailable, using pool fallback')
  } catch (error) {
    console.warn('Level 2 (Journey) failed:', error)
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
 * Salva resposta a pergunta no banco de dados
 */
export async function saveDailyResponse(
  userId: string,
  questionId: string,
  responseText: string,
  source: 'ai' | 'journey' | 'pool'
): Promise<boolean> {
  try {
    // Para perguntas AI, não temos registro persistente, apenas logs
    if (source === 'ai') {
      // Log para análise futura
      console.log(`AI Question Response: ${responseText.substring(0, 50)}...`)
      return true
    }

    // Para perguntas de trilha ou pool, salvar normalmente
    const { error } = await supabase.from('question_responses').insert({
      user_id: userId,
      question_id: questionId,
      response_text: responseText,
      responded_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Error saving response:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving daily response:', error)
    return false
  }
}

/**
 * Registra métrica de uso (para otimização de custos)
 */
export async function logDailyQuestionUsage(
  userId: string,
  source: 'ai' | 'journey' | 'pool',
  responseTime: number
): Promise<void> {
  try {
    await supabase.from('gemini_api_logs').insert({
      user_id: userId,
      action: 'daily_question',
      model: source === 'ai' ? 'gemini-2.0-flash' : 'fallback',
      tokens_used: 0, // Será preenchido pelo backend
      response_time_ms: responseTime,
      status: 'success',
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error logging usage:', error)
  }
}
