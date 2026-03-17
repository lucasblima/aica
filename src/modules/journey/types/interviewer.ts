/**
 * Interviewer System Types
 * Structured interview questions for user profiling across AICA modules
 */

// Question type enum - 7 types
export type InterviewQuestionType = 'free_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'scale' | 'date' | 'ranked_list'

// Category enum - 6 categories
export type InterviewCategory = 'biografia' | 'anamnese' | 'censo' | 'preferências' | 'conexoes' | 'objetivos'

// Session status
export type InterviewSessionStatus = 'not_started' | 'in_progress' | 'completed' | 'paused'

// Config types per question type
export interface SingleChoiceConfig { options: { value: string; label: string }[] }
export interface MultiChoiceConfig { options: { value: string; label: string }[]; max_selections?: number }
export interface ScaleConfig { min: number; max: number; min_label: string; max_label: string; step?: number }
export interface RankedListConfig { items: { value: string; label: string }[] }
export interface DateConfig { min_date?: string; max_date?: string }

// Answer types per question type
export interface FreeTextAnswer { text: string }
export interface LongTextAnswer { text: string; audio_url?: string }
export interface SingleChoiceAnswer { selected: string }
export interface MultiChoiceAnswer { selected: string[] }
export interface ScaleAnswer { value: number }
export interface DateAnswer { date: string }
export interface RankedListAnswer { ranked: string[] }

// Union types
export type InterviewQuestionConfig = SingleChoiceConfig | MultiChoiceConfig | ScaleConfig | RankedListConfig | DateConfig | Record<string, never>
export type InterviewAnswer = FreeTextAnswer | LongTextAnswer | SingleChoiceAnswer | MultiChoiceAnswer | ScaleAnswer | DateAnswer | RankedListAnswer

// DB-mapped interfaces
export interface InterviewQuestion {
  id: string
  question_text: string
  question_type: InterviewQuestionType
  category: InterviewCategory
  config: InterviewQuestionConfig
  target_modules: string[]
  memory_mapping: { category: string; key: string; module: string | null }
  depends_on: string | null
  depends_on_value: Record<string, unknown> | null
  difficulty_level: number
  is_curated: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface InterviewSession {
  id: string
  user_id: string
  category: InterviewCategory
  title: string
  icon: string | null
  description: string | null
  question_ids: string[]
  total_questions: number
  answered_count: number
  completion_percentage: number
  status: InterviewSessionStatus
  cp_earned: number
  created_at: string
  updated_at: string
}

export interface InterviewResponse {
  id: string
  user_id: string
  session_id: string | null
  question_id: string
  answer: InterviewAnswer
  answer_text: string | null
  routed_to_memory: boolean
  routed_modules: string[]
  quality_score: number | null
  cp_earned: number
  created_at: string
  updated_at: string
}

export interface InterviewStats {
  total_questions: number
  total_answered: number
  categories_started: number
  categories_completed: number
  total_cp_earned: number
  completion_percentage: number
}

// Category metadata - ALL IN PORTUGUESE
export const INTERVIEW_CATEGORY_META: Record<InterviewCategory, {
  label: string
  icon: string
  color: string
  description: string
}> = {
  biografia: {
    label: 'Biografia',
    icon: '📖',
    color: '#8B5CF6', // purple
    description: 'Sua história, formação e marcos de vida',
  },
  anamnese: {
    label: 'Saúde & Bem-estar',
    icon: '💚',
    color: '#10B981', // green
    description: 'Energia, sono, exercício e autocuidado',
  },
  censo: {
    label: 'Perfil Socioeconômico',
    icon: '🏠',
    color: '#3B82F6', // blue
    description: 'Moradia, renda e contexto de vida',
  },
  'preferências': {
    label: 'Preferências',
    icon: '⚙️',
    color: '#F59E0B', // amber
    description: 'Como você aprende, trabalha e se organiza',
  },
  conexoes: {
    label: 'Conexões',
    icon: '🤝',
    color: '#EC4899', // pink
    description: 'Relacionamentos e vida social',
  },
  objetivos: {
    label: 'Objetivos',
    icon: '🎯',
    color: '#EF4444', // red
    description: 'Metas, sonhos e prioridades',
  },
}
