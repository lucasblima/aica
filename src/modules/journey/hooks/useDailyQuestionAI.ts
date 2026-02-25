/**
 * useDailyQuestionAI Hook
 * Enhanced React hook for AI-driven daily questions with 3-level fallback
 *
 * Levels:
 * 1. AI-Driven (Gemini) - Contextual perguntas based on user state
 * 2. Journey Fallback - Specific journey question
 * 3. Pool Fallback - Generic reflective question
 */

import { useState, useEffect, useCallback } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'

const log = createNamespacedLogger('useDailyQuestionAI')
import { supabase } from '@/services/supabaseClient'
import { QuestionWithResponse, AnswerQuestionResult } from '../types/dailyQuestion'
import {
  getDailyQuestionWithContext,
  saveDailyResponse,
  logDailyQuestionUsage,
} from '../services/dailyQuestionService'
import { answerQuestion as saveQuestionResponse } from '../services/questionService'

interface DailyQuestionState {
  question: QuestionWithResponse | null
  source: 'ai' | 'journey' | 'pool'
  isLoading: boolean
  isSubmitting: boolean
  error: Error | null
}

/**
 * useDailyQuestionAI Hook
 * Gets daily question using 3-level fallback system with Gemini integration
 *
 * Features:
 * - Automatic context-aware question generation using Gemini
 * - Fallback to journey-specific questions
 * - Final fallback to generic question pool
 * - Automatic response caching (24h per question)
 * - Cost optimization with rate limiting
 */
export function useDailyQuestionAI() {
  const { user } = useAuth()
  const [state, setState] = useState<DailyQuestionState>({
    question: null,
    source: 'pool',
    isLoading: false,
    isSubmitting: false,
    error: null,
  })

  const fetchQuestion = useCallback(async () => {
    if (!user?.id) return

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }))

      const startTime = performance.now()

      // Fetch question using cascading fallback system
      const result = await getDailyQuestionWithContext(user.id)

      const responseTime = Math.round(performance.now() - startTime)

      // Log usage for cost tracking
      await logDailyQuestionUsage(user.id, result.source, responseTime)

      setState(prev => ({
        ...prev,
        question: result.question,
        source: result.source,
        isLoading: false,
      }))

      // Log which level was used
      log.debug(`Daily Question (${result.source}): "${result.question.question_text}" (${responseTime}ms)`)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch question')

      setState(prev => ({
        ...prev,
        isLoading: false,
        error,
      }))

      log.error('Error fetching daily question:', error)
    }
  }, [user?.id])

  const answer = useCallback(
    async (responseText: string): Promise<AnswerQuestionResult> => {
      if (!user?.id || !state.question) {
        throw new Error('No question available')
      }

      if (!responseText.trim()) {
        throw new Error('Response cannot be empty')
      }

      try {
        setState(prev => ({ ...prev, isSubmitting: true, error: null }))

        // Save response based on question source
        let result: AnswerQuestionResult

        // Check if question_id is a real DB UUID (journey questions from daily_questions table)
        const isRealDBQuestion = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(state.question.id)

        if (isRealDBQuestion) {
          // Real DB question — save via questionService (Gemini quality eval + CP)
          result = await saveQuestionResponse(user.id, {
            question_id: state.question.id,
            response_text: responseText,
          })
        } else {
          // AI/template/pool question with synthetic ID — use heuristic CP scoring
          await saveDailyResponse(user.id, state.question.id, responseText, state.source as 'ai' | 'journey' | 'pool')

          const wordCount = responseText.trim().split(/\s+/).length
          let cpEarned = 3
          if (wordCount >= 10) cpEarned = 5
          if (wordCount >= 25) cpEarned = 8
          if (wordCount >= 50) cpEarned = 12
          if (wordCount >= 80) cpEarned = 15

          // Award CP via RPC
          let leveledUp = false
          try {
            const { data: awardData } = await supabase.rpc('award_consciousness_points', {
              p_user_id: user.id,
              p_points: cpEarned,
              p_reason: 'question_answered',
            })
            leveledUp = awardData?.leveled_up || false
          } catch (err) {
            log.warn('Failed to award CP:', err)
          }

          result = {
            response: {
              id: `response-${Date.now()}`,
              user_id: user.id,
              question_id: state.question.id,
              response_text: responseText,
              responded_at: new Date().toISOString(),
            },
            cp_earned: cpEarned,
            leveled_up: leveledUp,
          }
        }

        // Update state to show answered
        setState(prev => ({
          ...prev,
          question: prev.question
            ? { ...prev.question, user_response: result.response }
            : null,
          isSubmitting: false,
        }))

        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to save response')

        setState(prev => ({
          ...prev,
          isSubmitting: false,
          error,
        }))

        throw error
      }
    },
    [user?.id, state.question, state.source]
  )

  const skip = useCallback(() => {
    fetchQuestion()
  }, [fetchQuestion])

  const refresh = useCallback(() => {
    fetchQuestion()
  }, [fetchQuestion])

  // Auto-fetch question when user changes
  useEffect(() => {
    if (user?.id) {
      fetchQuestion()
    }
  }, [user?.id, fetchQuestion])

  return {
    question: state.question,
    source: state.source,
    isLoading: state.isLoading,
    isSubmitting: state.isSubmitting,
    error: state.error,
    answer,
    skip,
    refresh,
  }
}

/**
 * Hook variant that caches question for 24h
 * Useful for avoiding repeated Gemini calls
 */
export function useDailyQuestionAICached() {
  const hook = useDailyQuestionAI()
  const { user } = useAuth()

  // Check cache before fetching
  useEffect(() => {
    if (!user?.id || hook.question) return

    // Issue #202: Guard localStorage access for SSR compatibility
    if (typeof window === 'undefined') return

    const cacheKey = `daily_question_${user.id}`
    const cached = localStorage.getItem(cacheKey)

    if (cached) {
      try {
        const cachedData = JSON.parse(cached)
        const cacheAge = Date.now() - cachedData.timestamp

        // Cache valid for 24 hours
        if (cacheAge < 24 * 60 * 60 * 1000) {
          // Use cached question
          log.debug('Using cached daily question')
          return
        }
      } catch (e) {
        log.error('Error parsing cached question:', e)
      }
    }
  }, [user?.id, hook.question])

  // Cache new questions
  useEffect(() => {
    if (!user?.id || !hook.question) return

    // Issue #202: Guard localStorage access for SSR compatibility
    if (typeof window === 'undefined') return

    const cacheKey = `daily_question_${user.id}`
    const cacheData = {
      question: hook.question,
      source: hook.source,
      timestamp: Date.now(),
    }

    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
  }, [user?.id, hook.question, hook.source])

  return hook
}
