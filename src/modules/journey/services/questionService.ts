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
import { checkAndTriggerGenerationIfNeeded, triggerQuestionGeneration } from './questionGenerationService'
import { evaluateAndCalculateCP, updateAvgQualityScore } from './qualityEvaluationService'

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
    // Single RPC call replaces 2 queries + JS filtering
    const { data: unansweredQuestions, error: rpcError } = await supabase.rpc(
      'get_unanswered_question',
      { p_user_id: userId, p_limit: 3 }
    )

    if (rpcError) {
      log.error('Error fetching unanswered questions via RPC:', rpcError)
      throw rpcError
    }

    log.debug('Unanswered questions from RPC:', unansweredQuestions?.length || 0)

    // If no unanswered questions, generate new ones and retry
    if (!unansweredQuestions || unansweredQuestions.length === 0) {
      log.info('No unanswered questions available, generating new ones...')

      // Await generation (forceRegenerate bypasses 12h cooldown and daily limit)
      const genResult = await triggerQuestionGeneration({ batchSize: 5, forceRegenerate: true })
      log.info('Generation result:', { success: genResult.success, generated: genResult.questionsGenerated })

      if (genResult.success && genResult.questionsGenerated > 0) {
        // Retry RPC to get newly generated question
        const { data: newQuestions } = await supabase.rpc(
          'get_unanswered_question',
          { p_user_id: userId, p_limit: 3 }
        )

        if (newQuestions && newQuestions.length > 0) {
          const randomIndex = Math.floor(Math.random() * newQuestions.length)
          const selected = newQuestions[randomIndex] as DailyQuestion
          log.debug('Got newly generated question', { questionId: selected.id })
          return { ...selected, user_response: undefined }
        }
      }

      return null
    }

    // Check if we need to generate more questions (non-blocking)
    if (unansweredQuestions.length < QUESTION_CONFIG.MIN_UNANSWERED_THRESHOLD) {
      log.info('Low on unanswered questions, triggering generation', {
        unansweredCount: unansweredQuestions.length,
        threshold: QUESTION_CONFIG.MIN_UNANSWERED_THRESHOLD,
      })
      checkAndTriggerGenerationIfNeeded(userId).catch(() => {
        // Errors logged in service
      })
    }

    // Pick random from top results (RPC already sorted by relevance)
    const randomIndex = Math.floor(Math.random() * unansweredQuestions.length)
    const selectedQuestion = unansweredQuestions[randomIndex] as DailyQuestion

    log.debug('Selected question for user', {
      questionId: selectedQuestion.id,
      category: selectedQuestion.category,
      isAiGenerated: selectedQuestion.created_by_ai || false,
    })

    return {
      ...selectedQuestion,
      user_response: undefined,
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

    // Fetch question text for quality evaluation context
    let questionText: string | undefined
    const { data: questionData } = await supabase
      .from('daily_questions')
      .select('question_text')
      .eq('id', input.question_id)
      .single()
    if (questionData) {
      questionText = questionData.question_text
    }

    // Evaluate quality and calculate CP
    const qualityResult = await evaluateAndCalculateCP(
      input.response_text,
      'question_answer',
      { question_text: questionText }
    )

    // Award CP
    const { data: cpResult, error: cpError } = await supabase.rpc(
      'award_consciousness_points',
      {
        p_user_id: userId,
        p_points: qualityResult.cp_earned,
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

    // Fire-and-forget: save quality data to question_responses + update avg
    supabase
      .from('question_responses')
      .update({
        quality_score: qualityResult.quality_score,
        quality_assessment: qualityResult.assessment,
      })
      .eq('id', response.id)
      .eq('user_id', userId)
      .then(({ error }) => { if (error) log.warn('Failed to save question quality_score:', error) })
    updateAvgQualityScore(userId, qualityResult.quality_score)

    return {
      response,
      cp_earned: qualityResult.cp_earned,
      leveled_up: cpResult?.leveled_up || false,
      quality_score: qualityResult.quality_score,
      quality_feedback: qualityResult.assessment.feedback_message,
      quality_tier: qualityResult.assessment.feedback_tier,
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
