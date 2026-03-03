/**
 * Quality Evaluation Service
 * Evaluates content quality via Gemini and calculates CP using quality-based formula.
 * Formula: CP = 2 + floor(quality_score * 18)  →  range 2-20 CP
 */

import { GeminiClient } from '@/lib/gemini'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import { QualityAssessment, CP_FORMULA } from '../types/consciousnessPoints'

const geminiClient = GeminiClient.getInstance()
const log = createNamespacedLogger('QualityEvaluation')

/**
 * Calculate CP from a quality score using the unified formula.
 * CP = base + floor(clamp(quality_score, 0, 1) * multiplier)
 */
export function calculateCP(qualityScore: number): number {
  const clamped = Math.max(0, Math.min(1, qualityScore))
  return CP_FORMULA.base + Math.floor(clamped * CP_FORMULA.multiplier)
}

const REFLECTION_KEYWORDS = /percebi|aprendi|sinto|entendi|refleti|descobri|compreendi/i

/**
 * Heuristic quality scorer used when Gemini evaluation fails.
 * Evaluates content quality based on multiple dimensions:
 * - Word count (not char count) for meaningful length assessment
 * - Sentence structure and completeness
 * - Reflection and emotional vocabulary
 * - Engagement signals (questions, varied punctuation)
 * - Vocabulary diversity
 * Returns a score in [0.15, 0.95] — gives CP range of ~4-19.
 */
function computeHeuristicQuality(content: string): number {
  const trimmed = content.trim()
  if (!trimmed) return 0.15

  const words = trimmed.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const sentenceCount = sentences.length

  // 1. Base score from word count (primary signal, not char count)
  let score: number
  if (wordCount < 5) score = 0.15
  else if (wordCount < 15) score = 0.30
  else if (wordCount < 30) score = 0.45
  else if (wordCount < 60) score = 0.55
  else if (wordCount < 100) score = 0.65
  else score = 0.75

  // 2. Sentence structure bonus — complete sentences indicate thoughtfulness
  if (sentenceCount >= 2) score += 0.05
  if (sentenceCount >= 4) score += 0.05

  // 3. Reflection/emotion keywords — strong signal of quality
  const reflectionMatches = trimmed.match(REFLECTION_KEYWORDS)
  if (reflectionMatches) {
    score += 0.10
  }

  // Additional emotional depth keywords
  const DEPTH_KEYWORDS = /importante|significativo|profundo|impacto|transform|mudou|cresci|evolui|superei|conquist|desafi|vulnerab|coragem|medo|esperan/i
  if (DEPTH_KEYWORDS.test(trimmed)) {
    score += 0.05
  }

  // 4. Engagement signals — questions and exclamations
  if (/\?/.test(trimmed)) score += 0.03
  if (/!/.test(trimmed)) score += 0.02

  // 5. Vocabulary diversity — unique words / total words
  const uniqueWords = new Set(words.map(w => w.toLowerCase()))
  const diversityRatio = uniqueWords.size / Math.max(1, wordCount)
  if (diversityRatio > 0.7 && wordCount >= 10) score += 0.05

  return Math.max(0.15, Math.min(0.95, score))
}

export interface QualityEvaluationResult {
  cp_earned: number
  quality_score: number
  assessment: QualityAssessment
}

/**
 * Evaluate content quality via Gemini and calculate CP.
 * Returns fallback (quality=0.5, cp=11) if Gemini fails.
 */
export async function evaluateAndCalculateCP(
  content: string,
  inputType: 'moment' | 'question_answer' | 'reflection',
  context?: { question_text?: string; summary_context?: string }
): Promise<QualityEvaluationResult> {
  try {
    const response = await geminiClient.call({
      action: 'evaluate_quality',
      payload: {
        input_type: inputType,
        content,
        question_text: context?.question_text,
        summary_context: context?.summary_context,
      },
      model: 'fast',
    })

    const result = response.result as QualityAssessment
    const qualityScore = Math.max(0, Math.min(1, result.quality_score))
    const cpEarned = calculateCP(qualityScore)

    return {
      cp_earned: cpEarned,
      quality_score: qualityScore,
      assessment: result,
    }
  } catch (error) {
    log.warn('Quality evaluation failed, using heuristic fallback:', error)
    const heuristicScore = computeHeuristicQuality(content)
    const cpEarned = calculateCP(heuristicScore)
    log.info(`Heuristic scoring used: score=${heuristicScore.toFixed(2)}, cp=${cpEarned}`)

    const tier = heuristicScore >= 0.7 ? 'high' : heuristicScore >= 0.4 ? 'medium' : 'low'
    return {
      cp_earned: cpEarned,
      quality_score: heuristicScore,
      assessment: {
        quality_score: heuristicScore,
        relevance: heuristicScore,
        depth: heuristicScore,
        authenticity: heuristicScore,
        clarity: heuristicScore,
        feedback_message: 'Obrigado por compartilhar sua reflexao!',
        feedback_tier: tier,
      },
    }
  }
}

/**
 * Update the user's avg_quality_score via RPC (fire-and-forget).
 * Uses Exponential Moving Average for smooth adaptation.
 */
export async function updateAvgQualityScore(userId: string, score: number): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_avg_quality_score', {
      p_user_id: userId,
      p_new_quality_score: score,
    })
    if (error) {
      log.warn('Failed to update avg_quality_score:', error)
    }
  } catch (error) {
    log.warn('updateAvgQualityScore error (non-critical):', error)
  }
}
