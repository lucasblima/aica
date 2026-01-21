/**
 * Contact Search Service
 * Issue #145: Semantic Search for Contacts and Conversations
 *
 * Frontend service for semantic contact search using AI embeddings.
 * Provides natural language search capabilities for finding contacts
 * by relationship context, topics, and conversation history.
 */

import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('ContactSearchService');


// ============================================================================
// TYPES
// ============================================================================

export interface ContactSearchResult {
  /** Contact phone number (identifier) */
  contact_phone: string
  /** Contact display name */
  contact_name: string
  /** Similarity score (0-1, higher is better) */
  similarity: number
  /** Type of embedding that matched */
  embedding_type: 'profile' | 'conversation_summary' | 'action_items' | 'keyword'
  /** AI-calculated relationship score */
  relationship_score: number | null
  /** Last message timestamp */
  last_message_at: string | null
  /** Topics detected in conversations */
  detected_topics: string[] | null
  /** AI-generated conversation summary */
  conversation_summary: string | null
  /** Source of the match */
  match_source: 'semantic' | 'keyword'
}

export interface ContactSearchOptions {
  /** Maximum number of results (default: 10, max: 50) */
  limit?: number
  /** Minimum similarity threshold (default: 0.6) */
  threshold?: number
  /** Include keyword search fallback (default: true) */
  includeKeywordSearch?: boolean
  /** Embedding types to search (default: ['profile', 'conversation_summary']) */
  embeddingTypes?: ('profile' | 'conversation_summary' | 'action_items' | 'topics')[]
}

export interface ContactSearchResponse {
  /** Whether the search succeeded */
  success: boolean
  /** Search results */
  results: ContactSearchResult[]
  /** Original query */
  query: string
  /** Total number of results */
  total_results: number
  /** Error message if failed */
  error?: string
}

export interface ContactInsight {
  id: string
  user_id: string
  contact_phone: string
  period_start: string
  period_end: string
  sentiment_summary: {
    avg_score: number
    trend: 'ascending' | 'stable' | 'descending'
    dominant_label: 'positive' | 'neutral' | 'negative'
  }
  detected_topics: string[]
  action_items: string[]
  conversation_summary: string
  relationship_indicators: {
    responsiveness: number
    engagement: number
    formality: 'formal' | 'casual' | 'mixed'
  }
  messages_analyzed: number
  processed_at: string
}

export interface AIPipelineStats {
  processing_date: string
  total_insights: number
  users_processed: number
  contacts_processed: number
  total_messages_analyzed: number
  avg_processing_time_ms: number
  failed_insights: number
}

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search contacts using natural language queries
 *
 * @example
 * // Find contacts who discussed AI
 * const results = await searchContacts("people interested in AI and machine learning")
 *
 * @example
 * // Find contacts with pending action items
 * const results = await searchContacts("contacts I need to follow up with", {
 *   embeddingTypes: ['action_items']
 * })
 */
export async function searchContacts(
  query: string,
  options?: ContactSearchOptions
): Promise<ContactSearchResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('search-contacts', {
      body: {
        query,
        limit: options?.limit ?? 10,
        threshold: options?.threshold ?? 0.6,
        include_keyword_search: options?.includeKeywordSearch ?? true,
        embedding_types: options?.embeddingTypes ?? ['profile', 'conversation_summary'],
      },
    })

    if (error) {
      log.error('[contactSearchService] searchContacts error:', { error: error })
      return {
        success: false,
        results: [],
        query,
        total_results: 0,
        error: error.message,
      }
    }

    return data as ContactSearchResponse
  } catch (err) {
    const error = err as Error
    log.error('[contactSearchService] searchContacts exception:', { error: error })
    return {
      success: false,
      results: [],
      query,
      total_results: 0,
      error: error.message,
    }
  }
}

// ============================================================================
// INSIGHT FUNCTIONS
// ============================================================================

/**
 * Get AI insights for a specific contact
 */
export async function getContactInsights(
  contactPhone: string,
  limit = 10
): Promise<ContactInsight[]> {
  const { data, error } = await supabase
    .from('contact_insights')
    .select('*')
    .eq('contact_phone', contactPhone)
    .order('period_end', { ascending: false })
    .limit(limit)

  if (error) {
    log.error('[contactSearchService] getContactInsights error:', { error: error })
    throw error
  }

  return data as ContactInsight[]
}

/**
 * Get latest insight for a contact
 */
export async function getLatestContactInsight(
  contactPhone: string
): Promise<ContactInsight | null> {
  const { data, error } = await supabase
    .from('contact_insights')
    .select('*')
    .eq('contact_phone', contactPhone)
    .order('period_end', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    log.error('[contactSearchService] getLatestContactInsight error:', { error: error })
    throw error
  }

  return data as ContactInsight
}

/**
 * Get contacts with specific topics
 */
export async function getContactsByTopic(
  topic: string,
  limit = 20
): Promise<ContactInsight[]> {
  const { data, error } = await supabase
    .from('contact_insights')
    .select('*')
    .contains('detected_topics', [topic])
    .order('period_end', { ascending: false })
    .limit(limit)

  if (error) {
    log.error('[contactSearchService] getContactsByTopic error:', { error: error })
    throw error
  }

  return data as ContactInsight[]
}

/**
 * Get contacts with pending action items
 */
export async function getContactsWithActionItems(
  limit = 20
): Promise<ContactInsight[]> {
  const { data, error } = await supabase
    .from('contact_insights')
    .select('*')
    .not('action_items', 'eq', '{}')
    .order('period_end', { ascending: false })
    .limit(limit)

  if (error) {
    log.error('[contactSearchService] getContactsWithActionItems error:', { error: error })
    throw error
  }

  return data as ContactInsight[]
}

// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Get AI pipeline processing statistics
 */
export async function getAIPipelineStats(days = 7): Promise<AIPipelineStats[]> {
  const { data, error } = await supabase
    .from('ai_pipeline_stats')
    .select('*')
    .limit(days)

  if (error) {
    log.error('[contactSearchService] getAIPipelineStats error:', { error: error })
    throw error
  }

  return data as AIPipelineStats[]
}

/**
 * Get contacts sorted by relationship score
 */
export async function getTopRelationships(limit = 10): Promise<{
  contact_phone: string
  name: string
  relationship_score: number
  last_insight_at: string | null
}[]> {
  const { data, error } = await supabase
    .from('contact_network')
    .select('phone_number, contact_phone, name, contact_name, relationship_score, last_insight_at')
    .not('relationship_score', 'is', null)
    .order('relationship_score', { ascending: false })
    .limit(limit)

  if (error) {
    log.error('[contactSearchService] getTopRelationships error:', { error: error })
    throw error
  }

  return (data || []).map(d => ({
    contact_phone: d.phone_number || d.contact_phone,
    name: d.name || d.contact_name || d.phone_number || d.contact_phone,
    relationship_score: d.relationship_score,
    last_insight_at: d.last_insight_at,
  }))
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  // Search
  searchContacts,

  // Insights
  getContactInsights,
  getLatestContactInsight,
  getContactsByTopic,
  getContactsWithActionItems,

  // Analytics
  getAIPipelineStats,
  getTopRelationships,
}
