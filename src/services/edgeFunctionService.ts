/**
 * Edge Function Service
 *
 * Centralized service for calling Supabase Edge Functions (gemini-chat)
 * Replaces direct Gemini API calls from frontend with secure backend calls
 */

import { supabase } from './supabaseClient'

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
): Promise<T> {
  try {
    const body: EdgeFunctionRequest = {
      action,
      payload,
      ...(model && { model }),
    }

    const { data, error } = await supabase.functions.invoke('gemini-chat', {
      body,
    })

    if (error) {
      console.error(`[EdgeFunction] Error calling action "${action}":`, error)
      throw new Error(`Edge Function error: ${error.message || 'Unknown error'}`)
    }

    if (!data) {
      throw new Error('Edge Function returned no data')
    }

    const response = data as EdgeFunctionResponse<T>

    if (!response.success) {
      throw new Error('Edge Function returned success: false')
    }

    console.log(`[EdgeFunction] Action "${action}" completed in ${response.latencyMs || 0}ms`)

    return response.result
  } catch (error) {
    console.error(`[EdgeFunction] Failed to call action "${action}":`, error)
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
