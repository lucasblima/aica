/**
 * Handler para generate_daily_question action
 * Integração com Gemini para gerar perguntas dinâmicas baseadas em contexto do usuário
 *
 * Parte do módulo Journey (Minha Jornada) - GAP 3: Daily Questions AI-Driven
 */

import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"

export interface UserContext {
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
}

export interface GenerateDailyQuestionPayload {
  userContext: UserContext
  systemPrompt: string
  contextSummary: string
}

export interface GenerateDailyQuestionResult {
  question: string
  category: 'reflection' | 'gratitude' | 'energy' | 'learning' | 'change'
  relevance: 'high' | 'medium' | 'low'
  contextFactors: string[]
}

/**
 * Handler para gerar pergunta diária com IA
 *
 * Estratégia:
 * 1. Construir prompt contextual baseado no estado do usuário
 * 2. Chamar Gemini com timeout de 2.5s (max 3s no cliente)
 * 3. Validar e estruturar resposta
 * 4. Retornar pergunta com metadados de contexto
 */
export async function handleGenerateDailyQuestion(
  genAI: GoogleGenerativeAI,
  payload: GenerateDailyQuestionPayload
): Promise<GenerateDailyQuestionResult | string> {
  const { userContext, systemPrompt, contextSummary } = payload

  if (!userContext || typeof contextSummary !== 'string') {
    throw new Error('userContext e contextSummary são obrigatórios')
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
    })

    // Montar prompt com contexto
    const prompt = contextSummary

    // Timeout de 2.5s para segurança
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 2500)
    })

    const generationPromise = model.generateContent(prompt)

    const result = await Promise.race([generationPromise, timeoutPromise])

    if (!result) {
      // Timeout - retornar string vazia para fallback
      console.warn('[daily-question] Gemini timeout, using fallback')
      return ''
    }

    // Extrair texto
    const responseText = result.response
      .candidates?.[0]
      ?.content
      ?.parts?.[0]
      ?.text || ''

    if (!responseText || responseText.trim().length === 0) {
      return ''
    }

    // Validar pergunta (deve ter entre 5 e 200 caracteres)
    const questionText = responseText.trim()

    if (questionText.length < 5 || questionText.length > 200) {
      console.warn(`[daily-question] Invalid length: ${questionText.length}`)
      return questionText
    }

    // Inspecionar contexto para determinar categoria
    const category = determineCategory(userContext)
    const relevance = determineRelevance(userContext)
    const contextFactors = extractContextFactors(userContext)

    return {
      question: questionText,
      category,
      relevance,
      contextFactors,
    } as GenerateDailyQuestionResult
  } catch (error) {
    const err = error as Error
    console.error('[daily-question] Error generating question:', err.message)

    // Return empty string to trigger fallback
    if (err.message.includes('timeout') || err.message.includes('deadline')) {
      return ''
    }

    throw err
  }
}

/**
 * Determina categoria de pergunta baseado no contexto
 */
function determineCategory(
  context: UserContext
): 'reflection' | 'gratitude' | 'energy' | 'learning' | 'change' {
  const { healthStatus, criticalAreas, activeJourneys } = context

  // Se usuário tem burnout, focar em energia/reflexão
  if (healthStatus.burnoutCount >= 2 || healthStatus.mentalHealthFlags.includes('burnout')) {
    return 'energy'
  }

  // Se há áreas críticas, focar em mudança/ação
  if (criticalAreas.some(a => a.severity === 'high')) {
    return 'change'
  }

  // Se há jornadas ativas, focar em aprendizado
  if (activeJourneys.length > 0) {
    return 'learning'
  }

  // Default para reflexão
  return 'reflection'
}

/**
 * Determina relevância da pergunta
 */
function determineRelevance(context: UserContext): 'high' | 'medium' | 'low' {
  const { healthStatus, criticalAreas, activeJourneys, recentResponses } = context

  let relevanceScore = 0

  // Usuário respondendo regularmente = relevância alta
  if (recentResponses.length >= 3) relevanceScore += 3

  // Áreas críticas = relevância alta
  if (criticalAreas.length > 0) relevanceScore += 2

  // Trilhas ativas = relevância média
  if (activeJourneys.length > 0) relevanceScore += 1

  // Saúde mental OK = relevância média
  if (healthStatus.mentalHealthFlags.length === 0) relevanceScore += 1

  if (relevanceScore >= 4) return 'high'
  if (relevanceScore >= 2) return 'medium'
  return 'low'
}

/**
 * Extrai fatores de contexto que influenciaram a pergunta
 */
function extractContextFactors(context: UserContext): string[] {
  const factors: string[] = []

  if (context.healthStatus.burnoutCount >= 2) {
    factors.push('high_burnout')
  }

  if (context.criticalAreas.some(a => a.severity === 'high')) {
    factors.push('critical_areas')
  }

  if (context.activeJourneys.length > 0) {
    factors.push(`${context.activeJourneys.length}_active_journeys`)
  }

  if (context.recentResponses.length > 0) {
    factors.push('recent_engagement')
  }

  if (context.healthStatus.mentalHealthFlags.length > 0) {
    factors.push(...context.healthStatus.mentalHealthFlags)
  }

  return factors
}
