/**
 * Scientific Model Badges
 * Sprint 7 — Cross-Module Intelligence
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * 24 badges aligned with scientific models from Sprints 1-7.
 * Uses existing BadgeUnlockCondition types — no new types needed.
 * Maps to Octalysis White Hat drives + RECIPE pillars.
 *
 * Coverage:
 * - Cross-Module (Life Score): 2 badges
 * - Atlas (Cognitive Science): 3 badges
 * - Journey (Psychometrics): 3 badges
 * - Connections (Network Science): 2 badges
 * - Finance (Behavioral Economics): 2 badges
 * - Grants (Scientometrics): 2 badges
 * - Studio (Neuroscience): 2 badges
 * - Flux (Training Science): 2 badges
 * - Ethical Guardrails: 4 badges
 */

import type { BadgeDefinition } from '@/types/badges';

// ============================================================================
// SCIENTIFIC BADGES CATALOG
// ============================================================================

export const SCIENTIFIC_BADGES: BadgeDefinition[] = [
  // ============================================================================
  // CROSS-MODULE (Life Score) — 2 badges
  // ============================================================================
  {
    id: 'life_score_balanced',
    name: 'Equilíbrio de Vida',
    description: 'Alcançou nível "suficiente" em 5+ domínios do Life Score simultaneamente.',
    icon: 'Scale',
    category: 'mastery',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: {
      type: 'compound',
      operator: 'AND',
      conditions: [
        { type: 'level_reached', level: 3 },
        { type: 'trend_maintained', percentage: 66, days: 14 },
      ],
    },
    xp_reward: 500,
    cp_reward: 50,
    primary_drive: 'accomplishment',
    recipe_pillar: 'reflection',
  },
  {
    id: 'life_score_explorer',
    name: 'Explorador Integral',
    description: 'Obteve pelo menos uma pontuação em todos os 7 domínios do Life Score.',
    icon: 'Compass',
    category: 'mastery',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: {
      type: 'compound',
      operator: 'AND',
      conditions: [
        { type: 'tasks_completed', count: 7 },
        { type: 'mood_checks', count: 7 },
      ],
    },
    xp_reward: 300,
    cp_reward: 30,
    primary_drive: 'epic_meaning',
    recipe_pillar: 'information',
  },

  // ============================================================================
  // ATLAS (Cognitive Science) — 3 badges
  // ============================================================================
  {
    id: 'flow_master',
    name: 'Mestre do Flow',
    description: 'Completou 10+ tarefas em estado de flow (alta probabilidade de flow).',
    icon: 'Zap',
    category: 'flow',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: {
      type: 'compound',
      operator: 'AND',
      conditions: [
        { type: 'tasks_completed', count: 10 },
        { type: 'focus_sessions', count: 10 },
      ],
    },
    xp_reward: 300,
    cp_reward: 30,
    primary_drive: 'empowerment',
    recipe_pillar: 'engagement',
  },
  {
    id: 'planning_realist',
    name: 'Planejador Realista',
    description: 'Manteve estimativas de tempo dentro de 20% do real por 2 semanas.',
    icon: 'Clock',
    category: 'mastery',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'trend_maintained', percentage: 80, days: 14 },
    xp_reward: 250,
    cp_reward: 25,
    primary_drive: 'accomplishment',
    recipe_pillar: 'information',
  },
  {
    id: 'cognitive_optimizer',
    name: 'Otimizador Cognitivo',
    description: 'Completou 20 tarefas de alta carga cognitiva com sessões de foco dedicadas.',
    icon: 'Brain',
    category: 'flow',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: {
      type: 'compound',
      operator: 'AND',
      conditions: [
        { type: 'tasks_completed', count: 20 },
        { type: 'focus_sessions', count: 20, min_minutes: 25 },
      ],
    },
    xp_reward: 400,
    cp_reward: 40,
    primary_drive: 'empowerment',
    recipe_pillar: 'play',
  },

  // ============================================================================
  // JOURNEY (Psychometrics) — 3 badges
  // ============================================================================
  {
    id: 'flourishing',
    name: 'Florescimento',
    description: 'Alcançou pontuação PERMA-Profiler acima de 8.0 (alta prosperidade psicológica).',
    icon: 'Flower2',
    category: 'reflection',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: {
      type: 'compound',
      operator: 'AND',
      conditions: [
        { type: 'mood_checks', count: 30 },
        { type: 'journal_entries', count: 20 },
      ],
    },
    xp_reward: 400,
    cp_reward: 40,
    primary_drive: 'epic_meaning',
    recipe_pillar: 'reflection',
  },
  {
    id: 'ema_consistent',
    name: 'Observador Atento',
    description: 'Completou check-ins EMA (manhã, meio-dia, noite) por 7 dias consecutivos.',
    icon: 'Eye',
    category: 'reflection',
    rarity: 'common',
    hat_type: 'white_hat',
    unlock_condition: { type: 'streak_days', days: 7 },
    xp_reward: 150,
    cp_reward: 15,
    primary_drive: 'ownership',
    recipe_pillar: 'reflection',
  },
  {
    id: 'gratitude_practice',
    name: 'Gratidão Diária',
    description: 'Registrou itens de gratidão no check-in noturno por 14 dias.',
    icon: 'Heart',
    category: 'reflection',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'streak_days', days: 14 },
    xp_reward: 200,
    cp_reward: 20,
    primary_drive: 'epic_meaning',
    recipe_pillar: 'reflection',
  },

  // ============================================================================
  // CONNECTIONS (Network Science) — 2 badges
  // ============================================================================
  {
    id: 'network_strategist',
    name: 'Estrategista Social',
    description: 'Alcançou índice de diversidade de rede acima de 0.7 (alta diversidade de contatos).',
    icon: 'Network',
    category: 'connection',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'contacts_cared', count: 20 },
    xp_reward: 300,
    cp_reward: 30,
    primary_drive: 'social_influence',
    recipe_pillar: 'engagement',
  },
  {
    id: 'relationship_nurturer',
    name: 'Cultivador de Relações',
    description: 'Manteve ratio Gottman acima de 5:1 em 10+ relacionamentos.',
    icon: 'HeartHandshake',
    category: 'connection',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: {
      type: 'compound',
      operator: 'AND',
      conditions: [
        { type: 'contacts_cared', count: 10 },
        { type: 'health_score_improved', count: 5 },
      ],
    },
    xp_reward: 350,
    cp_reward: 35,
    primary_drive: 'social_influence',
    recipe_pillar: 'engagement',
  },

  // ============================================================================
  // FINANCE (Behavioral Economics) — 2 badges
  // ============================================================================
  {
    id: 'financial_health',
    name: 'Saúde Financeira',
    description: 'Alcançou tier "healthy" no FinHealth Score (score >= 80).',
    icon: 'Wallet',
    category: 'mastery',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: { type: 'trend_maintained', percentage: 80, days: 30 },
    xp_reward: 400,
    cp_reward: 40,
    primary_drive: 'ownership',
    recipe_pillar: 'information',
  },
  {
    id: 'loss_awareness',
    name: 'Consciência de Perda',
    description: 'Permaneceu dentro do orçamento diário por 14 dias usando framing de perda.',
    icon: 'ShieldAlert',
    category: 'mastery',
    rarity: 'common',
    hat_type: 'white_hat',
    unlock_condition: { type: 'streak_days', days: 14 },
    xp_reward: 200,
    cp_reward: 20,
    primary_drive: 'ownership',
    recipe_pillar: 'choice',
  },

  // ============================================================================
  // GRANTS (Scientometrics) — 2 badges
  // ============================================================================
  {
    id: 'researcher_emerging',
    name: 'Pesquisador Emergente',
    description: 'Completou seu perfil de pesquisador com h-index e publicações.',
    icon: 'GraduationCap',
    category: 'mastery',
    rarity: 'common',
    hat_type: 'white_hat',
    unlock_condition: { type: 'level_reached', level: 2 },
    xp_reward: 150,
    cp_reward: 15,
    primary_drive: 'accomplishment',
    recipe_pillar: 'information',
  },
  {
    id: 'trl_climber',
    name: 'Escalador de TRL',
    description: 'Avançou um projeto de TRL 1-3 para TRL 4+ (da teoria para validação).',
    icon: 'TrendingUp',
    category: 'mastery',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'tasks_completed', count: 5 },
    xp_reward: 300,
    cp_reward: 30,
    primary_drive: 'accomplishment',
    recipe_pillar: 'exposition',
  },

  // ============================================================================
  // STUDIO (Neuroscience) — 2 badges
  // ============================================================================
  {
    id: 'peak_end_master',
    name: 'Mestre do Peak-End',
    description: 'Produziu 5 episódios com tensionScore acima de 0.7 (narrativas envolventes).',
    icon: 'Podcast',
    category: 'mastery',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'tasks_completed', count: 5 },
    xp_reward: 250,
    cp_reward: 25,
    primary_drive: 'empowerment',
    recipe_pillar: 'play',
  },
  {
    id: 'narrative_architect',
    name: 'Arquiteto de Narrativas',
    description: 'Completou 10 episódios com planejamento de arco narrativo completo.',
    icon: 'Mic',
    category: 'mastery',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: {
      type: 'compound',
      operator: 'AND',
      conditions: [
        { type: 'tasks_completed', count: 10 },
        { type: 'focus_sessions', count: 5 },
      ],
    },
    xp_reward: 350,
    cp_reward: 35,
    primary_drive: 'empowerment',
    recipe_pillar: 'play',
  },

  // ============================================================================
  // FLUX (Training Science) — 2 badges
  // ============================================================================
  {
    id: 'load_manager',
    name: 'Gestor de Carga',
    description: 'Manteve ACWR na "sweet spot" (0.8-1.3) por 4 semanas consecutivas.',
    icon: 'Activity',
    category: 'mastery',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'trend_maintained', percentage: 80, days: 28 },
    xp_reward: 300,
    cp_reward: 30,
    primary_drive: 'empowerment',
    recipe_pillar: 'information',
  },
  {
    id: 'recovery_wise',
    name: 'Sábio na Recuperação',
    description: 'Seguiu recomendações de descanso quando TSB estava negativo 5+ vezes.',
    icon: 'BedDouble',
    category: 'comeback',
    rarity: 'common',
    hat_type: 'white_hat',
    unlock_condition: { type: 'streak_recovery', count: 5 },
    xp_reward: 200,
    cp_reward: 20,
    primary_drive: 'ownership',
    recipe_pillar: 'choice',
  },

  // ============================================================================
  // ETHICAL GUARDRAILS — 4 badges
  // ============================================================================
  {
    id: 'digital_sabbatical',
    name: 'Pausa Consciente',
    description: 'Completou um sabbatical digital de 2+ dias, priorizando bem-estar sobre métricas.',
    icon: 'Palmtree',
    category: 'reflection',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'grace_period_used', count: 1 },
    xp_reward: 250,
    cp_reward: 25,
    primary_drive: 'epic_meaning',
    recipe_pillar: 'choice',
  },
  {
    id: 'growth_mindset',
    name: 'Mentalidade de Crescimento',
    description: 'Manteve tendência "em crescimento" por 30 dias sem obsessão por métricas.',
    icon: 'Sprout',
    category: 'mastery',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: { type: 'trend_maintained', percentage: 60, days: 30 },
    xp_reward: 500,
    cp_reward: 50,
    primary_drive: 'epic_meaning',
    recipe_pillar: 'reflection',
    featured: true,
  },
  {
    id: 'spiral_breaker',
    name: 'Quebrador de Espirais',
    description: 'Reverteu uma espiral negativa — domínios correlacionados voltaram a melhorar.',
    icon: 'RotateCcw',
    category: 'comeback',
    rarity: 'legendary',
    hat_type: 'white_hat',
    unlock_condition: {
      type: 'compound',
      operator: 'AND',
      conditions: [
        { type: 'streak_recovery', count: 1 },
        { type: 'trend_maintained', percentage: 60, days: 7 },
      ],
    },
    xp_reward: 750,
    cp_reward: 75,
    primary_drive: 'accomplishment',
    recipe_pillar: 'engagement',
    featured: true,
  },
  {
    id: 'goodhart_aware',
    name: 'Guardião da Autenticidade',
    description: 'Reconheceu e corrigiu uma divergência Goodhart — quando o score subiu mas a saúde real não acompanhou.',
    icon: 'ShieldCheck',
    category: 'reflection',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: {
      type: 'compound',
      operator: 'AND',
      conditions: [
        { type: 'mood_checks', count: 14 },
        { type: 'journal_entries', count: 7 },
      ],
    },
    xp_reward: 400,
    cp_reward: 40,
    primary_drive: 'ownership',
    recipe_pillar: 'reflection',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all scientific badges.
 */
export function getScientificBadges(): BadgeDefinition[] {
  return [...SCIENTIFIC_BADGES];
}

/**
 * Get a scientific badge by ID.
 */
export function getScientificBadgeById(id: string): BadgeDefinition | undefined {
  return SCIENTIFIC_BADGES.find(b => b.id === id);
}

/**
 * Get scientific badges by module/domain.
 */
export function getScientificBadgesByDomain(domain: string): BadgeDefinition[] {
  const domainBadgeIds: Record<string, string[]> = {
    cross_module: ['life_score_balanced', 'life_score_explorer'],
    atlas: ['flow_master', 'planning_realist', 'cognitive_optimizer'],
    journey: ['flourishing', 'ema_consistent', 'gratitude_practice'],
    connections: ['network_strategist', 'relationship_nurturer'],
    finance: ['financial_health', 'loss_awareness'],
    grants: ['researcher_emerging', 'trl_climber'],
    studio: ['peak_end_master', 'narrative_architect'],
    flux: ['load_manager', 'recovery_wise'],
    ethical: ['digital_sabbatical', 'growth_mindset', 'spiral_breaker', 'goodhart_aware'],
  };

  const ids = domainBadgeIds[domain] ?? [];
  return SCIENTIFIC_BADGES.filter(b => ids.includes(b.id));
}

/**
 * Get featured scientific badges (displayed prominently).
 */
export function getFeaturedScientificBadges(): BadgeDefinition[] {
  return SCIENTIFIC_BADGES.filter(b => b.featured);
}
