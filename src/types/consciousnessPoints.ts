/**
 * Consciousness Points (CP) Types
 * Issue #XXX: Gamification 2.0 - Meaningful Reward System
 *
 * CP is a separate currency from XP that rewards:
 * - Quality of presence, not just quantity
 * - Relationship care (integrates with Health Score)
 * - Reflection and self-awareness
 * - Intentional action over mechanical completion
 *
 * Key differences from XP:
 * - XP = Activity metrics (tasks completed, streaks)
 * - CP = Consciousness metrics (quality, care, reflection)
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Categories of consciousness point earning
 */
export type CPCategory =
  | 'presence'       // Being present and mindful
  | 'reflection'     // Self-reflection activities
  | 'connection'     // Relationship care and nurturing
  | 'intention'      // Intentional, quality actions
  | 'growth';        // Personal growth milestones

/**
 * Individual CP transaction record
 */
export interface CPTransaction {
  id: string;
  user_id: string;
  amount: number;
  category: CPCategory;
  source: string; // What triggered this CP award
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * User's CP balance and history summary
 */
export interface CPBalance {
  user_id: string;
  total_cp: number;
  current_cp: number; // Available to spend
  lifetime_cp: number; // Total ever earned

  // Breakdown by category
  cp_by_category: Record<CPCategory, number>;

  // Recent trend
  cp_earned_today: number;
  cp_earned_this_week: number;
  cp_earned_this_month: number;

  // Timestamps
  last_earned_at: string | null;
  updated_at: string;
}

/**
 * CP reward definition
 */
export interface CPReward {
  id: string;
  name: string;
  description: string;
  category: CPCategory;
  amount: number;
  conditions?: string;
  cooldown_hours?: number; // Prevent farming
  max_daily?: number; // Daily cap for this reward type
}

// ============================================================================
// CP REWARD CATALOG
// ============================================================================

/**
 * Default CP rewards - emphasizes quality over quantity
 */
export const CP_REWARDS: Record<string, CPReward> = {
  // -------------------------------------------------------------------------
  // PRESENCE CATEGORY
  // -------------------------------------------------------------------------
  'daily_check_in': {
    id: 'daily_check_in',
    name: 'Check-in Consciente',
    description: 'Iniciou o dia com intenção',
    category: 'presence',
    amount: 5,
    cooldown_hours: 20,
    max_daily: 1,
  },
  'mindful_break': {
    id: 'mindful_break',
    name: 'Pausa Consciente',
    description: 'Fez uma pausa intencional durante o dia',
    category: 'presence',
    amount: 3,
    max_daily: 3,
  },
  'end_of_day_review': {
    id: 'end_of_day_review',
    name: 'Revisão do Dia',
    description: 'Revisou seu dia com intenção',
    category: 'presence',
    amount: 8,
    cooldown_hours: 20,
    max_daily: 1,
  },

  // -------------------------------------------------------------------------
  // REFLECTION CATEGORY
  // -------------------------------------------------------------------------
  'journal_entry': {
    id: 'journal_entry',
    name: 'Entrada no Diário',
    description: 'Registrou reflexoes pessoais',
    category: 'reflection',
    amount: 10,
    max_daily: 2,
  },
  'moment_captured': {
    id: 'moment_captured',
    name: 'Momento Capturado',
    description: 'Registrou um momento significativo na jornada',
    category: 'reflection',
    amount: 5,
    max_daily: 5,
  },
  'weekly_reflection': {
    id: 'weekly_reflection',
    name: 'Reflexão Semanal',
    description: 'Completou uma reflexão semanal',
    category: 'reflection',
    amount: 20,
    cooldown_hours: 144, // 6 days
    max_daily: 1,
  },
  'lesson_learned': {
    id: 'lesson_learned',
    name: 'Licao Aprendida',
    description: 'Documentou uma licao de vida',
    category: 'reflection',
    amount: 15,
    max_daily: 2,
  },

  // -------------------------------------------------------------------------
  // CONNECTION CATEGORY (Health Score Integration)
  // -------------------------------------------------------------------------
  'relationship_care': {
    id: 'relationship_care',
    name: 'Cuidado Relacional',
    description: 'Cuidou de um relacionamento em risco',
    category: 'connection',
    amount: 8, // +8 CP per at-risk contact cared for
    max_daily: 10,
  },
  'meaningful_conversation': {
    id: 'meaningful_conversation',
    name: 'Conversa Significativa',
    description: 'Teve uma conversa profunda e significativa',
    category: 'connection',
    amount: 12,
    max_daily: 3,
  },
  'reconnection': {
    id: 'reconnection',
    name: 'Reconexão',
    description: 'Reconectou com alguem importante',
    category: 'connection',
    amount: 15,
    max_daily: 2,
  },
  'gratitude_expressed': {
    id: 'gratitude_expressed',
    name: 'Gratidão Expressa',
    description: 'Expressou gratidão a alguem',
    category: 'connection',
    amount: 6,
    max_daily: 5,
  },

  // -------------------------------------------------------------------------
  // INTENTION CATEGORY
  // -------------------------------------------------------------------------
  'priority_task_completed': {
    id: 'priority_task_completed',
    name: 'Tarefa Prioritaria',
    description: 'Completou uma tarefa de alta prioridade',
    category: 'intention',
    amount: 8,
    max_daily: 5,
  },
  'deep_work_session': {
    id: 'deep_work_session',
    name: 'Sessão de Trabalho Profundo',
    description: 'Completou uma sessão de trabalho focado (25min+)',
    category: 'intention',
    amount: 10,
    max_daily: 4,
  },
  'intentional_rest': {
    id: 'intentional_rest',
    name: 'Descanso Intencional',
    description: 'Fez uma pausa planejada e restauradora',
    category: 'intention',
    amount: 5,
    max_daily: 2,
  },

  // -------------------------------------------------------------------------
  // GROWTH CATEGORY
  // -------------------------------------------------------------------------
  'consistency_milestone': {
    id: 'consistency_milestone',
    name: 'Marco de Consistencia',
    description: 'Alcancou um marco de consistencia (7, 14, 30 dias)',
    category: 'growth',
    amount: 25,
    cooldown_hours: 144, // Minimum 6 days between milestones
  },
  'skill_improvement': {
    id: 'skill_improvement',
    name: 'Melhoria de Habilidade',
    description: 'Demonstrou melhoria mensuravel em uma habilidade',
    category: 'growth',
    amount: 20,
    max_daily: 2,
  },
  'challenge_overcome': {
    id: 'challenge_overcome',
    name: 'Desafio Superado',
    description: 'Superou um desafio pessoal',
    category: 'growth',
    amount: 30,
    max_daily: 1,
  },
  'comeback': {
    id: 'comeback',
    name: 'Retorno Vitorioso',
    description: 'Voltou apos uma pausa com sucesso',
    category: 'growth',
    amount: 20,
    cooldown_hours: 168, // Weekly
  },
};

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * CP system configuration
 */
export interface CPConfig {
  /** Maximum CP that can be earned per day */
  dailyCap: number;
  /** Multiplier for streak bonuses (applies to CP earned) */
  streakMultiplierBase: number;
  /** Max streak multiplier */
  maxStreakMultiplier: number;
  /** Enable weekly bonus for consistent CP earning */
  weeklyBonusEnabled: boolean;
  /** CP amount for weekly consistency bonus */
  weeklyBonusAmount: number;
  /** Minimum days active in week for bonus */
  weeklyBonusMinDays: number;
}

export const DEFAULT_CP_CONFIG: CPConfig = {
  dailyCap: 100, // Prevents farming, encourages quality
  streakMultiplierBase: 1.0,
  maxStreakMultiplier: 1.5, // Max 50% bonus from streaks
  weeklyBonusEnabled: true,
  weeklyBonusAmount: 25,
  weeklyBonusMinDays: 5,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get CP reward by ID
 */
export function getCPReward(rewardId: string): CPReward | undefined {
  return CP_REWARDS[rewardId];
}

/**
 * Get all rewards for a category
 */
export function getCPRewardsByCategory(category: CPCategory): CPReward[] {
  return Object.values(CP_REWARDS).filter(r => r.category === category);
}

/**
 * Calculate streak multiplier for CP
 */
export function calculateStreakMultiplier(
  trendPercentage: number,
  config: CPConfig = DEFAULT_CP_CONFIG
): number {
  // Linear interpolation based on trend percentage
  // 0% = 1.0x, 100% = maxStreakMultiplier
  const multiplier = config.streakMultiplierBase +
    (config.maxStreakMultiplier - config.streakMultiplierBase) * (trendPercentage / 100);

  return Math.min(multiplier, config.maxStreakMultiplier);
}

/**
 * Apply daily cap to CP amount
 */
export function applyDailyCap(
  currentDailyTotal: number,
  newAmount: number,
  config: CPConfig = DEFAULT_CP_CONFIG
): number {
  const remaining = Math.max(0, config.dailyCap - currentDailyTotal);
  return Math.min(newAmount, remaining);
}

/**
 * Format CP for display
 */
export function formatCP(cp: number): string {
  if (cp >= 1000) {
    return `${(cp / 1000).toFixed(1)}K CP`;
  }
  return `${cp} CP`;
}

/**
 * Get category display name
 */
export function getCPCategoryDisplayName(category: CPCategory): string {
  const names: Record<CPCategory, string> = {
    presence: 'Presenca',
    reflection: 'Reflexão',
    connection: 'Conexão',
    intention: 'Intenção',
    growth: 'Crescimento',
  };
  return names[category];
}

/**
 * Get category color
 */
export function getCPCategoryColor(category: CPCategory): string {
  const colors: Record<CPCategory, string> = {
    presence: '#8B5CF6',    // violet
    reflection: '#EC4899',  // pink
    connection: '#10B981',  // emerald
    intention: '#F59E0B',   // amber
    growth: '#3B82F6',      // blue
  };
  return colors[category];
}

/**
 * Get category icon
 */
export function getCPCategoryIcon(category: CPCategory): string {
  const icons: Record<CPCategory, string> = {
    presence: '🧘',
    reflection: '📔',
    connection: '💚',
    intention: '🎯',
    growth: '🌱',
  };
  return icons[category];
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_CP_BALANCE: CPBalance = {
  user_id: '',
  total_cp: 0,
  current_cp: 0,
  lifetime_cp: 0,
  cp_by_category: {
    presence: 0,
    reflection: 0,
    connection: 0,
    intention: 0,
    growth: 0,
  },
  cp_earned_today: 0,
  cp_earned_this_week: 0,
  cp_earned_this_month: 0,
  last_earned_at: null,
  updated_at: new Date().toISOString(),
};
