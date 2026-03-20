/**
 * system-prompt.ts — Builds the system prompt for conversation mode.
 *
 * Used only in the CONVERSATION path (not actions).
 * Combines agent personality + date context + user data.
 */

import { AGENT_SYSTEM_PROMPTS } from '../_shared/agent-prompts.ts'
import { getDateContext } from '../_shared/gemini-helpers.ts'
import { buildUserContext } from '../_shared/context-builder.ts'

export async function buildSystemPrompt(
  module: string,
  userId: string,
  supabaseAdmin: any,
): Promise<string> {
  const agentConfig = AGENT_SYSTEM_PROMPTS[module] || AGENT_SYSTEM_PROMPTS['coordinator']
  const personality = agentConfig.prompt

  const { today, dayOfWeek, timeStr } = getDateContext()
  const dateContext = `\n## Contexto Temporal\nHoje: ${today} (${dayOfWeek}), ${timeStr} BRT`

  let userContext = ''
  try {
    const { contextString } = await buildUserContext(supabaseAdmin, userId, module)
    if (contextString) {
      userContext = `\n\n## Dados do Usuario\n${contextString}`
    }
  } catch (error) {
    console.warn('[buildSystemPrompt] context failed:', (error as Error).message)
  }

  return `${personality}${dateContext}${userContext}`
}
