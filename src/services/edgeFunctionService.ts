/**
 * Edge Function Service
 *
 * Centralized service for calling ALL Supabase Edge Functions.
 * Provides unified error handling, retry logic, and type-safe wrappers.
 *
 * Supported Edge Functions:
 * - gemini-chat: AI operations (Gemini API)
 * - send-guest-approval-link: Podcast guest approval notifications
 */

import { supabase } from './supabaseClient'
import { getCachedSession, invalidateAuthCache } from './authCacheService'
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('EdgeFunctionService');


// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Options for Edge Function invocation
 */
export interface EdgeFunctionOptions {
  retryCount?: number
  timeoutMs?: number
  logContext?: Record<string, string>
}

/**
 * Base interface for Edge Function requests
 */
interface EdgeFunctionRequest {
  action: string
  payload: Record<string, any>
  model?: 'fast' | 'smart'
}

/**
 * Base interface for Edge Function responses
 */
interface EdgeFunctionResponse<T = any> {
  result: T
  success: boolean
  latencyMs?: number
  cached?: boolean
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
}

// ============================================================================
// GUEST APPROVAL TYPES
// ============================================================================

export interface GuestApprovalRequest {
  episodeId: string
  guestName: string
  guestEmail?: string
  guestPhone?: string
  approvalUrl: string
  method: 'email' | 'whatsapp'
}

export interface GuestApprovalResponse {
  success: boolean
  message?: string
  error?: string
}

// ============================================================================
// CORE HELPER: RETRY WITH EXPONENTIAL BACKOFF
// ============================================================================

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt)
        log.debug(`[EdgeFunction] Retry ${attempt + 1}/${maxRetries} after ${delayMs}ms`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }

  throw lastError
}

// ============================================================================
// CORE HELPER: INVOKE EDGE FUNCTION
// ============================================================================

/**
 * Generic Edge Function invoker with unified error handling
 *
 * Note: Explicitly gets the access token and passes it in headers
 * to work around Supabase gateway issues with verify_jwt
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, any>,
  options: EdgeFunctionOptions = {}
): Promise<T> {
  const { retryCount = 0, logContext = {} } = options

  const invokeFn = async () => {
    const startTime = Date.now()

    // Get the current session using cached version to avoid auth lock contention
    const { session, error: sessionError } = await getCachedSession()

    if (sessionError) {
      log.error(`[EdgeFunction] Session error:`, sessionError)
      throw new Error('Authentication error: Could not get session')
    }

    if (!session?.access_token) {
      log.error(`[EdgeFunction] No active session for ${functionName}`)
      throw new Error('Authentication required: Please log in again')
    }

    log.debug(`[EdgeFunction] Calling ${functionName} with token`, {
      ...logContext,
      hasToken: !!session.access_token,
      tokenPrefix: session.access_token.substring(0, 20) + '...',
    })

    // Explicitly pass the Authorization header
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })
    const latencyMs = Date.now() - startTime

    if (error) {
      log.error(`[EdgeFunction] ${functionName} error:`, {
        ...logContext,
        error: error.message,
        latencyMs,
      })
      throw new Error(`Edge Function error: ${error.message || 'Unknown error'}`)
    }

    log.debug(`[EdgeFunction] ${functionName} completed in ${latencyMs}ms`, logContext)
    return data as T
  }

  if (retryCount > 0) {
    return retryWithBackoff(invokeFn, retryCount)
  }

  return invokeFn()
}

/**
 * Call the gemini-chat Edge Function with specified action and payload
 *
 * @param action - The action to perform (e.g., 'generate_field_content', 'analyze_edital_structure')
 * @param payload - Action-specific payload
 * @param model - Optional model selection ('fast' or 'smart')
 * @returns Result from the Edge Function
 * @throws Error if the Edge Function call fails
 */
export async function callGeminiEdgeFunction<T = any>(
  action: string,
  payload: Record<string, any>,
  model?: 'fast' | 'smart'
): Promise<T & { __usageMetadata?: EdgeFunctionResponse['usageMetadata'] }> {
  try {
    const body: EdgeFunctionRequest = {
      action,
      payload,
      ...(model && { model }),
    }

    // Get the current session using cached version to avoid auth lock contention
    const { session, error: sessionError } = await getCachedSession()

    if (sessionError) {
      log.error(`[EdgeFunction] Session error for action "${action}":`, sessionError)
      throw new Error('Authentication error: Could not get session')
    }

    if (!session?.access_token) {
      log.error(`[EdgeFunction] No active session for action "${action}"`)
      throw new Error('Authentication required: Please log in again')
    }

    // Explicitly pass the Authorization header (matches invokeEdgeFunction pattern)
    const { data, error } = await supabase.functions.invoke('gemini-chat', {
      body,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

    if (error) {
      // Detect auth errors (actual 401) — retry once with fresh session
      // FunctionsHttpError can be any non-2xx (500, 502, etc.) — only retry on 401
      const isAuthError = error.message?.includes('401')
        || (error.name === 'FunctionsHttpError' && (error as any).context?.status === 401);

      if (isAuthError) {
        log.warn(`[EdgeFunction] Auth error for action "${action}", retrying with fresh session`);
        invalidateAuthCache();

        const { data: freshData } = await supabase.auth.getSession();
        if (freshData.session?.access_token) {
          const { data: retryData, error: retryError } = await supabase.functions.invoke('gemini-chat', {
            body,
            headers: {
              Authorization: `Bearer ${freshData.session.access_token}`
            }
          });

          if (retryError) {
            log.error(`[EdgeFunction] Retry failed for action "${action}":`, { error: retryError });
            throw new Error(`Edge Function error: ${retryError.message || 'Unknown error'}`);
          }

          if (!retryData || !(retryData as EdgeFunctionResponse).success) {
            throw new Error('Edge Function returned no data or success: false after retry');
          }

          const retryResponse = retryData as EdgeFunctionResponse<T>;
          return {
            ...retryResponse.result,
            ...(retryResponse.usageMetadata && { __usageMetadata: retryResponse.usageMetadata })
          } as T & { __usageMetadata?: EdgeFunctionResponse['usageMetadata'] };
        }
      }

      log.error(`[EdgeFunction] Error calling action "${action}":`, { error });
      throw new Error(`Edge Function error: ${error.message || 'Unknown error'}`);
    }

    if (!data) {
      throw new Error('Edge Function returned no data')
    }

    const response = data as EdgeFunctionResponse<T>

    if (!response.success) {
      throw new Error('Edge Function returned success: false')
    }

    log.debug(`[EdgeFunction] Action "${action}" completed in ${response.latencyMs || 0}ms`, {
      ...(response.usageMetadata && {
        tokens: {
          input: response.usageMetadata.promptTokenCount,
          output: response.usageMetadata.candidatesTokenCount,
          total: response.usageMetadata.totalTokenCount
        }
      })
    })

    // Return result with usageMetadata attached
    return {
      ...response.result,
      ...(response.usageMetadata && { __usageMetadata: response.usageMetadata })
    } as T & { __usageMetadata?: EdgeFunctionResponse['usageMetadata'] }
  } catch (error) {
    log.error(`[EdgeFunction] Failed to call action "${action}":`, { error: error })
    throw error instanceof Error
      ? error
      : new Error('Unknown error calling Edge Function')
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS FOR SPECIFIC ACTIONS
// ============================================================================

/**
 * Generate field content for grants module
 */
export async function generateFieldContent(payload: {
  edital_text: string
  evaluation_criteria: Array<{
    name: string
    description: string
    weight: number
    min_score: number
    max_score: number
  }>
  field_config: {
    id: string
    label: string
    max_chars: number
    required: boolean
    ai_prompt_hint?: string
  }
  briefing: Record<string, string>
  previous_responses?: Record<string, string>
  source_document_content?: string | null
  edital_text_content?: string | null
  opportunity_documents_content?: string | null
  project_id?: string
}): Promise<{ generatedText: string }> {
  return callGeminiEdgeFunction('generate_field_content', payload)
}

/**
 * Analyze edital structure
 */
export async function analyzeEditalStructure(payload: {
  editalText: string
}): Promise<any> {
  return callGeminiEdgeFunction('analyze_edital_structure', payload, 'smart')
}

/**
 * Parse form fields from text
 */
export async function parseFormFields(payload: {
  text: string
}): Promise<{ fields: Array<{
  id: string
  label: string
  max_chars: number
  required: boolean
  ai_prompt_hint: string
  placeholder: string
}> }> {
  return callGeminiEdgeFunction('parse_form_fields', payload)
}

/**
 * Generate auto briefing
 */
export async function generateAutoBriefing(payload: {
  companyName?: string
  projectIdea?: string
  editalTitle?: string
  editalText?: string
  sourceDocumentContent?: string | null
  formFields?: Array<{
    id: string
    label: string
    max_chars: number
    required: boolean
    ai_prompt_hint?: string
  }>
}): Promise<{ briefing: Record<string, string> }> {
  return callGeminiEdgeFunction('generate_auto_briefing', payload, 'smart')
}

/**
 * Improve briefing field
 */
export async function improveBriefingField(payload: {
  fieldId: string
  currentContent: string
  allBriefing: Record<string, string>
}): Promise<{ improvedText: string }> {
  return callGeminiEdgeFunction('improve_briefing_field', payload)
}

/**
 * Extract required documents from edital
 */
export async function extractRequiredDocuments(payload: {
  pdfContent: string
}): Promise<{ documents: Array<{ name: string; description?: string; dueDate?: string }> }> {
  return callGeminiEdgeFunction('extract_required_documents', payload)
}

/**
 * Extract timeline phases from edital
 */
export async function extractTimelinePhases(payload: {
  pdfContent: string
}): Promise<{ phases: Array<{ name: string; description?: string; date: string }> }> {
  return callGeminiEdgeFunction('extract_timeline_phases', payload)
}

/**
 * Parse bank statement with AI
 */
export async function parseStatement(payload: {
  rawText: string
}): Promise<any> {
  return callGeminiEdgeFunction('parse_statement', payload)
}

/**
 * Generate daily question for Journey module
 */
export async function generateDailyQuestion(payload: {
  userContext: {
    healthStatus: {
      burnoutCount: number
      mentalHealthFlags: string[]
      energyLevel?: number
    }
    criticalAreas: Array<{
      areaId: string
      areaName: string
      severity: 'low' | 'medium' | 'high'
      isBlocking: boolean
    }>
    activeJourneys: Array<{
      areaId: string
      journeyType: string
      completionPercentage: number
    }>
    recentResponses: Array<{
      questionText: string
      answer: string
      date: string
    }>
  }
  systemPrompt: string
  contextSummary: string
}): Promise<{
  question: string
  category: 'reflection' | 'gratitude' | 'energy' | 'learning' | 'change'
  relevance: 'high' | 'medium' | 'low'
  contextFactors: string[]
} | string> {
  return callGeminiEdgeFunction('generate_daily_question', payload)
}

/**
 * Research guest for podcast module
 */
export async function researchGuest(payload: {
  guest_name: string
  reference?: string
  prompt?: string
  system_instruction?: string
}): Promise<{
  name: string
  title: string
  biography: string
  recent_facts: string[]
  topics_of_interest: string[]
  controversies?: string[]
  image_url?: string
  is_reliable: boolean
  confidence_score: number
  researched_at: string
}> {
  return callGeminiEdgeFunction('research_guest', payload, 'smart')
}

// ============================================================================
// GUEST APPROVAL FUNCTIONS (send-guest-approval-link)
// ============================================================================

/**
 * Send guest approval link via email or WhatsApp
 */
export async function sendGuestApprovalLink(
  request: GuestApprovalRequest
): Promise<GuestApprovalResponse> {
  return invokeEdgeFunction<GuestApprovalResponse>('send-guest-approval-link', {
    episodeId: request.episodeId,
    guestName: request.guestName,
    guestEmail: request.guestEmail,
    guestPhone: request.guestPhone,
    approvalUrl: request.approvalUrl,
    method: request.method,
  }, {
    logContext: { action: 'send_approval_link', method: request.method },
  })
}

// ============================================================================
// PROCESS EDITAL FUNCTIONS (process-edital)
// ============================================================================

/**
 * Evaluation criterion extracted from edital
 */
export interface EditalEvaluationCriterion {
  name: string
  description?: string
  weight?: number
  max_score?: number
}

/**
 * Form field extracted from edital
 */
export interface EditalFormField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file'
  required: boolean
  description?: string
  max_length?: number
  options?: string[]
}

/**
 * Analyzed data extracted from edital PDF
 */
export interface AnalyzedEditalData {
  title: string
  funding_agency: string
  program_name?: string
  edital_number?: string
  submission_deadline: string
  submission_start?: string
  result_date?: string
  min_funding?: number
  max_funding?: number
  counterpart_percentage?: number
  eligible_themes: string[]
  eligibility_requirements: string[]
  evaluation_criteria: EditalEvaluationCriterion[]
  form_fields: EditalFormField[]
  external_system_url?: string
  raw_text_preview?: string
}

/**
 * Response from process-edital Edge Function
 */
export interface ProcessEditalResponse {
  success: boolean
  gemini_file_name: string
  file_search_document_id: string
  analyzed_data: AnalyzedEditalData
  processing_time_ms: number
  error?: string
}

/**
 * Helper function to convert File to base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Process an edital PDF using Google File Search as single source.
 *
 * This function:
 * 1. Converts the PDF to base64
 * 2. Uploads to Google Files API for indexing
 * 3. Extracts structured data using Gemini
 * 4. Returns gemini_file_name for semantic search + analyzed data for form population
 *
 * @param file - The PDF file to process
 * @returns ProcessEditalResponse with gemini_file_name, document_id, and analyzed_data
 */
export async function processEdital(file: File): Promise<ProcessEditalResponse> {
  log.info('Processing edital PDF', { fileName: file.name, fileSize: file.size })

  const base64Data = await fileToBase64(file)

  const response = await invokeEdgeFunction<ProcessEditalResponse>('process-edital', {
    file_data: base64Data,
    file_name: file.name,
    file_size: file.size,
  }, {
    retryCount: 1, // Retry once on failure
    logContext: { action: 'process_edital', fileName: file.name },
  })

  if (!response.success) {
    throw new Error(response.error || 'Failed to process edital')
  }

  log.info('Edital processed successfully', {
    documentId: response.file_search_document_id,
    processingTimeMs: response.processing_time_ms,
    title: response.analyzed_data.title,
  })

  return response
}

/**
 * Re-process an existing edital document using its Google File reference.
 * Skips upload — goes straight to Gemini extraction from the existing file.
 *
 * Use this when a document is already in file_search_documents but no
 * grant_opportunity was created yet.
 */
export async function reprocessEdital(
  geminiFileName: string,
  documentId: string,
  originalFilename: string
): Promise<ProcessEditalResponse> {
  log.info('Re-processing existing edital', { geminiFileName, documentId, originalFilename })

  const response = await invokeEdgeFunction<ProcessEditalResponse>('process-edital', {
    reprocess_gemini_file_name: geminiFileName,
    existing_document_id: documentId,
    file_name: originalFilename,
  }, {
    retryCount: 1,
    logContext: { action: 'reprocess_edital', geminiFileName },
  })

  if (!response.success) {
    throw new Error(response.error || 'Failed to reprocess edital')
  }

  log.info('Edital re-processed successfully', {
    documentId: response.file_search_document_id,
    processingTimeMs: response.processing_time_ms,
    title: response.analyzed_data.title,
  })

  return response
}
