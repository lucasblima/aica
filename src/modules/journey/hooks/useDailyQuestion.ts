/**
 * useDailyQuestion Hook
 * React hook for managing daily questions
 */

import { useState, useEffect, useCallback } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'

const log = createNamespacedLogger('useDailyQuestion')
import {
  QuestionWithResponse,
  AnswerQuestionResult,
  QuestionResponse,
} from '../types/dailyQuestion'
import {
  getDailyQuestion,
  getAllQuestionsWithResponses,
  answerQuestion,
  getQuestionStats,
  getResponseHistory,
} from '../services/questionService'

/**
 * useDailyQuestion Hook
 * Hook for getting today's question
 */
export function useDailyQuestion() {
  const { user } = useAuth()
  const [question, setQuestion] = useState<QuestionWithResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchQuestion = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const fetchedQuestion = await getDailyQuestion(user.id)
      setQuestion(fetchedQuestion)
    } catch (err) {
      setError(err as Error)
      log.error('Error fetching daily question:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  const answer = useCallback(
    async (responseText: string): Promise<AnswerQuestionResult> => {
      if (!user?.id || !question) throw new Error('No question available')

      try {
        setIsSubmitting(true)
        setError(null)

        const result = await answerQuestion(user.id, {
          question_id: question.id,
          response_text: responseText,
        })

        // Update question to show it's been answered
        setQuestion(prev =>
          prev
            ? {
                ...prev,
                user_response: result.response,
              }
            : null
        )

        return result
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [user?.id, question]
  )

  const skip = useCallback(() => {
    // Get a new question
    fetchQuestion()
  }, [fetchQuestion])

  useEffect(() => {
    if (user?.id) {
      fetchQuestion()
    }
  }, [user?.id, fetchQuestion])

  return {
    question,
    isLoading,
    isSubmitting,
    error,
    answer,
    skip,
    refresh: fetchQuestion,
  }
}

/**
 * useAllQuestions Hook
 * Hook for viewing all questions with responses
 */
export function useAllQuestions() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<QuestionWithResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchQuestions = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const fetchedQuestions = await getAllQuestionsWithResponses(user.id)
      setQuestions(fetchedQuestions)
    } catch (err) {
      setError(err as Error)
      log.error('Error fetching questions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchQuestions()
    }
  }, [user?.id, fetchQuestions])

  return {
    questions,
    isLoading,
    error,
    refresh: fetchQuestions,
  }
}

/**
 * useQuestionStats Hook
 * Hook for viewing question engagement stats
 */
export function useQuestionStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState<{
    total_answered: number
    total_available: number
    answer_rate: number
    recent_streak: number
  }>({
    total_answered: 0,
    total_available: 0,
    answer_rate: 0,
    recent_streak: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchStats = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const fetchedStats = await getQuestionStats(user.id)
      setStats(fetchedStats)
    } catch (err) {
      setError(err as Error)
      log.error('Error fetching question stats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchStats()
    }
  }, [user?.id, fetchStats])

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  }
}

/**
 * useResponseHistory Hook
 * Hook for viewing response history
 */
export function useResponseHistory(limit: number = 50) {
  const { user } = useAuth()
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const fetchedResponses = await getResponseHistory(user.id, limit)
      setResponses(fetchedResponses)
    } catch (err) {
      setError(err as Error)
      log.error('Error fetching response history:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, limit])

  useEffect(() => {
    if (user?.id) {
      fetchHistory()
    }
  }, [user?.id, fetchHistory])

  return {
    responses,
    isLoading,
    error,
    refresh: fetchHistory,
  }
}
