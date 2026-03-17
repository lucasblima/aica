/**
 * Moment Types
 * Tipos para o sistema de captura de momentos
 */

import { SentimentAnalysis } from './sentiment'

export type MomentType = 'text' | 'áudio' | 'photo'

export interface Moment {
  id: string
  user_id: string

  // Content
  type: MomentType
  content?: string

  // Emotion & Sentiment
  emotion?: string // Selected emotion
  sentiment_data?: SentimentAnalysis

  // Metadata
  tags?: string[]
  location?: string

  // Timestamps
  created_at: string
  updated_at: string
}

export interface CreateMomentInput {
  type: MomentType
  content?: string
  audioBlob?: Blob
  photoFile?: File
  emotion?: string
  tags?: string[]
  location?: string
}

export interface MomentWithCP extends Moment {
  cp_earned: number
  leveled_up: boolean
  new_level?: number
  level_name?: string
  quality_score?: number
  quality_feedback?: string
  quality_tier?: 'low' | 'medium' | 'high' | 'exceptional'
}

export interface MomentFilter {
  startDate?: Date
  endDate?: Date
  emotions?: string[]
  tags?: string[]
  sentiments?: ('very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative')[]
}

// Emotions disponíveis (emoji wheel)
export const AVAILABLE_EMOTIONS = [
  { emoji: '😊', name: 'Feliz', value: 'happy' },
  { emoji: '😢', name: 'Triste', value: 'sad' },
  { emoji: '😰', name: 'Ansioso', value: 'anxious' },
  { emoji: '😡', name: 'Irritado', value: 'angry' },
  { emoji: '🤔', name: 'Pensativo', value: 'thoughtful' },
  { emoji: '😌', name: 'Calmo', value: 'calm' },
  { emoji: '🤗', name: 'Grato', value: 'grateful' },
  { emoji: '😓', name: 'Cansado', value: 'tired' },
  { emoji: '🤩', name: 'Inspirado', value: 'inspired' },
  { emoji: '😐', name: 'Neutro', value: 'neutral' },
  { emoji: '🥳', name: 'Empolgado', value: 'excited' },
  { emoji: '😔', name: 'Decepcionado', value: 'disappointed' },
  { emoji: '😖', name: 'Frustrado', value: 'frustrated' },
  { emoji: '🥰', name: 'Amoroso', value: 'loving' },
  { emoji: '😨', name: 'Com medo', value: 'scared' },
  { emoji: '😤', name: 'Determinado', value: 'determined' },
  { emoji: '😴', name: 'Sonolento', value: 'sleepy' },
  { emoji: '🤯', name: 'Sobrecarregado', value: 'overwhelmed' },
  { emoji: '😎', name: 'Confiante', value: 'confident' },
  { emoji: '🙃', name: 'Confuso', value: 'confused' },
] as const

export type EmotionValue = typeof AVAILABLE_EMOTIONS[number]['value']

// Quick tags disponíveis
export const QUICK_TAGS = [
  '#saúde',
  '#trabalho',
  '#relacionamento',
  '#insight',
  '#gratidão',
  '#aprendizado',
  '#desafio',
  '#vitória',
  '#reflexão',
  '#família',
] as const
