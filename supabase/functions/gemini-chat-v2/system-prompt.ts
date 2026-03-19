/**
 * system-prompt.ts — Builds the full system prompt for gemini-chat-v2.
 *
 * Combines:
 * - Agent personality from _shared/agent-prompts.ts
 * - Date/time context from _shared/gemini-helpers.ts
 * - Tool usage instructions
 * - User context from _shared/context-builder.ts
 */

import { AGENT_SYSTEM_PROMPTS } from '../_shared/agent-prompts.ts'
import { getDateContext } from '../_shared/gemini-helpers.ts'
import { buildUserContext } from '../_shared/context-builder.ts'

// ============================================================================
// TOOL INSTRUCTIONS — tells the model when/how to use available tools
// ============================================================================

const TOOL_INSTRUCTIONS = `
## Ferramentas Disponiveis

Voce tem acesso a ferramentas para executar acoes no sistema. Use-as quando o usuario pedir explicitamente:

- **complete_task**: Marcar uma tarefa como concluida. Use quando o usuario disser que terminou, completou, ou concluiu uma tarefa.
- **create_moment**: Criar um momento/reflexao no Journey. Use quando o usuario quiser registrar um momento, sentimento, ou reflexao.
- **get_user_context**: Buscar dados atualizados do usuario (tarefas, momentos, financas, etc). Use quando precisar de informacoes atuais para responder melhor.

### Regras de Uso de Ferramentas
- Confirme com o usuario ANTES de executar acoes destrutivas ou irreversiveis
- Ao completar uma tarefa, confirme qual tarefa o usuario quer completar
- Ao criar um momento, capture o conteudo e emocao do usuario
- Use get_user_context para buscar dados frescos quando necessario
`

/**
 * Build the complete system prompt for a chat interaction.
 *
 * @param module - The classified module (e.g., 'coordinator', 'atlas', 'journey')
 * @param userId - The authenticated user's ID
 * @param supabaseAdmin - Supabase admin client for fetching user context
 * @returns The full system prompt string
 */
export async function buildSystemPrompt(
  module: string,
  userId: string,
  supabaseAdmin: any,
): Promise<string> {
  // 1. Get agent personality
  const agentConfig = AGENT_SYSTEM_PROMPTS[module] || AGENT_SYSTEM_PROMPTS['coordinator']
  const personality = agentConfig.prompt

  // 2. Get date context
  const { today, dayOfWeek, timeStr } = getDateContext()
  const dateContext = `\n## Contexto Temporal\nHoje: ${today} (${dayOfWeek}), ${timeStr} BRT`

  // 3. Get user context from database
  let userContext = ''
  try {
    const { contextString } = await buildUserContext(supabaseAdmin, userId, module)
    if (contextString) {
      userContext = `\n\n## Dados Reais do Usuario\n${contextString}`
    }
  } catch (error) {
    console.warn('[buildSystemPrompt] Failed to fetch user context:', (error as Error).message)
    userContext = '\n\n## Dados Reais do Usuario\n(Nao foi possivel carregar dados do usuario)'
  }

  // 4. Combine all parts
  return `${personality}${dateContext}${TOOL_INSTRUCTIONS}${userContext}`
}
