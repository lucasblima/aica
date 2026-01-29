/**
 * Question Generation Service
 * Handles AI-powered question generation via Edge Function
 *
 * Implements:
 * - Typed errors for better error handling
 * - Retry with exponential backoff
 * - Circuit breaker to prevent spam on failures
 * - Proper session validation
 */

import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import { QuestionCategory } from '../types/dailyQuestion'

const log = createNamespacedLogger('QuestionGenerationService')

// =============================================================================
// TYPED ERRORS (from API Integrations skill)
// =============================================================================

class EdgeFunctionError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'EdgeFunctionError'
  }

  isRetryable(): boolean {
    // Retry on server errors (5xx) and rate limit (429)
    return this.status >= 500 || this.status === 429
  }

  isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }

  static fromResponse(status: number, message: string): EdgeFunctionError {
    let code = 'UNKNOWN_ERROR'
    if (status === 401) code = 'UNAUTHORIZED'
    else if (status === 403) code = 'FORBIDDEN'
    else if (status === 429) code = 'RATE_LIMITED'
    else if (status >= 500) code = 'SERVER_ERROR'

    return new EdgeFunctionError(status, code, message)
  }
}

// =============================================================================
// CIRCUIT BREAKER (from API Integrations skill)
// =============================================================================

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failures: number = 0
  private lastFailureTime?: number
  private readonly failureThreshold: number
  private readonly resetTimeoutMs: number

  constructor(failureThreshold: number = 3, resetTimeoutMs: number = 60000) {
    this.failureThreshold = failureThreshold
    this.resetTimeoutMs = resetTimeoutMs
  }

  canExecute(): boolean {
    if (this.state === CircuitState.CLOSED) return true

    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN
        return true
      }
      return false
    }

    // HALF_OPEN - allow one attempt
    return true
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true
    return Date.now() - this.lastFailureTime >= this.resetTimeoutMs
  }

  onSuccess(): void {
    this.failures = 0
    this.state = CircuitState.CLOSED
  }

  onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.failureThreshold) {
      this.state = CircuitState.OPEN
      log.debug(`Circuit breaker OPEN after ${this.failures} failures`)
    }
  }

  getState(): CircuitState {
    return this.state
  }
}

// Singleton circuit breaker for Edge Function
const edgeFunctionCircuit = new CircuitBreaker(3, 60000) // 3 failures, 1 min reset

// =============================================================================
// RETRY LOGIC (from API Integrations skill)
// =============================================================================

interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  retryCondition?: (error: Error) => boolean
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 2,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    retryCondition = (err) => err instanceof EdgeFunctionError && err.isRetryable(),
  } = options

  let lastError: Error = new Error('Unknown error')

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Check if should retry
      if (!retryCondition(lastError)) {
        throw lastError
      }

      if (attempt < maxRetries) {
        // Calculate delay with jitter
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt) + Math.random() * 500,
          maxDelayMs
        )
        log.debug(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

// =============================================================================
// TYPES
// =============================================================================

export interface GenerationCheckResult {
  shouldGenerate: boolean
  unansweredCount: number
  totalAvailable: number
  hoursSinceLastGeneration: number
  dailyGenerationCount: number
}

export interface GenerationResult {
  success: boolean
  questionsGenerated: number
  questions: Array<{
    question_text: string
    category: QuestionCategory
    relevance_score: number
    context_factors: string[]
  }>
  contextUpdated: boolean
  processingTimeMs?: number
  error?: string
}

export interface UserContextBank {
  userId: string
  dominantEmotions: string[]
  recurringThemes: string[]
  mentionedAreas: string[]
  sentimentTrend: 'positive' | 'negative' | 'neutral' | 'volatile'
  totalResponses: number
  avgResponseLength: number
  engagementScore: number
  preferredCategories: QuestionCategory[]
  avoidedTopics: string[]
  lastGenerationAt: string | null
  generationCount: number
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  MIN_UNANSWERED_THRESHOLD: 3,
  EDGE_FUNCTION_URL: 'generate-questions',
  SESSION_VALIDATION_TIMEOUT_MS: 5000,
}

// =============================================================================
// SESSION VALIDATION
// =============================================================================

interface SessionValidation {
  isValid: boolean
  token?: string
  userId?: string
  error?: string
}

/**
 * Validate session and get fresh token
 * Returns token only if session is fully valid
 */
async function validateSession(): Promise<SessionValidation> {
  try {
    // First, validate with getUser() - this triggers token refresh if needed
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) {
      return { isValid: false, error: userError.message }
    }

    if (!userData.user) {
      return { isValid: false, error: 'No user in session' }
    }

    // Get the (potentially refreshed) session token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      return { isValid: false, error: sessionError.message }
    }

    const token = sessionData.session?.access_token
    if (!token) {
      return { isValid: false, error: 'No access token in session' }
    }

    return {
      isValid: true,
      token,
      userId: userData.user.id,
    }
  } catch (error) {
    return { isValid: false, error: (error as Error).message }
  }
}

// =============================================================================
// CHECK IF GENERATION NEEDED
// =============================================================================

/**
 * Check if the user needs new questions generated
 */
export async function checkShouldGenerateQuestions(
  userId: string
): Promise<GenerationCheckResult> {
  try {
    log.debug('Checking if generation needed for user', { userId })

    // Call the database function
    const { data, error } = await supabase
      .rpc('check_should_generate_questions', { p_user_id: userId })

    if (error) {
      log.debug('RPC check failed, using manual check:', error.message)
      return await checkManually(userId)
    }

    if (data && data.length > 0) {
      const result = data[0]
      log.debug('Generation check result:', result)

      return {
        shouldGenerate: result.should_generate,
        unansweredCount: result.unanswered_count,
        totalAvailable: result.total_available,
        hoursSinceLastGeneration: result.hours_since_last_generation,
        dailyGenerationCount: result.daily_generation_count,
      }
    }

    return await checkManually(userId)
  } catch (error) {
    log.debug('Error in checkShouldGenerateQuestions:', error)
    return {
      shouldGenerate: false,
      unansweredCount: 0,
      totalAvailable: 0,
      hoursSinceLastGeneration: 0,
      dailyGenerationCount: 0,
    }
  }
}

/**
 * Manual fallback check if RPC is not available
 */
async function checkManually(userId: string): Promise<GenerationCheckResult> {
  try {
    const { data: questions, error: qError } = await supabase
      .from('daily_questions')
      .select('id')
      .eq('active', true)
      .or(`user_id.is.null,user_id.eq.${userId}`)

    if (qError) throw qError

    const { data: responses, error: rError } = await supabase
      .from('question_responses')
      .select('question_id')
      .eq('user_id', userId)

    if (rError) throw rError

    const answeredIds = new Set(responses?.map(r => r.question_id) || [])
    const totalAvailable = questions?.length || 0
    const unansweredCount = questions?.filter(q => !answeredIds.has(q.id)).length || 0

    return {
      shouldGenerate: unansweredCount < CONFIG.MIN_UNANSWERED_THRESHOLD,
      unansweredCount,
      totalAvailable,
      hoursSinceLastGeneration: 999,
      dailyGenerationCount: 0,
    }
  } catch (error) {
    log.debug('Error in manual check:', error)
    return {
      shouldGenerate: false,
      unansweredCount: 0,
      totalAvailable: 0,
      hoursSinceLastGeneration: 0,
      dailyGenerationCount: 0,
    }
  }
}

// =============================================================================
// TRIGGER GENERATION (with retry and circuit breaker)
// =============================================================================

/**
 * Internal function to call Edge Function
 */
async function callEdgeFunction(
  token: string,
  options: {
    batchSize?: number
    categories?: QuestionCategory[]
    forceRegenerate?: boolean
  }
): Promise<GenerationResult> {
  const response = await supabase.functions.invoke(CONFIG.EDGE_FUNCTION_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      batch_size: options.batchSize || 5,
      categories: options.categories,
      force_regenerate: options.forceRegenerate || false,
    },
  })

  if (response.error) {
    const errorMsg = response.error.message || 'Generation failed'

    // Parse status from error message if available
    let status = 500
    if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) status = 401
    else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) status = 403
    else if (errorMsg.includes('429') || errorMsg.includes('rate')) status = 429

    throw EdgeFunctionError.fromResponse(status, errorMsg)
  }

  const result = response.data as GenerationResult

  return {
    success: result.success,
    questionsGenerated: result.questionsGenerated || (result as any).questions_generated || 0,
    questions: result.questions || [],
    contextUpdated: result.contextUpdated || (result as any).context_updated || false,
    processingTimeMs: result.processingTimeMs || (result as any).processing_time_ms,
    error: result.error,
  }
}

/**
 * Trigger question generation via Edge Function
 * Includes retry logic and circuit breaker
 */
export async function triggerQuestionGeneration(
  options?: {
    batchSize?: number
    categories?: QuestionCategory[]
    forceRegenerate?: boolean
  }
): Promise<GenerationResult> {
  // Check circuit breaker first
  if (!edgeFunctionCircuit.canExecute()) {
    log.debug('Circuit breaker is OPEN, skipping generation')
    return {
      success: false,
      questionsGenerated: 0,
      questions: [],
      contextUpdated: false,
      error: 'Service temporarily unavailable (circuit breaker open)',
    }
  }

  try {
    log.info('Triggering question generation', options)

    // Validate session
    const session = await validateSession()
    if (!session.isValid || !session.token) {
      log.debug('Session not valid for generation:', session.error)
      return {
        success: false,
        questionsGenerated: 0,
        questions: [],
        contextUpdated: false,
        error: 'Session not valid',
      }
    }

    // Call with retry (only for retryable errors like 5xx)
    const result = await withRetry(
      () => callEdgeFunction(session.token!, options || {}),
      {
        maxRetries: 2,
        baseDelayMs: 1000,
        retryCondition: (err) => {
          if (err instanceof EdgeFunctionError) {
            // Only retry server errors, not auth errors
            return err.isRetryable() && !err.isAuthError()
          }
          return false
        },
      }
    )

    // Success - reset circuit breaker
    edgeFunctionCircuit.onSuccess()

    log.info('Generation completed', {
      questionsGenerated: result.questionsGenerated,
      success: result.success,
    })

    return result
  } catch (error) {
    const err = error as Error

    // Record failure in circuit breaker
    edgeFunctionCircuit.onFailure()

    // Handle typed errors
    if (err instanceof EdgeFunctionError) {
      if (err.isAuthError()) {
        log.debug('Generation skipped due to auth error:', err.message)
      } else {
        log.warn('Edge function error:', err.code, err.message)
      }
    } else {
      log.debug('Generation failed:', err.message)
    }

    return {
      success: false,
      questionsGenerated: 0,
      questions: [],
      contextUpdated: false,
      error: err.message,
    }
  }
}

// =============================================================================
// CONTEXT BANK
// =============================================================================

/**
 * Get user's context bank
 */
export async function getUserContextBank(userId: string): Promise<UserContextBank | null> {
  try {
    const { data, error } = await supabase
      .from('user_question_context_bank')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return {
      userId: data.user_id,
      dominantEmotions: data.dominant_emotions || [],
      recurringThemes: data.recurring_themes || [],
      mentionedAreas: data.mentioned_areas || [],
      sentimentTrend: data.sentiment_trend || 'neutral',
      totalResponses: data.total_responses || 0,
      avgResponseLength: data.avg_response_length || 0,
      engagementScore: data.engagement_score || 0.5,
      preferredCategories: data.preferred_categories || [],
      avoidedTopics: data.avoided_topics || [],
      lastGenerationAt: data.last_generation_at,
      generationCount: data.generation_count || 0,
    }
  } catch (error) {
    log.debug('Error fetching context bank:', error)
    return null
  }
}

/**
 * Update user context bank with new themes/emotions
 */
export async function updateUserContext(
  userId: string,
  updates: Partial<{
    dominantEmotions: string[]
    recurringThemes: string[]
    avoidedTopics: string[]
  }>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_question_context_bank')
      .upsert({
        user_id: userId,
        ...(updates.dominantEmotions && { dominant_emotions: updates.dominantEmotions }),
        ...(updates.recurringThemes && { recurring_themes: updates.recurringThemes }),
        ...(updates.avoidedTopics && { avoided_topics: updates.avoidedTopics }),
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (error) throw error

    log.debug('Context bank updated', { userId })
    return true
  } catch (error) {
    log.debug('Error updating context bank:', error)
    return false
  }
}

// =============================================================================
// AUTO-GENERATION HELPER
// =============================================================================

/**
 * Check and trigger generation if needed (non-blocking)
 * Returns true if generation was triggered
 */
export async function checkAndTriggerGenerationIfNeeded(
  userId: string
): Promise<boolean> {
  try {
    // First validate session before doing anything
    const session = await validateSession()
    if (!session.isValid) {
      log.debug('Skipping generation - session not valid:', session.error)
      return false
    }

    // Check circuit breaker
    if (!edgeFunctionCircuit.canExecute()) {
      log.debug('Skipping generation - circuit breaker open')
      return false
    }

    const check = await checkShouldGenerateQuestions(userId)

    if (check.shouldGenerate) {
      log.info('Auto-triggering question generation', {
        userId,
        unansweredCount: check.unansweredCount,
      })

      // Trigger in background (don't await)
      triggerQuestionGeneration({ batchSize: 5 }).catch(() => {
        // Errors already logged in triggerQuestionGeneration
      })

      return true
    }

    return false
  } catch (error) {
    log.debug('Error in checkAndTriggerGenerationIfNeeded:', error)
    return false
  }
}

// =============================================================================
// EXPORTS FOR TESTING
// =============================================================================

export const __testing = {
  EdgeFunctionError,
  CircuitBreaker,
  edgeFunctionCircuit,
  validateSession,
  withRetry,
}
