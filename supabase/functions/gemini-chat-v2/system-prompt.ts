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

REGRA CRITICA: Quando o usuario pedir para FAZER algo (criar tarefa, registrar momento, completar tarefa), voce DEVE executar a ferramenta correspondente. NUNCA apenas descreva o que faria — EXECUTE a acao usando a ferramenta.

### Ferramentas
- **create_task**: Criar nova tarefa no Atlas com categorizacao Eisenhower. Use SEMPRE que o usuario pedir para criar, adicionar, ou registrar uma tarefa.
- **complete_task**: Marcar tarefa como concluida. Use quando o usuario disser que terminou ou concluiu algo.
- **create_moment**: Criar momento/reflexao no Journey. Use quando o usuario quiser registrar sentimento, reflexao ou experiencia.
- **get_user_context**: Buscar dados atualizados do usuario. Use quando precisar de informacoes atuais para responder.

### Regras
- SEMPRE execute a ferramenta quando o usuario pedir uma acao — nao apenas descreva
- Para criar tarefas: classifique na Matriz de Eisenhower (is_urgent + is_important)
- Para completar tarefas: confirme qual tarefa antes de executar
- Apos executar uma ferramenta, confirme ao usuario o resultado real (nao invente)
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
