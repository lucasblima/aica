/**
 * Weekly Summary Types
 * Tipos para resumo semanal inteligente (Feature 7)
 */

import { Moment } from './moment'

export type EmotionalTrend = 'ascending' | 'stable' | 'descending' | 'volatile'

export interface KeyMoment {
  id: string
  preview: string
  sentiment: string
  created_at: string
}

export interface WeeklySummaryData {
  emotionalTrend: EmotionalTrend
  dominantEmotions: string[]
  keyMoments: KeyMoment[]
  insights: string[]
  suggestedFocus: string
}

export interface WeeklySummary {
  id: string
  user_id: string

  // Time period
  week_number: number
  year: number
  period_start: string // ISO date
  period_end: string // ISO date

  // AI-generated summary
  summary_data: WeeklySummaryData

  // User reflection
  user_reflection?: string

  // Timestamps
  generated_at: string
  viewed_at?: string
}

export interface CreateWeeklySummaryInput {
  week_number: number
  year: number
  period_start: Date
  period_end: Date
  moments: Moment[]
}

export interface WeeklySummaryWithReflection extends WeeklySummary {
  reflection_added: boolean
  cp_earned: number
}

// Helper: Get current ISO week number
export function getCurrentWeekNumber(): { week: number; year: number } {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const oneWeek = 1000 * 60 * 60 * 24 * 7
  const week = Math.ceil(diff / oneWeek)
  return { week, year: now.getFullYear() }
}

// Helper: Get week date range
export function getWeekDateRange(year: number, week: number): { start: Date; end: Date } {
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const ISOweekStart = simple
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
  const start = new Date(ISOweekStart)
  const end = new Date(ISOweekStart)
  end.setDate(end.getDate() + 6)
  return { start, end }
}

// Emotional trend descriptions
export const EMOTIONAL_TREND_DESCRIPTIONS: Record<EmotionalTrend, string> = {
  ascending: 'Sua energia emocional está crescendo! Continue assim.',
  stable: 'Você está equilibrado e consistente.',
  descending: 'Parece que sua energia está diminuindo. Que tal pausar e refletir?',
  volatile: 'Você viveu altos e baixos esta semana. Vamos explorar o que causou essas oscilações.',
}

// Emotional trend colors
export const EMOTIONAL_TREND_COLORS: Record<EmotionalTrend, string> = {
  ascending: '#10b981', // green-500
  stable: '#3b82f6', // blue-500
  descending: '#f97316', // orange-500
  volatile: '#a855f7', // purple-500
}
