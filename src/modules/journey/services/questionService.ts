/**
 * Question Service
 * Service layer for managing daily voluntary questions
 *
 * Supports infinite questions through AI generation:
 * - When unanswered questions fall below threshold, auto-triggers generation
 * - Questions include both global pool and user-specific AI-generated ones
 */

import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import {
  DailyQuestion,
  QuestionResponse,
  QuestionWithResponse,
  AnswerQuestionInput,
  AnswerQuestionResult,
} from '../types/dailyQuestion'
import { checkAndTriggerGenerationIfNeeded } from './questionGenerationService'

const log = createNamespacedLogger('QuestionService')

// Configuration for question system
const QUESTION_CONFIG = {
  MIN_UNANSWERED_THRESHOLD: 3, // Trigger generation when below this
}

/**
 * Get daily question for user
 * Returns a random question that user hasn't answered yet
 * Auto-triggers AI generation when running low on questions
 */
export async function getDailyQuestion(userId: string): Promise<QuestionWithResponse | null> {
  try {
    // Get all active questions (global + user-specific)
    const { data: questions, error: questionsError } = await supabase
      .from('daily_questions')
      .select('*')
      .eq('active', true)
      .or(`user_id.is.null,user_id.eq.${userId}`)

    if (questionsError) {
      log.error('Error fetching questions:', questionsError)
      throw questionsError
    }

    log.debug('Active questions found:', questions?.length || 0)

    if (!questions || questions.length === 0) {
      log.warn('No active questions found in database')
      // Trigger generation (protected by circuit breaker and session validation)
      checkAndTriggerGenerationIfNeeded(userId).catch(() => {
        // Errors logged in service
      })
      return null
    }

    // Get user's answered question IDs
    const { data: responses, error: responsesError } = await supabase
      .from('question_responses')
      .select('question_id')
      .eq('user_id', userId)

    if (responsesError) {
      log.error('Error fetching responses:', responsesError)
      throw responsesError
    }

    const answeredIds = new Set(responses?.map(r => r.question_id) || [])
    log.debug('Questions answered by user:', answeredIds.size)

    // Filter unanswered questions
    const unansweredQuestions = questions.filter(q => !answeredIds.has(q.id))
    log.debug('Unanswered questions:', unansweredQuestions.length)

    // Check if we need to generate more questions (non-blocking)
    // Protected by circuit breaker and session validation
    if (unansweredQuestions.length < QUESTION_CONFIG.MIN_UNANSWERED_THRESHOLD) {
      log.info('Low on unanswered questions, triggering generation', {
        unansweredCount: unansweredQuestions.length,
        threshold: QUESTION_CONFIG.MIN_UNANSWERED_THRESHOLD,
      })
      checkAndTriggerGenerationIfNeeded(userId).catch(() => {
        // Errors logged in service
      })
    }

    // If all answered, allow re-answering any question
    const availableQuestions =
      unansweredQuestions.length > 0 ? unansweredQuestions : questions

    // Pick random question (prefer higher relevance_score for AI-generated)
    let selectedQuestion: DailyQuestion

    if (availableQuestions.some(q => q.relevance_score)) {
      // Sort by relevance and pick from top 3
      const sorted = [...availableQuestions].sort((a, b) =>
        (b.relevance_score || 0.5) - (a.relevance_score || 0.5)
      )
      const topQuestions = sorted.slice(0, Math.min(3, sorted.length))
      const randomIndex = Math.floor(Math.random() * topQuestions.length)
      selectedQuestion = topQuestions[randomIndex]
    } else {
      const randomIndex = Math.floor(Math.random() * availableQuestions.length)
      selectedQuestion = availableQuestions[randomIndex]
    }

    log.debug('Selected question for user', {
      questionId: selectedQuestion.id,
      category: selectedQuestion.category,
      isAiGenerated: selectedQuestion.created_by_ai || false,
      isReanswering: unansweredQuestions.length === 0,
      totalQuestions: questions?.length,
      totalAnswered: answeredIds.size,
    })

    // Don't include user_response when returning - we want fresh questions
    return {
      ...selectedQuestion,
      user_response: undefined, // Always allow answering again
    }
  } catch (error) {
    log.error('Error fetching daily question:', error)
    return null
  }
}

/**
 * Get all questions with user responses
 */
export async function getAllQuestionsWithResponses(
  userId: string
): Promise<QuestionWithResponse[]> {
  try {
    const { data: questions, error: questionsError } = await supabase
      .from('daily_questions')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (questionsError) throw questionsError

    const { data: responses, error: responsesError } = await supabase
      .from('question_responses')
      .select('*')
      .eq('user_id', userId)

    if (responsesError) throw responsesError

    // Map questions with responses
    return (questions || []).map(q => ({
      ...q,
      user_response: responses?.find(r => r.question_id === q.id),
    }))
  } catch (error) {
    log.error('Error fetching questions with responses:', error)
    return []
  }
}

/**
 * Answer a question
 */
export async function answerQuestion(
  userId: string,
  input: AnswerQuestionInput
): Promise<AnswerQuestionResult> {
  try {
    log.debug('Saving question response', {
      userId,
      questionId: input.question_id,
      responseLength: input.response_text.length,
    })

    // Insert response (upsert will update if same user_id + question_id exists)
    const { data: response, error: responseError } = await supabase
      .from('question_responses')
      .upsert(
        {
          user_id: userId,
          question_id: input.question_id,
          response_text: input.response_text,
          responded_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,question_id',
        }
      )
      .select()
      .single()

    if (responseError) {
      log.error('Error saving question response:', responseError)
      throw responseError
    }

    log.debug('Question response saved successfully', {
      responseId: response.id,
      questionId: response.question_id,
    })

    // Award CP
    const { data: cpResult, error: cpError } = await supabase.rpc(
      'award_consciousness_points',
      {
        p_user_id: userId,
        p_points: 10,
        p_reason: 'question_answered',
        p_reference_id: response.id,
        p_reference_type: 'question',
      }
    )

    if (cpError) {
      log.error('Error awarding CP:', cpError)
    }

    // Update stats via RPC (supabase.sql doesn't work client-side)
    const { error: statsError } = await supabase.rpc('increment_questions_answered', {
      p_user_id: userId,
    })

    if (statsError) {
      log.warn('Error incrementing questions counter:', statsError)
    }

    return {
      response,
      cp_earned: cpResult?.new_total || 10,
      leveled_up: cpResult?.leveled_up || false,
    }
  } catch (error) {
    log.error('Error answering question:', error)
    throw error
  }
}

/**
 * Get user's response to a specific question
 */
export async function getQuestionResponse(
  userId: string,
  questionId: string
): Promise<QuestionResponse | null> {
  try {
    const { data, error } = await supabase
      .from('question_responses')
      .select('*')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data
  } catch (error) {
    log.error('Error fetching question response:', error)
    return null
  }
}

/**
 * Get user's response history
 */
export async function getResponseHistory(
  userId: string,
  limit: number = 50
): Promise<QuestionResponse[]> {
  try {
    const { data, error } = await supabase
      .from('question_responses')
      .select('*')
      .eq('user_id', userId)
      .order('responded_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data || []
  } catch (error) {
    log.error('Error fetching response history:', error)
    return []
  }
}

/**
 * Get statistics about user's question engagement
 */
export async function getQuestionStats(userId: string): Promise<{
  total_answered: number
  total_available: number
  answer_rate: number
  recent_streak: number
}> {
  try {
    const { data: allQuestions } = await supabase
      .from('daily_questions')
      .select('id')
      .eq('active', true)

    const { data: responses } = await supabase
      .from('question_responses')
      .select('*')
      .eq('user_id', userId)
      .order('responded_at', { ascending: false })

    const total_available = allQuestions?.length || 0
    const total_answered = responses?.length || 0
    const answer_rate = total_available > 0 ? (total_answered / total_available) * 100 : 0

    // Calculate recent streak (consecutive days with answers)
    let recent_streak = 0
    if (responses && responses.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 0; i < responses.length; i++) {
        const responseDate = new Date(responses[i].responded_at)
        responseDate.setHours(0, 0, 0, 0)

        const daysDiff = Math.floor(
          (today.getTime() - responseDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysDiff === recent_streak) {
          recent_streak++
        } else {
          break
        }
      }
    }

    return {
      total_answered,
      total_available,
      answer_rate,
      recent_streak,
    }
  } catch (error) {
    log.error('Error fetching question stats:', error)
    return {
      total_answered: 0,
      total_available: 0,
      answer_rate: 0,
      recent_streak: 0,
    }
  }
}
