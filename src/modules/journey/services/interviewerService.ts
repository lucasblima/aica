/**
 * Interviewer Service
 * Manages structured interview sessions, questions, and responses
 * Phase 2: Delegates response processing to Edge Function for AI extraction + CP awards
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

/** Enriched response from process-interview-response Edge Function */
export interface ProcessedInterviewResponse {
  success: boolean
  response_id: string
  cp_earned: number
  cp_result: {
    success: boolean
    new_total: number
    level: number
    level_name: string
    leveled_up: boolean
  } | null
  insights_extracted: number
  processing_time_ms: number
}

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
 * Submit an interview response via Edge Function.
 * The Edge Function handles: save → memory routing → AI extraction → embedding → CP → session update
 * Falls back to local insert if Edge Function is unavailable.
 */
export async function submitInterviewResponse(
  userId: string,
  questionId: string,
  sessionId: string | null,
  answer: InterviewAnswer,
  answerText: string | null
): Promise<ProcessedInterviewResponse> {
  const fallbackResult: ProcessedInterviewResponse = {
    success: false,
    response_id: '',
    cp_earned: 0,
    cp_result: null,
    insights_extracted: 0,
    processing_time_ms: 0,
  }

  try {
    // Call the Edge Function — handles memory routing, AI extraction, embedding, CP award
    const { data, error: fnError } = await supabase.functions.invoke('process-interview-response', {
      body: {
        question_id: questionId,
        session_id: sessionId,
        answer,
        answer_text: answerText,
      },
    })

    if (fnError) {
      log.warn('Edge Function error, falling back to local insert:', fnError)
      return await submitInterviewResponseLocal(userId, questionId, sessionId, answer, answerText)
    }

    if (!data?.success) {
      log.warn('Edge Function returned error:', data?.error)
      return await submitInterviewResponseLocal(userId, questionId, sessionId, answer, answerText)
    }

    log.info('Response processed via Edge Function:', {
      response_id: data.response_id,
      cp_earned: data.cp_earned,
      insights: data.insights_extracted,
      time_ms: data.processing_time_ms,
    })

    return {
      success: true,
      response_id: data.response_id,
      cp_earned: data.cp_earned || CP_PER_ANSWER,
      cp_result: data.cp_result || null,
      insights_extracted: data.insights_extracted || 0,
      processing_time_ms: data.processing_time_ms || 0,
    }
  } catch (error) {
    log.error('Error calling Edge Function:', error)
    return await submitInterviewResponseLocal(userId, questionId, sessionId, answer, answerText)
  }
}

/**
 * Local fallback for submitting interview responses (Phase 1 behavior).
 * Used when the Edge Function is unavailable.
 */
async function submitInterviewResponseLocal(
  userId: string,
  questionId: string,
  sessionId: string | null,
  answer: InterviewAnswer,
  answerText: string | null
): Promise<ProcessedInterviewResponse> {
  try {
    const { data: insertData, error: insertError } = await supabase
      .from('interviewer_responses')
      .upsert({
        user_id: userId,
        session_id: sessionId,
        question_id: questionId,
        answer,
        answer_text: answerText,
        routed_to_memory: false,
        routed_modules: [],
        cp_earned: CP_PER_ANSWER,
      }, { onConflict: 'user_id,question_id' })
      .select('id')
      .single()

    if (insertError) {
      log.error('Error inserting interview response (local):', insertError)
      return { success: false, response_id: '', cp_earned: 0, cp_result: null, insights_extracted: 0, processing_time_ms: 0 }
    }

    // Route to user_memory locally
    const { data: question } = await supabase
      .from('interviewer_questions')
      .select('memory_mapping, target_modules')
      .eq('id', questionId)
      .single()

    if (question?.memory_mapping) {
      const mapping = question.memory_mapping as { category: string; key: string; module: string | null }

      const { error: memoryError } = await supabase
        .from('user_memory')
        .upsert({
          user_id: userId,
          category: mapping.category,
          key: mapping.key,
          value: answer,
          source: 'interview',
          module: mapping.module,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,category,key,module' })

      if (!memoryError) {
        await supabase
          .from('interviewer_responses')
          .update({ routed_to_memory: true, routed_modules: question.target_modules || [] })
          .eq('id', insertData.id)
      }
    }

    // Update session progress
    if (sessionId) {
      await updateSessionProgress(sessionId)
    }

    log.warn(
      'Local fallback used — CP recorded in response but NOT awarded via gamification system. ' +
      'CP will be reconciled when Edge Function is available again.',
      { response_id: insertData.id, cp_earned: CP_PER_ANSWER }
    )

    return {
      success: true,
      response_id: insertData.id,
      cp_earned: CP_PER_ANSWER,
      cp_result: null, // CP not actually awarded — Edge Function handles real CP award
      insights_extracted: 0,
      processing_time_ms: 0,
    }
  } catch (error) {
    log.error('Error in submitInterviewResponseLocal:', error)
    return { success: false, response_id: '', cp_earned: 0, cp_result: null, insights_extracted: 0, processing_time_ms: 0 }
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
  const categories: InterviewCategory[] = ['biografia', 'anamnese', 'censo', 'preferências', 'conexoes', 'objetivos']

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
    throw error // Re-throw so UI can show error state instead of silent 0/0
  }
}
