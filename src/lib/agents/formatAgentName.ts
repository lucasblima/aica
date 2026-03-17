/**
 * formatAgentName - Maps ADK agent IDs to display names
 */

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  // ADK-style names (from aica-agents backend)
  aica_coordinator: 'Aica',
  atlas_agent: 'Atlas',
  captacao_agent: 'Captacao',
  studio_agent: 'Studio',
  journey_agent: 'Jornada',
  finance_agent: 'Finanças',
  connections_agent: 'Conexoes',
  flux_agent: 'Flux',
  agenda_agent: 'Agenda',
  // Legacy names (pre-ADK)
  coordinator: 'Aica',
  atlas: 'Atlas',
  captacao: 'Captacao',
  studio: 'Studio',
  journey: 'Jornada',
  finance: 'Finanças',
  connections: 'Conexoes',
  flux: 'Flux',
  agenda: 'Agenda',
}

export function formatAgentName(name: string): string {
  if (!name) return ''
  return AGENT_DISPLAY_NAMES[name] || name.replace(/_agent$/, '')
}
