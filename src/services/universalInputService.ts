/**
 * Universal Input Service
 *
 * Frontend service for the Universal Input Funnel (Issue #211).
 * Wraps the `extract-intent` Edge Function for non-WhatsApp sources.
 *
 * Supports text, audio transcriptions, OCR output, and document extracts.
 * Returns intent classification + embedding for caller to store.
 *
 * PRIVACY: rawText is sent to the Edge Function but NEVER stored — only
 * the intent summary (max 100 chars) and embedding vector are persisted.
 */

import { supabase } from './supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('UniversalInputService');

// =============================================================================
// TYPES
// =============================================================================

/** Input sources supported by the Universal Input Funnel */
export type InputSource = 'web_chat' | 'journey' | 'voice' | 'flux';

/** Content type classification */
export type ContentType = 'text' | 'audio_transcription' | 'ocr' | 'document_extract';

/** Intent categories (matches Edge Function / DB enum) */
export type IntentCategory =
  | 'question'
  | 'response'
  | 'scheduling'
  | 'document'
  | 'audio'
  | 'social'
  | 'request'
  | 'update'
  | 'media';

/** Sentiment classification */
export type IntentSentiment = 'positive' | 'neutral' | 'negative' | 'urgent';

/** Request parameters for extractIntent */
export interface UniversalInputRequest {
  /** Raw text content to analyze (will be discarded after processing) */
  rawText: string;
  /** Input source — determines prompt context */
  source: InputSource;
  /** Content type — how the text was produced */
  content_type?: ContentType;
  /** Which module originated the request (for usage tracking) */
  moduleContext?: string;
  /** Optional contact name for context */
  contactName?: string;
  /** Optional conversation context (last N messages) */
  conversationContext?: string[];
}

/** Extracted intent result from the Edge Function */
export interface IntentResult {
  /** Human-readable intent summary in Portuguese (max 100 chars) */
  summary: string;
  /** Message category classification */
  category: IntentCategory;
  /** Sentiment analysis */
  sentiment: IntentSentiment;
  /** Urgency score (1-5, 5 = critical) */
  urgency: number;
  /** Main topic keyword (max 50 chars) */
  topic?: string;
  /** Whether the user needs to take action */
  actionRequired: boolean;
  /** Mentioned date in YYYY-MM-DD format */
  mentionedDate?: string;
  /** Mentioned time in HH:mm format */
  mentionedTime?: string;
  /** Confidence score (0.0-1.0) */
  confidence: number;
}

/** Full response from extractIntent */
export interface UniversalInputResponse {
  success: boolean;
  /** Extracted intent (present when success=true) */
  intent?: IntentResult;
  /** 768-dimensional embedding vector (for semantic search) */
  embedding?: number[];
  /** Echo of the input source */
  source?: InputSource;
  /** Error message (present when success=false) */
  error?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Normalize raw input text for intent extraction.
 * Trims whitespace and enforces a reasonable length limit.
 * For Phase 1, this is a simple text passthrough — audio/image
 * preprocessing will be added in Phase 2.
 */
export function normalizeInput(text: string): string {
  const trimmed = text.trim();
  // Limit to 5000 chars to avoid excessive token usage
  if (trimmed.length > 5000) {
    log.warn('Input text truncated from', { original: trimmed.length, truncated: 5000 });
    return trimmed.slice(0, 5000);
  }
  return trimmed;
}

// =============================================================================
// MAIN SERVICE
// =============================================================================

/**
 * Extract intent from arbitrary text input via the extract-intent Edge Function.
 *
 * This calls the universal (non-WhatsApp) path which:
 * - Does NOT write to whatsapp_messages
 * - Returns the embedding vector for caller to store
 * - Tracks usage via log_interaction RPC
 *
 * @example
 * ```typescript
 * const result = await extractIntent({
 *   rawText: 'Hoje percebi que estou mais calmo em reunioes',
 *   source: 'journey',
 *   moduleContext: 'journey',
 * });
 * if (result.success && result.intent) {
 *   console.log(result.intent.summary); // "Reflexao sobre comportamento em reunioes"
 * }
 * ```
 */
export async function extractIntent(
  params: UniversalInputRequest
): Promise<UniversalInputResponse> {
  try {
    // Get current user for userId param
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      log.error('No authenticated user for intent extraction');
      return { success: false, error: 'Authentication required' };
    }

    const normalizedText = normalizeInput(params.rawText);
    if (!normalizedText) {
      return { success: false, error: 'Empty input text' };
    }

    log.debug('Extracting intent', {
      source: params.source,
      content_type: params.content_type || 'text',
      textLength: normalizedText.length,
    });

    const { data, error } = await supabase.functions.invoke('extract-intent', {
      body: {
        rawText: normalizedText,
        source: params.source,
        content_type: params.content_type || 'text',
        userId: user.id,
        moduleContext: params.moduleContext,
        contactName: params.contactName,
        conversationContext: params.conversationContext,
      },
    });

    if (error) {
      log.error('Edge Function invocation failed', { error: error.message });
      return { success: false, error: error.message };
    }

    // Edge Function returns JSON directly
    const response = data as UniversalInputResponse;

    if (!response.success) {
      log.warn('Intent extraction returned failure', { error: response.error });
      return response;
    }

    log.debug('Intent extracted successfully', {
      category: response.intent?.category,
      confidence: response.intent?.confidence,
      hasEmbedding: !!response.embedding?.length,
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('Unexpected error in extractIntent', { error: message });
    return { success: false, error: message };
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export const universalInputService = {
  extractIntent,
  normalizeInput,
};

export default universalInputService;
