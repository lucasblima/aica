// handlers/chat.ts — Legacy chat handler (permanent)
// Suggested questions generator moved to _shared/context-builder.ts
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'
import { MODELS, getDateContext } from '../../_shared/gemini-helpers.ts'
import { buildUserContext, generateSuggestedActions } from '../../_shared/context-builder.ts'
import type { ChatRequest, ChatAction, UserContextResult } from '../../_shared/gemini-types.ts'


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
