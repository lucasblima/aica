/**
 * AICA AI Agent Registry
 *
 * Central registry for all module-specific AI agents.
 * Provides agent lookup, prompt retrieval, and configuration
 * for the agent system used across the application.
 *
 * @example
 * ```ts
 * import { getAgentConfig, getAgentPrompt } from '@/lib/agents'
 *
 * // Get full config for a module agent
 * const config = getAgentConfig('captacao')
 * console.log(config.tools) // ['file_search', 'grounded_search']
 *
 * // Get just the system prompt
 * const prompt = getAgentPrompt('studio')
 *
 * // Use with GeminiClient
 * const client = GeminiClient.getInstance()
 * const result = await client.call({
 *   action: 'research_guest',
 *   payload: { guestName: 'Fulano' },
 *   agent: 'studio',
 * })
 * ```
 */

import type { AgentConfig, AgentModule } from './types'
import { atlasAgentConfig } from './prompts/atlas'
import { captacaoAgentConfig } from './prompts/captacao'
import { studioAgentConfig } from './prompts/studio'
import { journeyAgentConfig } from './prompts/journey'
import { financeAgentConfig } from './prompts/finance'
import { connectionsAgentConfig } from './prompts/connections'
import { coordinatorAgentConfig } from './prompts/coordinator'

/**
 * Registry of all available agent configurations
 */
const AGENT_REGISTRY: Record<AgentModule, AgentConfig> = {
  atlas: atlasAgentConfig,
  captacao: captacaoAgentConfig,
  studio: studioAgentConfig,
  journey: journeyAgentConfig,
  finance: financeAgentConfig,
  connections: connectionsAgentConfig,
  coordinator: coordinatorAgentConfig,
}

/**
 * Get the full configuration for a module agent
 */
export function getAgentConfig(module: AgentModule): AgentConfig {
  const config = AGENT_REGISTRY[module]
  if (!config) {
    throw new Error(`Unknown agent module: ${module}`)
  }
  return config
}

/**
 * Get just the system prompt for a module agent
 */
export function getAgentPrompt(module: AgentModule): string {
  return getAgentConfig(module).systemPrompt
}

/**
 * List all available agents with their metadata
 */
export function listAgents(): Array<{
  module: AgentModule
  displayName: string
  description: string
  tools: AgentConfig['tools']
}> {
  return Object.values(AGENT_REGISTRY).map(config => ({
    module: config.module,
    displayName: config.displayName,
    description: config.description,
    tools: config.tools,
  }))
}

/**
 * Check if a module has an agent configured
 */
export function hasAgent(module: string): module is AgentModule {
  return module in AGENT_REGISTRY
}

// Re-export types
export type { AgentConfig, AgentModule, AgentTool, AgentContext, AgentMessage, AgentResponse } from './types'
