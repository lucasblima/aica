/**
 * Unified Efficiency Score Types
 * Gamification 2.0: Holistic productivity measurement
 *
 * The Unified Efficiency Score combines 5 components:
 * 1. Task Completion Rate (25%) - Quantity of tasks completed
 * 2. Focus Quality (25%) - Quality of attention during work
 * 3. Consistency Score (20%) - Daily activity regularity
 * 4. Priority Alignment (20%) - Completing high-priority tasks
 * 5. Time Efficiency (10%) - Completing tasks on time
 *
 * Formula emphasizes QUALITY over raw QUANTITY to encourage
 * sustainable productivity without burnout.
 */

// ============================================================================
// EFFICIENCY COMPONENTS
// ============================================================================

/**
 * The 5 components of the Unified Efficiency Score
 */
export type EfficiencyComponent =
  | 'completion_rate'    // Task quantity
  | 'focus_quality'      // Attention quality
  | 'consistency'        // Daily regularity
  | 'priority_alignment' // Priority focus
  | 'time_efficiency';   // On-time completion

/**
 * Component weights (must sum to 100)
 * Emphasizes quality (focus + priority) over quantity
 */
export const EFFICIENCY_WEIGHTS: Record<EfficiencyComponent, number> = {
  completion_rate: 25,     // Moderate weight - quantity matters but not most
  focus_quality: 25,       // High weight - quality of attention is key
  consistency: 20,         // Important for sustainable habits
  priority_alignment: 20,  // Doing the RIGHT things
  time_efficiency: 10,     // Least weight - avoid pressure
};

/**
 * Component display information
 */
export const EFFICIENCY_COMPONENT_INFO: Record<EfficiencyComponent, {
  name: string;
  description: string;
  icon: string;
  color: string;
  tip: string;
}> = {
  completion_rate: {
    name: 'Taxa de Conclusão',
    description: 'Percentual de tarefas planejadas que foram concluídas',
    icon: '✅',
    color: '#10B981',
    tip: 'Complete mais tarefas para aumentar esta métrica',
  },
  focus_quality: {
    name: 'Qualidade de Foco',
    description: 'Baseado em sessões de foco e tempo dedicado',
    icon: '🎯',
    color: '#3B82F6',
    tip: 'Use sessões de foco mais longas para melhorar',
  },
  consistency: {
    name: 'Consistência',
    description: 'Regularidade de atividade ao longo dos dias',
    icon: '📊',
    color: '#8B5CF6',
    tip: 'Mantenha atividade diária para melhorar',
  },
  priority_alignment: {
    name: 'Alinhamento de Prioridade',
    description: 'Foco em tarefas de alta prioridade (Q1 e Q2)',
    icon: '⚡',
    color: '#F59E0B',
    tip: 'Complete mais tarefas importantes e urgentes',
  },
  time_efficiency: {
    name: 'Eficiência Temporal',
    description: 'Conclusão de tarefas dentro do prazo',
    icon: '⏱️',
    color: '#EC4899',
    tip: 'Complete tarefas antes do prazo para melhorar',
  },
};

// ============================================================================
// EFFICIENCY LEVELS
// ============================================================================

/**
 * Efficiency score levels
 */
export type EfficiencyLevel =
  | 'excellent'   // 90-100
  | 'good'        // 70-89
  | 'moderate'    // 50-69
  | 'needs_work'  // 30-49
  | 'low';        // 0-29

/**
 * Level display information
 */
export const EFFICIENCY_LEVEL_INFO: Record<EfficiencyLevel, {
  name: string;
  description: string;
  color: string;
  emoji: string;
  minScore: number;
  maxScore: number;
}> = {
  excellent: {
    name: 'Excelente',
    description: 'Você está no auge da produtividade sustentável!',
    color: '#10B981',
    emoji: '🌟',
    minScore: 90,
    maxScore: 100,
  },
  good: {
    name: 'Bom',
    description: 'Ótimo equilíbrio entre quantidade e qualidade.',
    color: '#3B82F6',
    emoji: '✨',
    minScore: 70,
    maxScore: 89,
  },
  moderate: {
    name: 'Moderado',
    description: 'Espaço para melhorias em algumas áreas.',
    color: '#F59E0B',
    emoji: '💪',
    minScore: 50,
    maxScore: 69,
  },
  needs_work: {
    name: 'Precisa Atenção',
    description: 'Foque em uma área por vez para melhorar.',
    color: '#F97316',
    emoji: '🔧',
    minScore: 30,
    maxScore: 49,
  },
  low: {
    name: 'Início da Jornada',
    description: 'Cada pequeno passo conta. Você consegue!',
    color: '#6B7280',
    emoji: '🌱',
    minScore: 0,
    maxScore: 29,
  },
};

// ============================================================================
// EFFICIENCY DATA STRUCTURES
// ============================================================================

/**
 * Individual component score
 */
export interface ComponentScore {
  component: EfficiencyComponent;
  score: number; // 0-100
  weight: number;
  weightedScore: number; // score * (weight/100)
  trend: 'improving' | 'stable' | 'declining';
  delta: number; // Change from previous period
}

/**
 * Complete efficiency score data
 */
export interface UnifiedEfficiencyScore {
  user_id: string;

  // Overall score
  total_score: number; // 0-100, weighted average
  level: EfficiencyLevel;

  // Component breakdown
  components: Record<EfficiencyComponent, ComponentScore>;

  // Trends
  overall_trend: 'improving' | 'stable' | 'declining';
  score_delta: number; // Change from previous period

  // Insights
  strongest_component: EfficiencyComponent;
  weakest_component: EfficiencyComponent;
  suggested_focus: EfficiencyComponent;

  // Time context
  period: 'daily' | 'weekly' | 'monthly';
  calculated_at: string;
  previous_score: number | null;
}

/**
 * Efficiency history entry
 */
export interface EfficiencyHistoryEntry {
  id: string;
  user_id: string;
  date: string;
  total_score: number;
  components: Record<EfficiencyComponent, number>;
  period: 'daily' | 'weekly' | 'monthly';
  created_at: string;
}

/**
 * Efficiency stats summary
 */
export interface EfficiencyStats {
  // Averages
  average_score: number;
  average_by_component: Record<EfficiencyComponent, number>;

  // Highs
  highest_score: number;
  highest_score_date: string | null;
  best_component: EfficiencyComponent;

  // Trends
  score_trend_7d: number;
  score_trend_30d: number;
  days_above_70: number;
  days_above_90: number;

  // Streaks
  current_good_streak: number; // Days with score >= 70
  best_good_streak: number;
}

// ============================================================================
// CALCULATION INPUTS
// ============================================================================

/**
 * Data needed to calculate efficiency score
 */
export interface EfficiencyCalculationInput {
  // Task data
  tasks_planned: number;
  tasks_completed: number;
  tasks_completed_q1: number; // Urgent & Important
  tasks_completed_q2: number; // Not Urgent & Important
  tasks_completed_on_time: number;
  tasks_overdue: number;

  // Focus data
  focus_sessions_count: number;
  focus_total_minutes: number;
  focus_avg_session_minutes: number;

  // Activity data
  active_days_in_period: number;
  total_days_in_period: number;

  // Previous period for comparison
  previous_score?: number;
  previous_components?: Record<EfficiencyComponent, number>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get efficiency level from score
 */
export function getEfficiencyLevel(score: number): EfficiencyLevel {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'needs_work';
  return 'low';
}

/**
 * Get level info from score
 */
export function getEfficiencyLevelInfo(score: number) {
  const level = getEfficiencyLevel(score);
  return EFFICIENCY_LEVEL_INFO[level];
}

/**
 * Get component info
 */
export function getComponentInfo(component: EfficiencyComponent) {
  return EFFICIENCY_COMPONENT_INFO[component];
}

/**
 * Format efficiency score for display
 */
export function formatEfficiencyScore(score: number): string {
  return `${Math.round(score)}%`;
}

/**
 * Calculate trend from delta
 */
export function calculateTrend(
  delta: number,
  threshold: number = 5
): 'improving' | 'stable' | 'declining' {
  if (delta >= threshold) return 'improving';
  if (delta <= -threshold) return 'declining';
  return 'stable';
}

/**
 * Get trend display info
 */
export function getTrendDisplay(
  trend: 'improving' | 'stable' | 'declining'
): { icon: string; color: string; text: string } {
  switch (trend) {
    case 'improving':
      return { icon: '↑', color: '#10B981', text: 'Melhorando' };
    case 'stable':
      return { icon: '→', color: '#6B7280', text: 'Estável' };
    case 'declining':
      return { icon: '↓', color: '#F97316', text: 'Em queda' };
  }
}

/**
 * Calculate weighted score from components
 */
export function calculateWeightedScore(
  components: Record<EfficiencyComponent, number>
): number {
  let totalWeightedScore = 0;

  for (const [comp, score] of Object.entries(components) as [EfficiencyComponent, number][]) {
    const weight = EFFICIENCY_WEIGHTS[comp];
    totalWeightedScore += score * (weight / 100);
  }

  return Math.round(totalWeightedScore);
}

/**
 * Find strongest component
 */
export function findStrongestComponent(
  components: Record<EfficiencyComponent, number>
): EfficiencyComponent {
  let strongest: EfficiencyComponent = 'completion_rate';
  let highestScore = 0;

  for (const [comp, score] of Object.entries(components) as [EfficiencyComponent, number][]) {
    if (score > highestScore) {
      highestScore = score;
      strongest = comp;
    }
  }

  return strongest;
}

/**
 * Find weakest component
 */
export function findWeakestComponent(
  components: Record<EfficiencyComponent, number>
): EfficiencyComponent {
  let weakest: EfficiencyComponent = 'completion_rate';
  let lowestScore = 100;

  for (const [comp, score] of Object.entries(components) as [EfficiencyComponent, number][]) {
    if (score < lowestScore) {
      lowestScore = score;
      weakest = comp;
    }
  }

  return weakest;
}

/**
 * Suggest focus area based on weakest component with high impact
 */
export function suggestFocusArea(
  components: Record<EfficiencyComponent, number>
): EfficiencyComponent {
  // Find components below threshold with highest weight
  const threshold = 70;
  let bestFocus: EfficiencyComponent = 'completion_rate';
  let bestImpact = 0;

  for (const [comp, score] of Object.entries(components) as [EfficiencyComponent, number][]) {
    if (score < threshold) {
      const weight = EFFICIENCY_WEIGHTS[comp];
      const potentialImprovement = (threshold - score) * (weight / 100);

      if (potentialImprovement > bestImpact) {
        bestImpact = potentialImprovement;
        bestFocus = comp;
      }
    }
  }

  // If all components are above threshold, return the weakest
  if (bestImpact === 0) {
    return findWeakestComponent(components);
  }

  return bestFocus;
}

/**
 * Default efficiency score structure
 */
export const DEFAULT_EFFICIENCY_SCORE: Omit<UnifiedEfficiencyScore, 'user_id'> = {
  total_score: 0,
  level: 'low',
  components: {
    completion_rate: {
      component: 'completion_rate',
      score: 0,
      weight: EFFICIENCY_WEIGHTS.completion_rate,
      weightedScore: 0,
      trend: 'stable',
      delta: 0,
    },
    focus_quality: {
      component: 'focus_quality',
      score: 0,
      weight: EFFICIENCY_WEIGHTS.focus_quality,
      weightedScore: 0,
      trend: 'stable',
      delta: 0,
    },
    consistency: {
      component: 'consistency',
      score: 0,
      weight: EFFICIENCY_WEIGHTS.consistency,
      weightedScore: 0,
      trend: 'stable',
      delta: 0,
    },
    priority_alignment: {
      component: 'priority_alignment',
      score: 0,
      weight: EFFICIENCY_WEIGHTS.priority_alignment,
      weightedScore: 0,
      trend: 'stable',
      delta: 0,
    },
    time_efficiency: {
      component: 'time_efficiency',
      score: 0,
      weight: EFFICIENCY_WEIGHTS.time_efficiency,
      weightedScore: 0,
      trend: 'stable',
      delta: 0,
    },
  },
  overall_trend: 'stable',
  score_delta: 0,
  strongest_component: 'completion_rate',
  weakest_component: 'completion_rate',
  suggested_focus: 'completion_rate',
  period: 'daily',
  calculated_at: new Date().toISOString(),
  previous_score: null,
};

export default {
  EFFICIENCY_WEIGHTS,
  EFFICIENCY_COMPONENT_INFO,
  EFFICIENCY_LEVEL_INFO,
  getEfficiencyLevel,
  getEfficiencyLevelInfo,
  getComponentInfo,
  formatEfficiencyScore,
  calculateTrend,
  getTrendDisplay,
  calculateWeightedScore,
  findStrongestComponent,
  findWeakestComponent,
  suggestFocusArea,
  DEFAULT_EFFICIENCY_SCORE,
};
