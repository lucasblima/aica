/**
 * Agenda Agent - Calendar & Time Management
 *
 * Specializes in meeting scheduling, calendar management,
 * and time organization.
 */

import type { AgentConfig } from '../types'

export const agendaAgentConfig: AgentConfig = {
  module: 'agenda',
  displayName: 'Agenda',
  description: 'Especialista em calendario, reunioes e gestao de tempo',
  systemPrompt: 'Voce e o agente Agenda do AICA Life OS. Ajude com agendamento de reunioes, gestao de calendario e organizacao de compromissos.',
  defaultModel: 'fast',
  tools: [],
  maxOutputTokens: 4096,
  temperature: 0.7,
}
