/**
 * Badges Type Definitions
 * Gamification 2.0: RECIPE-based meaningful achievements
 *
 * Badges are categorized by:
 * - Category: reflection, flow, comeback, connection, mastery
 * - Hat Type: white_hat (enabled) vs black_hat (disabled by default)
 * - Rarity: common, rare, epic, legendary
 *
 * Design principles:
 * - Celebrate growth, not just achievement
 * - Reward consistency over perfection
 * - Emphasize journey over destination
 */

import type { RECIPEPillar, OctalysisDrive, HatType } from './recipe';

// ============================================================================
// BADGE CATEGORIES
// ============================================================================

/**
 * Badge categories aligned with RECIPE + Recovery
 */
export type BadgeCategory =
  | 'reflection'   // Self-awareness and mindfulness
  | 'flow'         // Deep work and productivity
  | 'comeback'     // Recovery from setbacks
  | 'connection'   // Relationship care and social
  | 'mastery';     // Skill development and expertise

/**
 * Badge category display info
 */
export const BADGE_CATEGORY_INFO: Record<BadgeCategory, {
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  reflection: {
    name: 'Reflexão',
    description: 'Autoconhecimento e presença',
    icon: '🪞',
    color: '#8B5CF6',
  },
  flow: {
    name: 'Fluxo',
    description: 'Foco profundo e produtividade',
    icon: '🌊',
    color: '#3B82F6',
  },
  comeback: {
    name: 'Retorno',
    description: 'Resiliência e recuperação',
    icon: '🔥',
    color: '#F59E0B',
  },
  connection: {
    name: 'Conexão',
    description: 'Relacionamentos e comunidade',
    icon: '💚',
    color: '#10B981',
  },
  mastery: {
    name: 'Maestria',
    description: 'Expertise e aprendizado',
    icon: '⭐',
    color: '#EC4899',
  },
};

// ============================================================================
// BADGE RARITY
// ============================================================================

/**
 * Badge rarity levels
 */
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Rarity display info
 */
export const BADGE_RARITY_INFO: Record<BadgeRarity, {
  name: string;
  color: string;
  glowColor: string;
  multiplier: number;
}> = {
  common: {
    name: 'Comum',
    color: '#6B7280',
    glowColor: 'rgba(107, 114, 128, 0.3)',
    multiplier: 1,
  },
  rare: {
    name: 'Raro',
    color: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.3)',
    multiplier: 2,
  },
  epic: {
    name: 'Épico',
    color: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    multiplier: 3,
  },
  legendary: {
    name: 'Lendário',
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    multiplier: 5,
  },
};

// ============================================================================
// BADGE DEFINITION
// ============================================================================

/**
 * Badge definition (static configuration)
 */
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  hat_type: HatType;

  // Unlock conditions
  unlock_condition: BadgeUnlockCondition;

  // Rewards
  xp_reward: number;
  cp_reward: number;

  // Octalysis mapping
  primary_drive: OctalysisDrive;

  // RECIPE pillar mapping
  recipe_pillar?: RECIPEPillar;

  // Display
  secret?: boolean; // Hidden until unlocked
  featured?: boolean; // Show prominently
}

/**
 * Badge unlock condition types
 */
export type BadgeUnlockCondition =
  | { type: 'streak_days'; days: number }
  | { type: 'streak_recovery'; count: number }
  | { type: 'grace_period_used'; count: number }
  | { type: 'tasks_completed'; count: number }
  | { type: 'tasks_priority'; priority: number; count: number }
  | { type: 'cp_earned'; amount: number }
  | { type: 'cp_category'; category: string; amount: number }
  | { type: 'journal_entries'; count: number }
  | { type: 'mood_checks'; count: number }
  | { type: 'contacts_cared'; count: number }
  | { type: 'health_score_improved'; count: number }
  | { type: 'focus_sessions'; count: number; min_minutes?: number }
  | { type: 'trend_maintained'; percentage: number; days: number }
  | { type: 'level_reached'; level: number }
  | { type: 'badges_earned'; count: number }
  | { type: 'compound'; conditions: BadgeUnlockCondition[]; operator: 'AND' | 'OR' };

// ============================================================================
// USER BADGE (Earned Instance)
// ============================================================================

/**
 * User badge (earned instance)
 */
export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  displayed: boolean;
  favorite: boolean;
  progress_at_unlock: number;
  metadata?: Record<string, any>;
}

/**
 * Badge with user progress
 */
export interface BadgeWithProgress extends BadgeDefinition {
  earned: boolean;
  earned_at?: string;
  progress: number; // 0-100
  progress_display: string;
  can_earn: boolean; // Based on hat_type settings
}

// ============================================================================
// BADGE CATALOG
// ============================================================================

/**
 * Complete badge catalog
 * Organized by category, with White Hat badges enabled by default
 */
export const BADGE_CATALOG: BadgeDefinition[] = [
  // ============================================================================
  // REFLECTION BADGES (White Hat)
  // ============================================================================
  {
    id: 'first_reflection',
    name: 'Primeiro Espelho',
    description: 'Complete seu primeiro check-in de reflexão',
    icon: '🪞',
    category: 'reflection',
    rarity: 'common',
    hat_type: 'white_hat',
    unlock_condition: { type: 'mood_checks', count: 1 },
    xp_reward: 50,
    cp_reward: 5,
    primary_drive: 'accomplishment',
    recipe_pillar: 'reflection',
  },
  {
    id: 'mindful_week',
    name: 'Semana Consciente',
    description: 'Faça check-in de humor por 7 dias consecutivos',
    icon: '🧘',
    category: 'reflection',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'mood_checks', count: 7 },
    xp_reward: 150,
    cp_reward: 15,
    primary_drive: 'accomplishment',
    recipe_pillar: 'reflection',
  },
  {
    id: 'journal_explorer',
    name: 'Explorador Interior',
    description: 'Escreva 10 entradas no diário',
    icon: '📔',
    category: 'reflection',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'journal_entries', count: 10 },
    xp_reward: 200,
    cp_reward: 20,
    primary_drive: 'empowerment',
    recipe_pillar: 'reflection',
  },
  {
    id: 'deep_thinker',
    name: 'Pensador Profundo',
    description: 'Acumule 100 CP na categoria Reflexão',
    icon: '🔮',
    category: 'reflection',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: { type: 'cp_category', category: 'reflection', amount: 100 },
    xp_reward: 300,
    cp_reward: 30,
    primary_drive: 'accomplishment',
    recipe_pillar: 'reflection',
  },
  {
    id: 'master_of_self',
    name: 'Mestre de Si',
    description: 'Complete 100 check-ins de reflexão',
    icon: '🌟',
    category: 'reflection',
    rarity: 'legendary',
    hat_type: 'white_hat',
    unlock_condition: { type: 'mood_checks', count: 100 },
    xp_reward: 500,
    cp_reward: 50,
    primary_drive: 'epic_meaning',
    recipe_pillar: 'reflection',
    featured: true,
  },

  // ============================================================================
  // FLOW BADGES (White Hat)
  // ============================================================================
  {
    id: 'first_task',
    name: 'Primeira Vitória',
    description: 'Complete sua primeira tarefa',
    icon: '✅',
    category: 'flow',
    rarity: 'common',
    hat_type: 'white_hat',
    unlock_condition: { type: 'tasks_completed', count: 1 },
    xp_reward: 25,
    cp_reward: 3,
    primary_drive: 'accomplishment',
    recipe_pillar: 'information',
  },
  {
    id: 'task_warrior',
    name: 'Guerreiro de Tarefas',
    description: 'Complete 50 tarefas',
    icon: '⚔️',
    category: 'flow',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'tasks_completed', count: 50 },
    xp_reward: 200,
    cp_reward: 20,
    primary_drive: 'accomplishment',
    recipe_pillar: 'information',
  },
  {
    id: 'focus_master',
    name: 'Mestre do Foco',
    description: 'Complete 10 sessões de foco de 25+ minutos',
    icon: '🎯',
    category: 'flow',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'focus_sessions', count: 10, min_minutes: 25 },
    xp_reward: 250,
    cp_reward: 25,
    primary_drive: 'empowerment',
    recipe_pillar: 'play',
  },
  {
    id: 'urgent_handler',
    name: 'Domador de Urgências',
    description: 'Complete 20 tarefas urgentes (Q1)',
    icon: '🔥',
    category: 'flow',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: { type: 'tasks_priority', priority: 1, count: 20 },
    xp_reward: 300,
    cp_reward: 30,
    primary_drive: 'accomplishment',
    recipe_pillar: 'choice',
  },
  {
    id: 'productivity_legend',
    name: 'Lenda da Produtividade',
    description: 'Complete 500 tarefas',
    icon: '🏆',
    category: 'flow',
    rarity: 'legendary',
    hat_type: 'white_hat',
    unlock_condition: { type: 'tasks_completed', count: 500 },
    xp_reward: 500,
    cp_reward: 50,
    primary_drive: 'epic_meaning',
    recipe_pillar: 'information',
    featured: true,
  },

  // ============================================================================
  // COMEBACK BADGES (White Hat - Compassionate Recovery)
  // ============================================================================
  {
    id: 'grace_accepted',
    name: 'Graça Aceita',
    description: 'Use seu primeiro período de graça',
    icon: '🕊️',
    category: 'comeback',
    rarity: 'common',
    hat_type: 'white_hat',
    unlock_condition: { type: 'grace_period_used', count: 1 },
    xp_reward: 50,
    cp_reward: 10,
    primary_drive: 'empowerment',
    recipe_pillar: 'choice',
  },
  {
    id: 'phoenix_rising',
    name: 'Fênix Renascida',
    description: 'Recupere sua tendência após usar período de graça',
    icon: '🔥',
    category: 'comeback',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'streak_recovery', count: 1 },
    xp_reward: 150,
    cp_reward: 20,
    primary_drive: 'accomplishment',
    recipe_pillar: 'choice',
  },
  {
    id: 'resilient_spirit',
    name: 'Espírito Resiliente',
    description: 'Recupere sua tendência 3 vezes',
    icon: '💪',
    category: 'comeback',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: { type: 'streak_recovery', count: 3 },
    xp_reward: 300,
    cp_reward: 35,
    primary_drive: 'empowerment',
    recipe_pillar: 'choice',
  },
  {
    id: 'master_of_balance',
    name: 'Mestre do Equilíbrio',
    description: 'Mantenha tendência de 80%+ por 30 dias',
    icon: '⚖️',
    category: 'comeback',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: { type: 'trend_maintained', percentage: 80, days: 30 },
    xp_reward: 350,
    cp_reward: 40,
    primary_drive: 'accomplishment',
    recipe_pillar: 'information',
  },
  {
    id: 'unbreakable',
    name: 'Inabalável',
    description: 'Mantenha tendência de 90%+ por 50 dias',
    icon: '💎',
    category: 'comeback',
    rarity: 'legendary',
    hat_type: 'white_hat',
    unlock_condition: { type: 'trend_maintained', percentage: 90, days: 50 },
    xp_reward: 500,
    cp_reward: 60,
    primary_drive: 'epic_meaning',
    recipe_pillar: 'information',
    featured: true,
  },

  // ============================================================================
  // CONNECTION BADGES (White Hat)
  // ============================================================================
  {
    id: 'first_care',
    name: 'Primeiro Cuidado',
    description: 'Cuide de um contato em risco',
    icon: '💚',
    category: 'connection',
    rarity: 'common',
    hat_type: 'white_hat',
    unlock_condition: { type: 'contacts_cared', count: 1 },
    xp_reward: 50,
    cp_reward: 8,
    primary_drive: 'social_influence',
    recipe_pillar: 'engagement',
  },
  {
    id: 'caring_heart',
    name: 'Coração Cuidador',
    description: 'Cuide de 10 contatos em risco',
    icon: '❤️',
    category: 'connection',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'contacts_cared', count: 10 },
    xp_reward: 200,
    cp_reward: 25,
    primary_drive: 'social_influence',
    recipe_pillar: 'engagement',
  },
  {
    id: 'relationship_healer',
    name: 'Curador de Relações',
    description: 'Melhore o Health Score de 5 contatos',
    icon: '🌿',
    category: 'connection',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: { type: 'health_score_improved', count: 5 },
    xp_reward: 300,
    cp_reward: 35,
    primary_drive: 'social_influence',
    recipe_pillar: 'engagement',
  },
  {
    id: 'connection_master',
    name: 'Mestre das Conexões',
    description: 'Acumule 200 CP na categoria Conexão',
    icon: '🌐',
    category: 'connection',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: { type: 'cp_category', category: 'connection', amount: 200 },
    xp_reward: 350,
    cp_reward: 40,
    primary_drive: 'social_influence',
    recipe_pillar: 'engagement',
  },
  {
    id: 'heart_of_gold',
    name: 'Coração de Ouro',
    description: 'Cuide de 50 contatos em risco',
    icon: '💛',
    category: 'connection',
    rarity: 'legendary',
    hat_type: 'white_hat',
    unlock_condition: { type: 'contacts_cared', count: 50 },
    xp_reward: 500,
    cp_reward: 60,
    primary_drive: 'epic_meaning',
    recipe_pillar: 'engagement',
    featured: true,
  },

  // ============================================================================
  // MASTERY BADGES (White Hat)
  // ============================================================================
  {
    id: 'first_level',
    name: 'Nível 1',
    description: 'Alcance o nível 1',
    icon: '🌱',
    category: 'mastery',
    rarity: 'common',
    hat_type: 'white_hat',
    unlock_condition: { type: 'level_reached', level: 1 },
    xp_reward: 25,
    cp_reward: 5,
    primary_drive: 'accomplishment',
    recipe_pillar: 'information',
  },
  {
    id: 'level_5',
    name: 'Nível 5',
    description: 'Alcance o nível 5',
    icon: '🌿',
    category: 'mastery',
    rarity: 'rare',
    hat_type: 'white_hat',
    unlock_condition: { type: 'level_reached', level: 5 },
    xp_reward: 100,
    cp_reward: 15,
    primary_drive: 'accomplishment',
    recipe_pillar: 'information',
  },
  {
    id: 'level_10',
    name: 'Nível 10',
    description: 'Alcance o nível 10',
    icon: '🌳',
    category: 'mastery',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: { type: 'level_reached', level: 10 },
    xp_reward: 250,
    cp_reward: 30,
    primary_drive: 'accomplishment',
    recipe_pillar: 'information',
  },
  {
    id: 'badge_collector',
    name: 'Colecionador',
    description: 'Conquiste 10 badges',
    icon: '🎖️',
    category: 'mastery',
    rarity: 'epic',
    hat_type: 'white_hat',
    unlock_condition: { type: 'badges_earned', count: 10 },
    xp_reward: 300,
    cp_reward: 35,
    primary_drive: 'ownership',
    recipe_pillar: 'information',
  },
  {
    id: 'cp_champion',
    name: 'Campeão de Consciência',
    description: 'Acumule 1000 CP no total',
    icon: '✨',
    category: 'mastery',
    rarity: 'legendary',
    hat_type: 'white_hat',
    unlock_condition: { type: 'cp_earned', amount: 1000 },
    xp_reward: 500,
    cp_reward: 100,
    primary_drive: 'epic_meaning',
    recipe_pillar: 'information',
    featured: true,
  },

  // ============================================================================
  // BLACK HAT BADGES (Disabled by default)
  // These create urgency - use sparingly and only when user opts in
  // ============================================================================
  {
    id: 'streak_survivor',
    name: 'Sobrevivente',
    description: 'Mantenha streak de 7 dias sob pressão',
    icon: '⚡',
    category: 'flow',
    rarity: 'rare',
    hat_type: 'black_hat',
    unlock_condition: { type: 'streak_days', days: 7 },
    xp_reward: 200,
    cp_reward: 0, // No CP for Black Hat
    primary_drive: 'avoidance',
  },
  {
    id: 'last_minute_hero',
    name: 'Herói de Última Hora',
    description: 'Complete tarefa urgente no limite',
    icon: '⏰',
    category: 'flow',
    rarity: 'rare',
    hat_type: 'black_hat',
    unlock_condition: { type: 'tasks_priority', priority: 1, count: 1 },
    xp_reward: 150,
    cp_reward: 0,
    primary_drive: 'scarcity',
    secret: true,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get badge by ID
 */
export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_CATALOG.find(b => b.id === id);
}

/**
 * Get badges by category
 */
export function getBadgesByCategory(category: BadgeCategory): BadgeDefinition[] {
  return BADGE_CATALOG.filter(b => b.category === category);
}

/**
 * Get badges by hat type
 */
export function getBadgesByHatType(hatType: HatType): BadgeDefinition[] {
  return BADGE_CATALOG.filter(b => b.hat_type === hatType);
}

/**
 * Get white hat badges only (enabled by default)
 */
export function getWhiteHatBadges(): BadgeDefinition[] {
  return getBadgesByHatType('white_hat');
}

/**
 * Get black hat badges (disabled by default)
 */
export function getBlackHatBadges(): BadgeDefinition[] {
  return getBadgesByHatType('black_hat');
}

/**
 * Get featured badges
 */
export function getFeaturedBadges(): BadgeDefinition[] {
  return BADGE_CATALOG.filter(b => b.featured);
}

/**
 * Get badges by rarity
 */
export function getBadgesByRarity(rarity: BadgeRarity): BadgeDefinition[] {
  return BADGE_CATALOG.filter(b => b.rarity === rarity);
}

/**
 * Check if badge can be earned based on settings
 */
export function canEarnBadge(
  badge: BadgeDefinition,
  blackHatEnabled: boolean
): boolean {
  if (badge.hat_type === 'white_hat') return true;
  return blackHatEnabled;
}

/**
 * Get badge category info
 */
export function getBadgeCategoryInfo(category: BadgeCategory) {
  return BADGE_CATEGORY_INFO[category];
}

/**
 * Get badge rarity info
 */
export function getBadgeRarityInfo(rarity: BadgeRarity) {
  return BADGE_RARITY_INFO[rarity];
}

/**
 * Calculate total badges available
 */
export function getTotalBadgesCount(blackHatEnabled: boolean = false): number {
  return BADGE_CATALOG.filter(b => canEarnBadge(b, blackHatEnabled)).length;
}

export default {
  BADGE_CATALOG,
  BADGE_CATEGORY_INFO,
  BADGE_RARITY_INFO,
  getBadgeById,
  getBadgesByCategory,
  getBadgesByHatType,
  getWhiteHatBadges,
  getBlackHatBadges,
  getFeaturedBadges,
  getBadgesByRarity,
  canEarnBadge,
  getBadgeCategoryInfo,
  getBadgeRarityInfo,
  getTotalBadgesCount,
};
