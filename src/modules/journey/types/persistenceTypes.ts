/**
 * Moment Persistence Types
 * Extended types for moment persistence service (PHASE 3 Part 2)
 *
 * This module extends the basic moment types with AI, validation, and persistence features
 */

import { Moment, MomentType, CreateMomentInput } from './moment'

/**
 * Life area categories
 */
export type LifeArea = 'health' | 'relationships' | 'work' | 'finance' | 'personal-growth' | 'spirituality' | 'creativity' | 'learning'

/**
 * Moment categorization
 */
export type MomentCategory = 'reflection' | 'milestone' | 'challenge' | 'learning' | 'breakthrough'

/**
 * Enhanced input for moment creation with full fields
 */
export interface CreateMomentEntryInput {
  userId: string
  content?: string // Text optional
  emotionSelected: string // Required: emotion value
  emotionIntensity: number // Required: 1-10 scale
  lifeAreas: LifeArea[] // Required: affected areas
  tags?: string[] // Optional: custom tags
  momentType?: MomentCategory // Optional: categorization
  happened_at?: Date // Optional: when it occurred
  location?: string // Optional: location
}

/**
 * Processed moment data after validation and AI processing
 */
export interface ProcessedMomentData {
  user_id: string
  type: MomentType
  content?: string
  emotion_selected: string
  emotion_intensity: number
  sentiment_score?: number
  sentiment_label?: string
  sentiment_generated_at?: string
  life_areas: LifeArea[]
  moment_category?: MomentCategory
  tags?: string[]
  ai_generated_tags?: string[]
  tags_confidence?: Record<string, number>
  ai_insights?: string
  location?: string
  happened_at?: string
}

/**
 * Result of successful moment creation with CP awards
 */
export interface MomentEntryResult {
  momentId: string
  pointsAwarded: number
  leveledUp: boolean
  newLevel?: number
  streakUpdated: boolean
  currentStreak: number
  createdAt: Date
}

/**
 * Validation result with errors and warnings
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  validatedInput?: CreateMomentEntryInput
}

/**
 * Sentiment analysis result from AI
 */
export interface SentimentAnalysisResult {
  score: number // -1 to 1
  label: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  confidence: number // 0-1
  keywords: string[] // Detected keywords
  generatedAt: Date
}

/**
 * Auto-tagging result from AI
 */
export interface AutoTaggingResult {
  tags: string[]
  confidences: Record<string, number>
  insights: string
  relatedTags: string[]
  generatedAt: Date
}

/**
 * CP award details
 */
export interface CPAwardDetails {
  basePoints: number
  emotionBonus?: number
  streakBonus?: number
  levelUpBonus?: number
  totalPoints: number
  reason: string
}

/**
 * Life area labels for UI
 */
export const LIFE_AREAS_LABELS: Record<LifeArea, string> = {
  health: 'Saude e Bem-estar',
  relationships: 'Relacionamentos',
  work: 'Trabalho e Carreira',
  finance: 'Financas',
  'personal-growth': 'Crescimento Pessoal',
  spirituality: 'Espiritualidade',
  creativity: 'Criatividade',
  learning: 'Aprendizado',
}

/**
 * Moment category labels for UI
 */
export const MOMENT_CATEGORY_LABELS: Record<MomentCategory, string> = {
  reflection: 'Reflexao',
  milestone: 'Marco',
  challenge: 'Desafio',
  learning: 'Aprendizado',
  breakthrough: 'Breakthrough',
}

/**
 * Sentiment color mapping for UI
 */
export const SENTIMENT_COLORS: Record<string, string> = {
  'very_positive': '#10b981',
  'positive': '#84cc16',
  'neutral': '#94a3b8',
  'negative': '#f97316',
  'very_negative': '#ef4444',
}

/**
 * Error logging context
 */
export interface ErrorContext {
  operation: 'validation' | 'sentiment_analysis' | 'tagging' | 'db_insert' | 'cp_award' | 'streak_update'
  userId: string
  momentId?: string
  error: Error
  context?: Record<string, any>
}

/**
 * Processing queue item for async operations
 */
export interface ProcessingQueueItem {
  momentId: string
  userId: string
  operation: 'analyze_sentiment' | 'generate_tags'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retryCount: number
  maxRetries: number
  createdAt: Date
  processedAt?: Date
  error?: string
}
