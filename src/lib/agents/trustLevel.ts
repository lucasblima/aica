/**
 * Progressive Trust Level System
 *
 * Determines how much autonomy the AI agents have based on
 * the user's engagement history. New users get suggestions
 * with confirmation; power users get near-autonomous execution.
 */

export type TrustLevel = 'suggest_confirm' | 'execute_validate' | 'jarvis'

export interface UserStats {
  totalMoments: number
  totalTasks: number
  daysActive: number
  modulesUsed: number
}

const THRESHOLDS = {
  execute_validate: {
    minMoments: 50,
    minTasks: 30,
    minDaysActive: 14,
  },
  jarvis: {
    minMoments: 200,
    minTasks: 100,
    minDaysActive: 60,
    minModulesUsed: 5,
  },
} as const

/**
 * Calculate the user's trust level based on engagement stats.
 */
export function calculateTrustLevel(stats: UserStats): TrustLevel {
  const { totalMoments, totalTasks, daysActive, modulesUsed } = stats

  // Jarvis: power user, near-autonomous
  if (
    totalMoments >= THRESHOLDS.jarvis.minMoments &&
    totalTasks >= THRESHOLDS.jarvis.minTasks &&
    daysActive >= THRESHOLDS.jarvis.minDaysActive &&
    modulesUsed >= THRESHOLDS.jarvis.minModulesUsed
  ) {
    return 'jarvis'
  }

  // Execute & validate: intermediate user
  if (
    (totalMoments >= THRESHOLDS.execute_validate.minMoments ||
      totalTasks >= THRESHOLDS.execute_validate.minTasks) &&
    daysActive >= THRESHOLDS.execute_validate.minDaysActive
  ) {
    return 'execute_validate'
  }

  return 'suggest_confirm'
}

/**
 * Get Portuguese label for a trust level.
 */
export function getTrustLevelLabel(level: TrustLevel): string {
  switch (level) {
    case 'suggest_confirm':
      return 'Sugerir e Confirmar'
    case 'execute_validate':
      return 'Executar e Validar'
    case 'jarvis':
      return 'Modo Jarvis'
  }
}

const TRUST_ORDER: TrustLevel[] = ['suggest_confirm', 'execute_validate', 'jarvis']

/**
 * Get progress toward the next trust level.
 */
export function getTrustProgress(stats: UserStats): {
  current: TrustLevel
  nextLevel: TrustLevel | null
  progress: number
} {
  const current = calculateTrustLevel(stats)
  const currentIndex = TRUST_ORDER.indexOf(current)
  const nextLevel = currentIndex < TRUST_ORDER.length - 1
    ? TRUST_ORDER[currentIndex + 1]
    : null

  if (!nextLevel) {
    return { current, nextLevel: null, progress: 1 }
  }

  const thresholds = THRESHOLDS[nextLevel]
  const factors: number[] = []

  if ('minMoments' in thresholds) {
    factors.push(Math.min(stats.totalMoments / thresholds.minMoments, 1))
  }
  if ('minTasks' in thresholds) {
    factors.push(Math.min(stats.totalTasks / thresholds.minTasks, 1))
  }
  if ('minDaysActive' in thresholds) {
    factors.push(Math.min(stats.daysActive / thresholds.minDaysActive, 1))
  }
  if ('minModulesUsed' in thresholds) {
    factors.push(Math.min(stats.modulesUsed / thresholds.minModulesUsed, 1))
  }

  const progress = factors.length > 0
    ? factors.reduce((sum, f) => sum + f, 0) / factors.length
    : 0

  return { current, nextLevel, progress }
}
