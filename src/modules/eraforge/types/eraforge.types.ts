/**
 * EraForge Module — Core Types
 *
 * Type definitions for the EraForge historical simulation game module.
 * Children explore historical eras through AI-guided turn-based narratives.
 * Based on EPIC #311 / Tables Spec EF-001 (#312)
 */

// ============================================
// ENUMS & LITERAL TYPES
// ============================================

/**
 * Historical eras available for world progression.
 * Maps to eraforge_worlds.current_era column.
 */
export type Era =
  | 'stone_age'
  | 'ancient_egypt'
  | 'classical_greece'
  | 'roman_empire'
  | 'medieval'
  | 'renaissance'
  | 'industrial_revolution'
  | 'modern'
  | 'future';

/**
 * AI advisors that can assist children during gameplay.
 * Each advisor specializes in a different aspect of the era.
 */
export type AdvisorId =
  | 'historian'
  | 'scientist'
  | 'artist'
  | 'explorer'
  | 'philosopher'
  | 'engineer'
  | 'diplomat';

// ============================================
// DATABASE ROW TYPES
// ============================================

/**
 * Child profile managed by a parent.
 * Maps to eraforge_child_profiles table.
 */
export interface ChildProfile {
  id: string;
  parent_id: string;
  display_name: string;
  avatar_emoji: string | null;
  avatar_color: string | null;
  birth_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChildProfileCreateInput {
  display_name: string;
  avatar_emoji?: string;
  avatar_color?: string;
  birth_year?: number;
}

export interface ChildProfileUpdateInput {
  display_name?: string;
  avatar_emoji?: string;
  avatar_color?: string;
  birth_year?: number;
}

/**
 * Game world with era progression.
 * Maps to eraforge_worlds table.
 */
export interface World {
  id: string;
  parent_id: string;
  name: string;
  current_era: Era;
  era_progress: number;
  created_at: string;
  updated_at: string;
}

export interface WorldCreateInput {
  name: string;
  current_era?: Era;
}

export interface WorldUpdateInput {
  name?: string;
  current_era?: Era;
  era_progress?: number;
}

/**
 * Links a child to a world with per-child stats.
 * Maps to eraforge_world_members table (composite PK: world_id + child_id).
 */
export interface WorldMember {
  world_id: string;
  child_id: string;
  knowledge: number;
  cooperation: number;
  courage: number;
  turns_today: number;
  last_turn_date: string | null;
}

export interface WorldMemberCreateInput {
  world_id: string;
  child_id: string;
}

export interface WorldMemberUpdateInput {
  knowledge?: number;
  cooperation?: number;
  courage?: number;
  turns_today?: number;
  last_turn_date?: string;
}

/**
 * Turn-by-turn game log entry.
 * Maps to eraforge_turns table.
 */
export interface Turn {
  id: string;
  world_id: string;
  child_id: string;
  scenario: TurnScenario;
  advisor_chosen: AdvisorId | null;
  decision: string | null;
  consequences: TurnConsequences;
  created_at: string;
}

export interface TurnCreateInput {
  world_id: string;
  child_id: string;
  scenario: TurnScenario;
  advisor_chosen?: AdvisorId;
  decision?: string;
  consequences?: TurnConsequences;
}

/**
 * Scenario presented to the child during a turn (stored as JSONB).
 */
export interface TurnScenario {
  title?: string;
  description?: string;
  location?: string;
  choices?: TurnChoice[];
  historical_context?: string;
  advisor_hints?: Record<AdvisorId, string>;
}

/**
 * A choice presented to the child.
 */
export interface TurnChoice {
  id: string;
  text: string;
  consequence_hint?: string;
}

/**
 * Consequences of a turn decision (stored as JSONB).
 */
export interface TurnConsequences {
  narrative?: string;
  knowledge_delta?: number;
  cooperation_delta?: number;
  courage_delta?: number;
  era_progress_delta?: number;
  historical_fact?: string;
  unlocked_content?: string[];
}

/**
 * Time-range simulation with events.
 * Maps to eraforge_simulations table.
 */
export interface Simulation {
  id: string;
  world_id: string;
  start_date: string | null;
  end_date: string | null;
  events: SimulationEvent[];
  summary: string | null;
  stats_delta: StatsDelta;
  created_at: string;
}

export interface SimulationCreateInput {
  world_id: string;
  start_date?: string;
  end_date?: string;
  events?: SimulationEvent[];
  summary?: string;
  stats_delta?: StatsDelta;
}

export interface SimulationUpdateInput {
  events?: SimulationEvent[];
  summary?: string;
  stats_delta?: StatsDelta;
}

/**
 * A single event within a simulation.
 */
export interface SimulationEvent {
  title: string;
  description: string;
  era: Era;
  impact: 'positive' | 'neutral' | 'negative';
}

/**
 * Stat changes from a simulation.
 */
export interface StatsDelta {
  knowledge?: number;
  cooperation?: number;
  courage?: number;
  era_progress?: number;
}

/**
 * Per-parent controls and PIN.
 * Maps to eraforge_parental_settings table (UNIQUE on parent_id).
 */
export interface ParentalSettings {
  id: string;
  parent_id: string;
  max_turns_per_day: number;
  pin_hash: string | null;
  voice_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParentalSettingsCreateInput {
  max_turns_per_day?: number;
  voice_enabled?: boolean;
}

export interface ParentalSettingsUpdateInput {
  max_turns_per_day?: number;
  voice_enabled?: boolean;
}

// ============================================
// GAME STATE (Client-Side)
// ============================================

/**
 * Full game state assembled on the client from DB data.
 */
export interface GameState {
  world: World;
  member: WorldMember;
  child: ChildProfile;
  turns: Turn[];
  settings: ParentalSettings | null;
  isTimeLimitReached: boolean;
  sessionStartedAt: string;
}

/**
 * AI advisor configuration for display and behavior.
 */
export interface Advisor {
  id: AdvisorId;
  name: string;
  title: string;
  description: string;
  avatar_url: string;
  specialty: string;
  greeting: string;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Display labels for eras in Portuguese.
 */
export const ERA_LABELS: Record<Era, string> = {
  stone_age: 'Idade da Pedra',
  ancient_egypt: 'Egito Antigo',
  classical_greece: 'Grécia Clássica',
  roman_empire: 'Império Romano',
  medieval: 'Idade Média',
  renaissance: 'Renascimento',
  industrial_revolution: 'Revolução Industrial',
  modern: 'Era Moderna',
  future: 'Futuro',
};

/**
 * Display configuration for eras.
 */
export const ERA_CONFIG: Record<Era, { label: string; icon: string; color: string; period: string }> = {
  stone_age:              { label: 'Idade da Pedra',        icon: 'bone',      color: 'amber',   period: '~3M a.C. - 3500 a.C.' },
  ancient_egypt:          { label: 'Egito Antigo',          icon: 'pyramid',   color: 'yellow',  period: '3100 a.C. - 30 a.C.' },
  classical_greece:       { label: 'Grécia Clássica',       icon: 'columns',   color: 'blue',    period: '800 a.C. - 146 a.C.' },
  roman_empire:           { label: 'Império Romano',        icon: 'shield',    color: 'red',     period: '27 a.C. - 476 d.C.' },
  medieval:               { label: 'Idade Média',           icon: 'castle',    color: 'stone',   period: '476 - 1453' },
  renaissance:            { label: 'Renascimento',          icon: 'palette',   color: 'purple',  period: '1300 - 1600' },
  industrial_revolution:  { label: 'Revolução Industrial',  icon: 'cog',       color: 'gray',    period: '1760 - 1840' },
  modern:                 { label: 'Era Moderna',           icon: 'globe',     color: 'green',   period: '1900 - presente' },
  future:                 { label: 'Futuro',                icon: 'rocket',    color: 'cyan',    period: '2100+' },
};

/**
 * Advisor configurations for display.
 */
export const ADVISOR_CONFIG: Record<AdvisorId, { name: string; title: string; specialty: string }> = {
  historian:   { name: 'Prof. Chronos',     title: 'Historiador',   specialty: 'Fatos históricos e contexto' },
  scientist:   { name: 'Dra. Eureka',       title: 'Cientista',     specialty: 'Descobertas científicas da era' },
  artist:      { name: 'Mestre Artisan',     title: 'Artista',       specialty: 'Arte, cultura e arquitetura' },
  explorer:    { name: 'Capitão Vento',      title: 'Explorador',    specialty: 'Geografia e navegação' },
  philosopher: { name: 'Sábio Logos',        title: 'Filósofo',      specialty: 'Ética e questões filosóficas' },
  engineer:    { name: 'Eng. Mechanica',     title: 'Engenheiro',    specialty: 'Tecnologia e engenharia' },
  diplomat:    { name: 'Embaixador Pax',     title: 'Diplomata',     specialty: 'Política e dinâmicas sociais' },
};
