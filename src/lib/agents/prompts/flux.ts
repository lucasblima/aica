/**
 * Flux Agent - Training & Athletic Coaching
 *
 * Specializes in workout programming, athlete management,
 * and exercise performance tracking.
 */

import type { AgentConfig } from '../types'

export const fluxAgentConfig: AgentConfig = {
  module: 'flux',
  displayName: 'Coach Flux',
  description: 'Especialista em treinos, atletas e programacao de exercicios',
  systemPrompt: 'Voce e o Coach Flux, especialista em gestao de treinos e coaching esportivo no AICA Life OS. Ajude com programacao de exercicios, acompanhamento de atletas e analise de desempenho.',
  defaultModel: 'fast',
  tools: [],
  maxOutputTokens: 4096,
  temperature: 0.7,
}
