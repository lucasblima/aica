/**
 * WhatsApp Intent Types
 *
 * Privacy-first intent extraction types for Issue #91.
 * Messages are processed by LLM to extract semantic intent,
 * raw text is NEVER stored (WhatsApp ToS compliance).
 */

// =============================================================================
// INTENT CLASSIFICATION ENUMS
// =============================================================================

export type IntentCategory =
  | 'question'    // Asking for information
  | 'response'    // Answering/confirming
  | 'scheduling'  // Calendar/meeting related
  | 'document'    // File/document shared
  | 'audio'       // Voice message
  | 'social'      // Greetings, small talk
  | 'request'     // Asking for action
  | 'update'      // Status/progress info
  | 'media';      // Photo/video/sticker

export type IntentSentiment = 'positive' | 'neutral' | 'negative' | 'urgent';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// =============================================================================
// INTENT DATA STRUCTURES
// =============================================================================

/**
 * Extracted intent from a WhatsApp message
 * This is what gets stored instead of raw message text
 */
export interface MessageIntent {
  /** Human-readable summary in Portuguese (max 100 chars) */
  summary: string;
  /** Primary classification category */
  category: IntentCategory;
  /** Emotional tone of the message */
  sentiment: IntentSentiment;
  /** Urgency level 1-5 (1=low, 5=critical) */
  urgency: 1 | 2 | 3 | 4 | 5;
  /** Extracted topic keyword (max 50 chars) */
  topic?: string;
  /** Whether message requires user action */
  actionRequired: boolean;
  /** Mentioned date if scheduling detected */
  mentionedDate?: string;
  /** Mentioned time if scheduling detected */
  mentionedTime?: string;
  /** Type of media if applicable */
  mediaType?: 'image' | 'audio' | 'video' | 'document' | 'sticker';
  /** LLM confidence score 0-1 */
  confidence: number;
}

// =============================================================================
// DATABASE ROW TYPES
// =============================================================================

/**
 * WhatsApp message with extracted intent (database row)
 */
export interface WhatsAppMessageWithIntent {
  id: string;
  userId: string;
  contactId: string;
  direction: 'incoming' | 'outgoing';
  messageType: string;
  intentSummary: string;
  intentCategory: IntentCategory | null;
  intentSentiment: IntentSentiment;
  intentUrgency: number;
  intentTopic?: string;
  intentActionRequired: boolean;
  intentMentionedDate?: string;
  intentMentionedTime?: string;
  intentMediaType?: string;
  intentConfidence: number;
  processingStatus: ProcessingStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Contact with last intent preview (for contact cards)
 */
export interface ContactWithIntent {
  id: string;
  name: string | null;
  phone: string;
  profilePictureUrl?: string;
  lastIntentPreview?: string;
  lastIntentCategory?: IntentCategory;
  lastIntentSentiment?: IntentSentiment;
  lastIntentUrgency?: number;
  lastMessageAt?: string;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Request to extract-message-intent Edge Function
 */
export interface ExtractIntentRequest {
  messageId: string;
  rawText: string;
  mediaType?: string;
  contactName?: string;
  conversationContext?: string[];
}

/**
 * Response from extract-message-intent Edge Function
 */
export interface ExtractIntentResponse {
  success: boolean;
  intent?: MessageIntent;
  error?: string;
}

/**
 * Semantic search request
 */
export interface IntentSearchRequest {
  query: string;
  category?: IntentCategory;
  minUrgency?: number;
  limit?: number;
}

/**
 * Semantic search result
 */
export interface IntentSearchResult {
  messageId: string;
  contactId: string;
  intentSummary: string;
  intentCategory: IntentCategory;
  intentUrgency: number;
  similarity: number;
  createdAt: string;
}

// =============================================================================
// UI HELPER TYPES
// =============================================================================

/**
 * Icon mapping for intent categories
 */
export const INTENT_CATEGORY_ICONS: Record<IntentCategory, string> = {
  question: 'MessageCircleQuestion',
  response: 'MessageCircleReply',
  scheduling: 'Calendar',
  document: 'FileText',
  audio: 'Mic',
  social: 'Smile',
  request: 'ClipboardList',
  update: 'RefreshCw',
  media: 'Image',
};

/**
 * Color mapping for sentiment
 */
export const INTENT_SENTIMENT_COLORS: Record<IntentSentiment, string> = {
  positive: 'text-green-600',
  neutral: 'text-gray-600',
  negative: 'text-red-600',
  urgent: 'text-orange-600',
};

/**
 * Portuguese labels for categories
 */
export const INTENT_CATEGORY_LABELS: Record<IntentCategory, string> = {
  question: 'Pergunta',
  response: 'Resposta',
  scheduling: 'Agendamento',
  document: 'Documento',
  audio: 'Audio',
  social: 'Social',
  request: 'Solicitacao',
  update: 'Atualizacao',
  media: 'Midia',
};
