/**
 * useIntentTimeline Hook
 * Fetches paginated intent_summaries for a contact.
 *
 * Privacy-first: queries ONLY intent fields from whatsapp_messages,
 * never content_text or raw message data.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useIntentTimeline')

// =============================================================================
// TYPES
// =============================================================================

export interface IntentEntry {
  id: string
  message_direction: 'incoming' | 'outgoing'
  intent_summary: string
  intent_category: string | null
  intent_sentiment: string | null
  intent_urgency: number | null
  intent_action_required: boolean | null
  message_timestamp: string
  thread_id: string | null
}

export interface UseIntentTimelineReturn {
  intents: IntentEntry[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  totalCount: number
}

const PAGE_SIZE = 20

const INTENT_COLUMNS = [
  'id',
  'message_direction',
  'intent_summary',
  'intent_category',
  'intent_sentiment',
  'intent_urgency',
  'intent_action_required',
  'message_timestamp',
  'thread_id',
].join(',')

// =============================================================================
// HOOK
// =============================================================================

export function useIntentTimeline(
  contactPhone: string | null,
  enabled = true
): UseIntentTimelineReturn {
  const [intents, setIntents] = useState<IntentEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const fetchIntents = useCallback(async (reset = false) => {
    if (!contactPhone || !enabled) {
      setIntents([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const currentOffset = reset ? 0 : offset

      const { data, error: queryError, count } = await supabase
        .from('whatsapp_messages')
        .select(INTENT_COLUMNS, { count: 'exact' })
        .eq('contact_phone', contactPhone)
        .not('intent_summary', 'is', null)
        .order('message_timestamp', { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1)

      if (queryError) throw queryError

      const entries = (data || []) as IntentEntry[]

      if (reset) {
        setIntents(entries)
        setOffset(entries.length)
      } else {
        setIntents(prev => [...prev, ...entries])
        setOffset(currentOffset + entries.length)
      }

      setHasMore(entries.length === PAGE_SIZE)
      if (count != null) setTotalCount(count)
    } catch (err) {
      log.error('Failed to fetch intent timeline:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar timeline')
    } finally {
      setIsLoading(false)
    }
  }, [contactPhone, enabled, offset])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    await fetchIntents(false)
  }, [fetchIntents, hasMore, isLoading])

  // Reset and fetch on contact change
  useEffect(() => {
    setOffset(0)
    setHasMore(true)
    setTotalCount(0)
    fetchIntents(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactPhone, enabled])

  return {
    intents,
    isLoading,
    error,
    hasMore,
    loadMore,
    totalCount,
  }
}

export default useIntentTimeline
