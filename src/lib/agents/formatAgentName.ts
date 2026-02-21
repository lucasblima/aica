/**
 * Agent display name formatter.
 * Maps module IDs to user-friendly Portuguese labels.
 */

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  coordinator: 'Aica',
  atlas: 'Atlas',
  captacao: 'Captacao',
  studio: 'Studio',
  journey: 'Jornada',
  finance: 'Financas',
  connections: 'Conexoes',
  flux: 'Flux',
  agenda: 'Agenda',
}

export function formatAgentName(name: string): string {
  return AGENT_DISPLAY_NAMES[name] || name
}
