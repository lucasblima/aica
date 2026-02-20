/**
 * Consciousness Points (CP) Types
 * Sistema de gamificação para Minha Jornada
 */

export type CPReason =
  | 'moment_registered'
  | 'question_answered'
  | 'weekly_reflection'
  | 'streak_7_days'

export type CPLevel = 1 | 2 | 3 | 4 | 5

export type CPLevelName = 'Observador' | 'Consciente' | 'Reflexivo' | 'Integrado' | 'Mestre'

export interface ConsciousnessPointsLog {
  id: string
  user_id: string
  points: number
  reason: CPReason
  reference_id?: string
  reference_type?: 'moment' | 'question' | 'summary'
  created_at: string
}

export interface UserConsciousnessStats {
  user_id: string

  // Totals
  total_points: number
  level: CPLevel
  level_name: CPLevelName

  // Streaks
  current_streak: number
  longest_streak: number
  last_activity_date?: string

  // Counts
  total_moments: number
  total_questions_answered: number
  total_summaries_reflected: number

  // Updated
  updated_at: string
}

export interface AwardCPResult {
  success: boolean
  new_total: number
  level: CPLevel
  level_name: CPLevelName
  leveled_up: boolean
}

export interface StreakResult {
  current_streak: number
  longest_streak: number
  streak_bonus_awarded: boolean
}

// Quality Assessment from Gemini evaluation
export interface QualityAssessment {
  quality_score: number       // 0-1
  relevance: number           // 0-1
  depth: number               // 0-1
  authenticity: number        // 0-1
  clarity: number             // 0-1
  feedback_message: string    // Empathetic phrase in PT
  feedback_tier: 'low' | 'medium' | 'high' | 'exceptional'
}

// Quality-based CP formula: CP = base + floor(quality_score * multiplier)
export const CP_FORMULA = {
  base: 2,
  multiplier: 18,
  min: 2,
  max: 20,
}

/** @deprecated Use CP_FORMULA + calculateCP() from qualityEvaluationService */
export const CP_REWARDS: Record<CPReason, number> = {
  moment_registered: 5,
  question_answered: 10,
  weekly_reflection: 20,
  streak_7_days: 50,
}

// CP levels
export const CP_LEVELS: { level: CPLevel; name: CPLevelName; min_points: number; max_points: number }[] = [
  { level: 1, name: 'Observador', min_points: 0, max_points: 99 },
  { level: 2, name: 'Consciente', min_points: 100, max_points: 499 },
  { level: 3, name: 'Reflexivo', min_points: 500, max_points: 1499 },
  { level: 4, name: 'Integrado', min_points: 1500, max_points: 4999 },
  { level: 5, name: 'Mestre', min_points: 5000, max_points: Infinity },
]

// Helper: Get level from points
export function getLevelFromPoints(points: number): { level: CPLevel; name: CPLevelName } {
  const levelData = CP_LEVELS.find(l => points >= l.min_points && points <= l.max_points)
  return levelData ? { level: levelData.level, name: levelData.name } : { level: 1, name: 'Observador' }
}

// Helper: Get progress to next level
export function getProgressToNextLevel(points: number): {
  current_level: CPLevel
  next_level: CPLevel | null
  points_to_next: number
  progress_percentage: number
} {
  const current = getLevelFromPoints(points)
  const currentLevelData = CP_LEVELS.find(l => l.level === current.level)!
  const nextLevelData = CP_LEVELS.find(l => l.level === current.level + 1)

  if (!nextLevelData) {
    return {
      current_level: current.level,
      next_level: null,
      points_to_next: 0,
      progress_percentage: 100,
    }
  }

  const points_in_current_level = points - currentLevelData.min_points
  const points_needed = nextLevelData.min_points - currentLevelData.min_points
  const progress_percentage = Math.min(100, (points_in_current_level / points_needed) * 100)

  return {
    current_level: current.level,
    next_level: (current.level + 1) as CPLevel,
    points_to_next: nextLevelData.min_points - points,
    progress_percentage,
  }
}

// Level colors
export const LEVEL_COLORS: Record<CPLevel, string> = {
  1: '#94a3b8', // slate-400
  2: '#3b82f6', // blue-500
  3: '#8B5CF6', // violet-500
  4: '#f59e0b', // amber-500
  5: '#eab308', // yellow-500
}

// Level descriptions
export const LEVEL_DESCRIPTIONS: Record<CPLevelName, string> = {
  Observador: 'Você está começando sua jornada de consciência.',
  Consciente: 'Você está prestando atenção nos seus padrões.',
  Reflexivo: 'Você está refletindo profundamente sobre si mesmo.',
  Integrado: 'Você está integrando insights em sua vida.',
  Mestre: 'Você alcançou maestria na autoconsciência.',
}
