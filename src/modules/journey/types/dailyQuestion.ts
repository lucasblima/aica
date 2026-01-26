/**
 * Daily Question Types
 * Sistema de perguntas voluntárias para reflexão
 *
 * Supports infinite questions through AI generation:
 * - Global questions (user_id = null) are shared pool
 * - User-specific questions (user_id set) are AI-generated personalized
 */

export type QuestionCategory = 'reflection' | 'gratitude' | 'energy' | 'learning' | 'change'

export interface DailyQuestion {
  id: string
  question_text: string
  category: QuestionCategory
  active: boolean
  created_at: string
  // AI Generation fields
  user_id?: string | null // null = global question, set = user-specific
  created_by_ai?: boolean
  relevance_score?: number // 0-1, higher = more relevant to user
  generation_context?: {
    context_factors?: string[]
    generated_at?: string
  }
  generation_prompt_hash?: string
  parent_question_id?: string // for follow-up questions
}

export interface QuestionResponse {
  id: string
  user_id: string
  question_id: string
  response_text: string
  responded_at: string
  created_at?: string
}

/**
 * User's context bank for personalized question generation
 */
export interface UserQuestionContextBank {
  userId: string
  dominantEmotions: string[]
  recurringThemes: string[]
  mentionedAreas: string[]
  sentimentTrend: 'positive' | 'negative' | 'neutral' | 'volatile'
  totalResponses: number
  avgResponseLength: number
  engagementScore: number
  preferredCategories: QuestionCategory[]
  avoidedTopics: string[]
  lastGenerationAt: string | null
  generationCount: number
}

export interface QuestionWithResponse extends DailyQuestion {
  user_response?: QuestionResponse
}

export interface AnswerQuestionInput {
  question_id: string
  response_text: string
}

export interface AnswerQuestionResult {
  response: QuestionResponse
  cp_earned: number
  leveled_up: boolean
}

// Question category colors
export const QUESTION_CATEGORY_COLORS: Record<QuestionCategory, string> = {
  reflection: '#3b82f6', // blue-500
  gratitude: '#10b981', // green-500
  energy: '#f59e0b', // amber-500
  learning: '#a855f7', // purple-500
  change: '#f97316', // orange-500
}

// Question category icons (emojis)
export const QUESTION_CATEGORY_ICONS: Record<QuestionCategory, string> = {
  reflection: '🤔',
  gratitude: '🙏',
  energy: '⚡',
  learning: '📚',
  change: '🔄',
}

// Question category descriptions
export const QUESTION_CATEGORY_DESCRIPTIONS: Record<QuestionCategory, string> = {
  reflection: 'Perguntas para refletir sobre você mesmo',
  gratitude: 'Perguntas sobre gratidão e apreciação',
  energy: 'Perguntas sobre energia e motivação',
  learning: 'Perguntas sobre aprendizado e crescimento',
  change: 'Perguntas sobre mudança e objetivos',
}
