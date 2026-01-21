/**
 * Question Service
 * Service layer for managing daily voluntary questions
 */

import { supabase } from '@/lib/supabase'
import { createNamespacedLogger } from '@/lib/logger'
import {
  DailyQuestion,
  QuestionResponse,
  QuestionWithResponse,
  AnswerQuestionInput,
  AnswerQuestionResult,
} from '../types/dailyQuestion'

const log = createNamespacedLogger('QuestionService')

/**
 * Get daily question for user
 * Returns a random question that user hasn't answered yet
 */
export async function getDailyQuestion(userId: string): Promise<QuestionWithResponse | null> {
  try {
    // Get all active questions
    const { data: questions, error: questionsError } = await supabase
      .from('daily_questions')
      .select('*')
      .eq('active', true)

    if (questionsError) throw questionsError
    if (!questions || questions.length === 0) return null

    // Get user's answered question IDs
    const { data: responses, error: responsesError } = await supabase
      .from('question_responses')
      .select('question_id')
      .eq('user_id', userId)

    if (responsesError) throw responsesError

    const answeredIds = new Set(responses?.map(r => r.question_id) || [])

    // Filter unanswered questions
    const unansweredQuestions = questions.filter(q => !answeredIds.has(q.id))

    // If all answered, pick a random one to allow re-answering
    const availableQuestions =
      unansweredQuestions.length > 0 ? unansweredQuestions : questions

    // Pick random question
    const randomIndex = Math.floor(Math.random() * availableQuestions.length)
    const selectedQuestion = availableQuestions[randomIndex]

    // Get user's response if exists
    const userResponse = responses?.find(r => r.question_id === selectedQuestion.id)

    return {
      ...selectedQuestion,
      user_response: userResponse ? (userResponse as QuestionResponse) : undefined,
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
    // Insert response
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

    if (responseError) throw responseError

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

    // Update stats
    await supabase
      .from('user_consciousness_stats')
      .update({
        total_questions_answered: supabase.sql`total_questions_answered + 1`,
      })
      .eq('user_id', userId)

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
