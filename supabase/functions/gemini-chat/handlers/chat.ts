// handlers/chat.ts — Legacy chat + suggested questions (permanent)
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'
import { MODELS } from '../../_shared/gemini-helpers.ts'
import { getDateContext } from '../../_shared/gemini-helpers.ts'
import { buildUserContext, generateSuggestedActions } from '../../_shared/context-builder.ts'
import type { ChatRequest, ChatAction, UserContextResult } from '../../_shared/gemini-types.ts'

// ============================================================================
// SUGGESTED QUESTIONS GENERATOR (pure function, no async)
// ============================================================================

export function generateSuggestedQuestions(
  _userMessage: string,
  _aiResponse: string,
  module: string,
  rawData: UserContextResult['rawData']
): string[] {
  const questions: string[] = []

  // Context-aware suggestions based on module and data
  if (module === 'atlas' && rawData.tasks.length > 0) {
    const { today } = getDateContext()
    const overdue = rawData.tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done')
    if (overdue.length > 0) questions.push(`Tenho ${overdue.length} tarefa(s) atrasada(s). Pode me ajudar a priorizar?`)
  }
  if (module === 'journey') {
    questions.push('Como estou me sentindo em relação à semana passada?')
  }
  if (module === 'finance' && rawData.transactions.length > 0) {
    questions.push('Qual foi meu maior gasto este mês?')
  }
  if (module === 'coordinator') {
    if (rawData.tasks.length > 0) questions.push('Quais são minhas prioridades para hoje?')
    if (rawData.moments.length > 0) questions.push('Quais padrões você nota nas minhas reflexões recentes?')
    if (rawData.events.length > 0) questions.push('O que tenho na agenda para amanhã?')
  }

  // Always limit to 3 suggestions
  return questions.slice(0, 3)
}

export async function handleLegacyChat(
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
  console.log(`[handleLegacyChat] hasSupabaseAdmin=${!!supabaseAdmin}, module=${module} (raw=${rawModule})`)
  if (userId && supabaseAdmin && module) {
    try {
      const contextResult = await buildUserContext(supabaseAdmin, userId, module)
      userContext = contextResult.contextString
      rawData = contextResult.rawData
      console.log(`[handleLegacyChat] userContext present=true length=${userContext.length}`)
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
  const { today, dayOfWeek, tomorrow, timeStr } = getDateContext()

  finalSystemPrompt += `\n\n## Data e Hora Atual\n- Hoje: ${today} (${dayOfWeek})\n- Amanha: ${tomorrow}\n- Horario: ${timeStr} (BRT)`

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
