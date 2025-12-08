/**
 * Sentiment Analysis Types
 * Tipos para análise de sentimento em tempo real
 */

export type Sentiment =
  | 'very_positive'
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'very_negative'

export interface SentimentAnalysis {
  timestamp: Date
  sentiment: Sentiment
  sentimentScore: number // -1 to 1
  emotions: string[] // joy, sadness, anxiety, anger, etc
  triggers: string[] // work, health, relationship, etc
  energyLevel: number // 0-100
}

export interface EmotionalTrend {
  period: 'day' | 'week' | 'month'
  trend: 'ascending' | 'stable' | 'descending' | 'volatile'
  averageScore: number
  dataPoints: {
    timestamp: Date
    score: number
    sentiment: Sentiment
  }[]
}

export interface DetectedPattern {
  type: 'recurring_low' | 'recurring_high' | 'sudden_drop' | 'consistent_negative' | 'consistent_positive'
  description: string
  frequency: number
  lastOccurrence: Date
  severity: 'low' | 'medium' | 'high'
  suggestion?: string
}

// Sentiment color mapping
export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  very_positive: '#10b981', // green-500
  positive: '#84cc16', // lime-500
  neutral: '#94a3b8', // slate-400
  negative: '#f97316', // orange-500
  very_negative: '#ef4444', // red-500
}

// Sentiment score ranges
export const SENTIMENT_RANGES = {
  very_positive: { min: 0.5, max: 1 },
  positive: { min: 0.15, max: 0.5 },
  neutral: { min: -0.15, max: 0.15 },
  negative: { min: -0.5, max: -0.15 },
  very_negative: { min: -1, max: -0.5 },
} as const

// Helper: Determine sentiment from score
export function getSentimentFromScore(score: number): Sentiment {
  if (score >= 0.5) return 'very_positive'
  if (score >= 0.15) return 'positive'
  if (score >= -0.15) return 'neutral'
  if (score >= -0.5) return 'negative'
  return 'very_negative'
}

// Helper: Get color for sentiment
export function getSentimentColor(sentiment: Sentiment): string {
  return SENTIMENT_COLORS[sentiment]
}
