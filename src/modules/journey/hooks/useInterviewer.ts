/**
 * Interviewer Hooks
 * React hooks for managing interview sessions, questions, and stats
 */

import { useState, useEffect, useCallback } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabaseClient'
import type {
  InterviewSession,
  InterviewQuestion,
  InterviewAnswer,
  InterviewStats,
  InterviewCategory,
} from '../types/interviewer'
import {
  getInterviewSessions,
  getSessionQuestions,
  getInterviewStats,
  submitInterviewResponse,
  startSession,
} from '../services/interviewerService'
import type { ProcessedInterviewResponse } from '../services/interviewerService'

const log = createNamespacedLogger('useInterviewer')

/**
 * useInterviewer Hook
 * Manages a single interview session flow: questions, answers, progress
 */
export function useInterviewer(sessionId?: string) {
  const { user } = useAuth()
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Load session and questions when sessionId changes
  const loadSession = useCallback(async () => {
    if (!sessionId || !user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('interviewer_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        setError(new Error('Session not found'))
        return
      }

      setSession(sessionData)

      // Fetch questions
      const fetchedQuestions = await getSessionQuestions(sessionId)
      setQuestions(fetchedQuestions)

      // Find first unanswered question index
      if (fetchedQuestions.length > 0) {
        const { data: responses } = await supabase
          .from('interviewer_responses')
          .select('question_id')
          .eq('user_id', user.id)
          .in('question_id', fetchedQuestions.map(q => q.id))

        const answeredIds = new Set((responses || []).map(r => r.question_id))
        const firstUnanswered = fetchedQuestions.findIndex(q => !answeredIds.has(q.id))
        setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : fetchedQuestions.length)
      }
    } catch (err) {
      setError(err as Error)
      log.error('Error loading session:', err)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, user?.id])

  useEffect(() => {
    if (sessionId && user?.id) {
      loadSession()
    }
  }, [sessionId, user?.id, loadSession])

  const submitAnswer = useCallback(
    async (answer: InterviewAnswer): Promise<ProcessedInterviewResponse> => {
      const fallback: ProcessedInterviewResponse = {
        success: false, response_id: '', cp_earned: 0, cp_result: null, insights_extracted: 0, processing_time_ms: 0,
      }

      if (!user?.id || !questions[currentIndex]) {
        return fallback
      }

      try {
        setIsSubmitting(true)
        setError(null)

        const question = questions[currentIndex]
        const answerText = 'text' in answer ? (answer as { text: string }).text :
          'selected' in answer ? (Array.isArray((answer as { selected: unknown }).selected)
            ? (answer as { selected: string[] }).selected.join(', ')
            : String((answer as { selected: string }).selected)) :
          'value' in answer ? String((answer as { value: number }).value) :
          'date' in answer ? (answer as { date: string }).date :
          'ranked' in answer ? (answer as { ranked: string[] }).ranked.join(', ') :
          null

        const result = await submitInterviewResponse(
          user.id,
          question.id,
          session?.id || null,
          answer,
          answerText
        )

        if (result.success) {
          // Advance to next question
          setCurrentIndex(prev => prev + 1)

          // Update local session state
          setSession(prev => prev ? {
            ...prev,
            answered_count: prev.answered_count + 1,
            completion_percentage: Math.round(((prev.answered_count + 1) / prev.total_questions) * 100),
            cp_earned: prev.cp_earned + result.cp_earned,
          } : null)

          // Log enriched results when available
          if (result.insights_extracted > 0) {
            log.info(`AI extracted ${result.insights_extracted} insights in ${result.processing_time_ms}ms`)
          }
          if (result.cp_result?.leveled_up) {
            log.info(`User leveled up to ${result.cp_result.level_name}!`)
          }
        }

        return result
      } catch (err) {
        setError(err as Error)
        log.error('Error submitting answer:', err)
        return fallback
      } finally {
        setIsSubmitting(false)
      }
    },
    [user?.id, questions, currentIndex, session?.id]
  )

  const skipQuestion = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, questions.length))
  }, [questions.length])

  const pauseSession = useCallback(async () => {
    if (!session?.id) return

    try {
      await supabase
        .from('interviewer_sessions')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', session.id)

      setSession(prev => prev ? { ...prev, status: 'paused' } : null)
    } catch (err) {
      log.error('Error pausing session:', err)
    }
  }, [session?.id])

  const currentQuestion = questions[currentIndex] || null
  const isComplete = currentIndex >= questions.length && questions.length > 0

  const progress = session ? {
    answered: session.answered_count,
    total: session.total_questions,
    percentage: session.completion_percentage,
  } : { answered: 0, total: 0, percentage: 0 }

  return {
    session,
    questions,
    currentQuestion,
    currentIndex,
    isLoading,
    isSubmitting,
    isComplete,
    progress,
    error,
    submitAnswer,
    skipQuestion,
    pauseSession,
    refresh: loadSession,
  }
}

/**
 * useInterviewStats Hook
 * Fetches overall interview stats for the user
 */
export function useInterviewStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState<InterviewStats>({
    total_questions: 0,
    total_answered: 0,
    categories_started: 0,
    categories_completed: 0,
    total_cp_earned: 0,
    completion_percentage: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchStats = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const fetchedStats = await getInterviewStats(user.id)
      setStats(fetchedStats)
    } catch (err) {
      setError(err as Error)
      log.error('Error fetching interview stats:', err)
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
 * useInterviewSessions Hook
 * Manages the list of interview sessions and creation of new ones
 */
export function useInterviewSessions() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const fetchedSessions = await getInterviewSessions(user.id)
      setSessions(fetchedSessions)
    } catch (err) {
      setError(err as Error)
      log.error('Error fetching interview sessions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  const startNew = useCallback(
    async (category: InterviewCategory): Promise<InterviewSession | null> => {
      if (!user?.id) return null

      try {
        setIsLoading(true)
        setError(null)

        const newSession = await startSession(user.id, category)
        if (newSession) {
          // Refresh the list to include the new session
          const updatedSessions = await getInterviewSessions(user.id)
          setSessions(updatedSessions)
        }

        return newSession
      } catch (err) {
        setError(err as Error)
        log.error('Error starting new session:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [user?.id]
  )

  useEffect(() => {
    if (user?.id) {
      fetchSessions()
    }
  }, [user?.id, fetchSessions])

  return {
    sessions,
    isLoading,
    error,
    startNew,
    refresh: fetchSessions,
  }
}
