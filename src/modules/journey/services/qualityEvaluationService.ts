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
    log.warn('Quality evaluation failed, using fallback:', error)
    // Fallback: quality=0.5 → CP=11 (median, safe experience)
    return {
      cp_earned: 11,
      quality_score: 0.5,
      assessment: {
        quality_score: 0.5,
        relevance: 0.5,
        depth: 0.5,
        authenticity: 0.5,
        clarity: 0.5,
        feedback_message: 'Obrigado por compartilhar sua reflexao!',
        feedback_tier: 'medium',
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
