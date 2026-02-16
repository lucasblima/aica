/**
 * Interviewer Service
 * Manages structured interview sessions, questions, and responses
 * Routes answers to user_memory for cross-module personalization
 */

import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import type {
  InterviewCategory,
  InterviewQuestion,
  InterviewSession,
  InterviewResponse,
  InterviewStats,
  InterviewAnswer,
  InterviewSessionStatus,
} from '../types/interviewer'
import { INTERVIEW_CATEGORY_META } from '../types/interviewer'

const log = createNamespacedLogger('InterviewerService')

const CP_PER_ANSWER = 5

/**
 * Fetch all interview sessions for a user
 */
export async function getInterviewSessions(userId: string): Promise<InterviewSession[]> {
  try {
    const { data, error } = await supabase
      .from('interviewer_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      log.error('Error fetching interview sessions:', error)
      return []
    }

    return data || []
  } catch (error) {
    log.error('Error in getInterviewSessions:', error)
    return []
  }
}

/**
 * Fetch questions for a session, ordered by sort_order
 */
export async function getSessionQuestions(sessionId: string): Promise<InterviewQuestion[]> {
  try {
    // First get the session to get question_ids
    const { data: session, error: sessionError } = await supabase
      .from('interviewer_sessions')
      .select('question_ids')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      log.error('Error fetching session for questions:', sessionError)
      return []
    }

    const questionIds = session.question_ids as string[]
    if (!questionIds || questionIds.length === 0) return []

    const { data, error } = await supabase
      .from('interviewer_questions')
      .select('*')
      .in('id', questionIds)
      .order('sort_order', { ascending: true })

    if (error) {
      log.error('Error fetching session questions:', error)
      return []
    }

    return data || []
  } catch (error) {
    log.error('Error in getSessionQuestions:', error)
    return []
  }
}

/**
 * Get interview stats via RPC
 */
export async function getInterviewStats(userId: string): Promise<InterviewStats> {
  const defaultStats: InterviewStats = {
    total_questions: 0,
    total_answered: 0,
    categories_started: 0,
    categories_completed: 0,
    total_cp_earned: 0,
    completion_percentage: 0,
  }

  try {
    const { data, error } = await supabase.rpc('get_interview_stats', {
      p_user_id: userId,
    })

    if (error) {
      log.error('Error fetching interview stats:', error)
      return defaultStats
    }

    return data || defaultStats
  } catch (error) {
    log.error('Error in getInterviewStats:', error)
    return defaultStats
  }
}

/**
 * Submit an interview response, route to user_memory, and update session progress
 */
export async function submitInterviewResponse(
  userId: string,
  questionId: string,
  sessionId: string | null,
  answer: InterviewAnswer,
  answerText: string | null
): Promise<{ success: boolean; cp_earned: number }> {
  try {
    // 1. Insert response
    const { error: insertError } = await supabase
      .from('interviewer_responses')
      .insert({
        user_id: userId,
        session_id: sessionId,
        question_id: questionId,
        answer,
        answer_text: answerText,
        routed_to_memory: false,
        routed_modules: [],
        cp_earned: CP_PER_ANSWER,
      })

    if (insertError) {
      log.error('Error inserting interview response:', insertError)
      return { success: false, cp_earned: 0 }
    }

    // 2. Read question's memory_mapping and route to user_memory
    const { data: question, error: questionError } = await supabase
      .from('interviewer_questions')
      .select('memory_mapping, target_modules')
      .eq('id', questionId)
      .single()

    if (!questionError && question?.memory_mapping) {
      const mapping = question.memory_mapping as { category: string; key: string; module: string | null }

      // Upsert into user_memory
      const { error: memoryError } = await supabase
        .from('user_memory')
        .upsert(
          {
            user_id: userId,
            category: mapping.category,
            key: mapping.key,
            value: answer,
            source: 'interview',
            module: mapping.module,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,category,key,module' }
        )

      if (memoryError) {
        log.warn('Error routing to user_memory (non-blocking):', memoryError)
      } else {
        // Mark response as routed
        await supabase
          .from('interviewer_responses')
          .update({
            routed_to_memory: true,
            routed_modules: question.target_modules || [],
          })
          .eq('user_id', userId)
          .eq('question_id', questionId)
          .order('created_at', { ascending: false })
          .limit(1)
      }
    }

    // 3. Update session progress if session exists
    if (sessionId) {
      await updateSessionProgress(sessionId)
    }

    return { success: true, cp_earned: CP_PER_ANSWER }
  } catch (error) {
    log.error('Error in submitInterviewResponse:', error)
    return { success: false, cp_earned: 0 }
  }
}

/**
 * Update session's answered_count and completion_percentage
 */
async function updateSessionProgress(sessionId: string): Promise<void> {
  try {
    const { data: session, error: sessionError } = await supabase
      .from('interviewer_sessions')
      .select('question_ids, total_questions, user_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) return

    // Count answered questions for this session
    const questionIds = session.question_ids as string[]
    const { count, error: countError } = await supabase
      .from('interviewer_responses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user_id)
      .in('question_id', questionIds)

    if (countError) return

    const answeredCount = count || 0
    const totalQuestions = session.total_questions || questionIds.length
    const percentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0
    const status: InterviewSessionStatus = percentage >= 100 ? 'completed' : 'in_progress'

    await supabase
      .from('interviewer_sessions')
      .update({
        answered_count: answeredCount,
        completion_percentage: percentage,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
  } catch (error) {
    log.error('Error updating session progress:', error)
  }
}

/**
 * Start a new interview session for a category
 */
export async function startSession(
  userId: string,
  category: InterviewCategory
): Promise<InterviewSession | null> {
  try {
    // Fetch curated questions for this category
    const { data: questions, error: questionsError } = await supabase
      .from('interviewer_questions')
      .select('id')
      .eq('category', category)
      .eq('is_curated', true)
      .order('sort_order', { ascending: true })

    if (questionsError || !questions || questions.length === 0) {
      log.error('No curated questions found for category:', category)
      return null
    }

    const questionIds = questions.map(q => q.id)
    const meta = INTERVIEW_CATEGORY_META[category]

    // Count already answered questions
    const { count: answeredCount } = await supabase
      .from('interviewer_responses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('question_id', questionIds)

    const answered = answeredCount || 0
    const percentage = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0

    const { data: session, error: insertError } = await supabase
      .from('interviewer_sessions')
      .insert({
        user_id: userId,
        category,
        title: meta.label,
        icon: meta.icon,
        description: meta.description,
        question_ids: questionIds,
        total_questions: questions.length,
        answered_count: answered,
        completion_percentage: percentage,
        status: answered >= questions.length ? 'completed' : 'in_progress',
        cp_earned: answered * CP_PER_ANSWER,
      })
      .select()
      .single()

    if (insertError) {
      log.error('Error creating interview session:', insertError)
      return null
    }

    return session
  } catch (error) {
    log.error('Error in startSession:', error)
    return null
  }
}

/**
 * Get completion percentage per category
 */
export async function getCategoryCompletion(
  userId: string
): Promise<Record<InterviewCategory, { total: number; answered: number; percentage: number }>> {
  const categories: InterviewCategory[] = ['biografia', 'anamnese', 'censo', 'preferencias', 'conexoes', 'objetivos']

  const result = {} as Record<InterviewCategory, { total: number; answered: number; percentage: number }>

  try {
    for (const category of categories) {
      // Get total curated questions for this category
      const { count: totalCount } = await supabase
        .from('interviewer_questions')
        .select('id', { count: 'exact', head: true })
        .eq('category', category)
        .eq('is_curated', true)

      const total = totalCount || 0

      if (total === 0) {
        result[category] = { total: 0, answered: 0, percentage: 0 }
        continue
      }

      // Get question IDs for this category
      const { data: questions } = await supabase
        .from('interviewer_questions')
        .select('id')
        .eq('category', category)
        .eq('is_curated', true)

      const questionIds = (questions || []).map(q => q.id)

      // Count user's responses for those questions
      const { count: answeredCount } = await supabase
        .from('interviewer_responses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('question_id', questionIds)

      const answered = answeredCount || 0
      const percentage = total > 0 ? Math.round((answered / total) * 100) : 0

      result[category] = { total, answered, percentage }
    }

    return result
  } catch (error) {
    log.error('Error in getCategoryCompletion:', error)

    // Return empty results for all categories
    for (const category of categories) {
      result[category] = { total: 0, answered: 0, percentage: 0 }
    }
    return result
  }
}
