// handlers/agent-chat.ts — Agent-based chat handler (permanent)
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'
import { MODELS, getDateContext } from '../../_shared/gemini-helpers.ts'
import { buildUserContext } from '../../_shared/context-builder.ts'
import { AGENT_SYSTEM_PROMPTS, VALID_AGENTS } from '../../_shared/agent-prompts.ts'
import type { ChatWithAgentPayload } from '../../_shared/gemini-types.ts'

export async function handleChatWithAgent(
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

  const { today, dayOfWeek, tomorrow, timeStr } = getDateContext()

  finalSystemPrompt += `\n\n## Data e Hora Atual\n- Hoje: ${today} (${dayOfWeek})\n- Amanha: ${tomorrow}\n- Horario: ${timeStr} (BRT)`

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
