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

REGRA ABSOLUTA: Quando o usuario pedir para FAZER algo, voce DEVE chamar a ferramenta correspondente.
NUNCA gere texto descrevendo o que faria. SEMPRE execute a ferramenta.
Se voce responder "Tarefa criada:" sem chamar create_task, voce FALHOU.
Se voce responder "Evento agendado:" sem chamar create_event, voce FALHOU.

### Ferramentas de ACAO (executam mudancas)
- **create_task**: Criar nova tarefa no Atlas. USE quando o usuario pedir para criar/adicionar/registrar tarefa.
- **complete_task**: Marcar tarefa como concluida. USE quando o usuario disser que terminou algo.
- **create_moment**: Registrar momento/reflexao no Journey. USE quando o usuario quiser registrar sentimento ou experiencia.
- **create_event**: Criar evento/compromisso na Agenda. USE quando o usuario pedir para agendar/marcar/criar reuniao ou evento.

### Ferramentas de CONSULTA (buscam dados)
- **get_user_context**: Buscar dados atualizados de QUALQUER modulo. Modulos: atlas (tarefas), journey (momentos), finance (transacoes), connections (contatos), studio (podcasts), flux (treinos), agenda (eventos/calendario), captacao (editais).
  USE quando precisar de informacoes atuais para responder (ex: "como esta minha agenda?", "quais minhas tarefas?").

### Regras de Uso
1. SEMPRE execute a ferramenta — NUNCA apenas descreva a acao
2. Para CONSULTAS ("como esta...", "quais sao...") → chame get_user_context primeiro
3. Para ACOES ("crie...", "agende...", "registre...") → chame a ferramenta de acao correspondente
4. Apos executar uma ferramenta, confirme o resultado REAL retornado (nao invente)
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
