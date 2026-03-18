/**
 * Shared Gemini initialization helpers.
 *
 * Extracted from gemini-chat/index.ts to be reusable across Edge Functions.
 * Contains model constants, GenAI factory, date context builder, and JWT user extraction.
 */

import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

export const MODELS = {
  fast: 'gemini-2.5-flash',
  smart: 'gemini-2.5-pro',
} as const

export type ModelKey = keyof typeof MODELS

export const SMART_MODEL_ACTIONS = [
  'generate_weekly_summary',
  'generate_dossier',
  'deep_research',
  'generate_ice_breakers',
  'generate_pauta_questions',
  'generate_pauta_outline',
  'analyze_edital_structure',
  'generate_auto_briefing',
  'research_guest',
] as const

// ============================================================================
// GENAI FACTORY
// ============================================================================

/**
 * Create a GoogleGenerativeAI instance from GEMINI_API_KEY env var.
 * Throws if the key is not set.
 */
export function getGenAI(): GoogleGenerativeAI {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')
  return new GoogleGenerativeAI(apiKey)
}

/**
 * Get a configured GenerativeModel with sensible defaults.
 *
 * Default generationConfig:
 * - temperature: 0.3, topP: 0.9, topK: 40, maxOutputTokens: 4096
 *
 * maxOutputTokens defaults to 4096 because Gemini 2.5 Flash counts thinking
 * tokens against maxOutputTokens — lower values cause truncated JSON output.
 */
export function getModel(
  genAI: GoogleGenerativeAI,
  model: ModelKey,
  config?: { temperature?: number; topP?: number; topK?: number; maxOutputTokens?: number }
) {
  return genAI.getGenerativeModel({
    model: MODELS[model],
    generationConfig: {
      temperature: config?.temperature ?? 0.3,
      topP: config?.topP ?? 0.9,
      topK: config?.topK ?? 40,
      maxOutputTokens: config?.maxOutputTokens ?? 4096,
    },
  })
}

// ============================================================================
// DATE CONTEXT (Portuguese / BRT)
// ============================================================================

/**
 * Build date context for system prompts.
 * Returns today, day of week (pt-BR), tomorrow, and current time in BRT.
 *
 * This pattern was repeated 4 times in gemini-chat/index.ts.
 */
export function getDateContext(): {
  today: string
  dayOfWeek: string
  tomorrow: string
  timeStr: string
} {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const dayOfWeek = [
    'domingo', 'segunda-feira', 'terca-feira', 'quarta-feira',
    'quinta-feira', 'sexta-feira', 'sabado',
  ][now.getDay()]
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0]
  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
  return { today, dayOfWeek, tomorrow, timeStr }
}

// ============================================================================
// JWT USER ID EXTRACTION
// ============================================================================

/**
 * Best-effort extraction of user ID (sub claim) from the Authorization header JWT.
 * Does NOT verify the token — service-role RPCs handle authorization.
 * Returns null if extraction fails for any reason (missing header, malformed token, etc.).
 */
export function extractUserId(req: Request): string | null {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return null
    const token = authHeader.replace('Bearer ', '')
    const payloadB64 = token.split('.')[1]
    if (!payloadB64) return null
    const decoded = JSON.parse(atob(payloadB64))
    return decoded.sub || null
  } catch {
    return null
  }
}
