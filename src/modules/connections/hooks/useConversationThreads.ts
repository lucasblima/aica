/**
 * useConversationThreads Hook
 * WhatsApp Conversation Intelligence — Phase 2
 *
 * Fetches conversation threads for a contact or recent threads across all contacts.
 * Supports on-demand thread building and pagination.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useConversationThreads')

// =============================================================================
// TYPES
// =============================================================================

export interface ConversationThread {
  thread_id: string
  contact_id?: string
  contact_name?: string
  thread_start: string
  thread_end: string
  message_count: number
  summary: string | null
  topic: string | null
  decisions: string[]
  action_items: string[]
  participants?: string[]
  thread_type: string
  sentiment_arc: string
  is_group: boolean
  created_at?: string
}

export interface UseConversationThreadsReturn {
  threads: ConversationThread[]
  isLoading: boolean
  isBuilding: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  buildThreads: () => Promise<void>
}

// =============================================================================
// CONTACT THREADS HOOK
// =============================================================================

export function useConversationThreads(
  contactId: string | null,
  pageSize = 20
): UseConversationThreadsReturn {
  const [threads, setThreads] = useState<ConversationThread[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchThreads = useCallback(async (reset = false) => {
    if (!contactId) {
      setThreads([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const currentOffset = reset ? 0 : offset
      const { data, error: rpcError } = await supabase.rpc('get_contact_threads', {
        p_user_id: user.id,
        p_contact_id: contactId,
        p_limit: pageSize,
        p_offset: currentOffset,
      })

      if (rpcError) throw rpcError

      const newThreads = (data || []) as ConversationThread[]

      if (reset) {
        setThreads(newThreads)
        setOffset(newThreads.length)
      } else {
        setThreads(prev => [...prev, ...newThreads])
        setOffset(currentOffset + newThreads.length)
      }

      setHasMore(newThreads.length === pageSize)
    } catch (err) {
      log.error('Failed to fetch threads:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar threads')
    } finally {
      setIsLoading(false)
    }
  }, [contactId, offset, pageSize])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    await fetchThreads(false)
  }, [fetchThreads, hasMore, isLoading])

  const buildThreads = useCallback(async () => {
    if (!contactId) return

    setIsBuilding(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: fnError } = await supabase.functions.invoke('build-conversation-threads', {
        body: { userId: user.id, contactId },
      })

      if (fnError) throw fnError

      // Refetch threads after building
      setOffset(0)
      await fetchThreads(true)
    } catch (err) {
      log.error('Failed to build threads:', err)
      setError(err instanceof Error ? err.message : 'Erro ao construir threads')
    } finally {
      setIsBuilding(false)
    }
  }, [contactId, fetchThreads])

  // Fetch on mount / contact change
  useEffect(() => {
    setOffset(0)
    setHasMore(true)
    fetchThreads(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId])

  return {
    threads,
    isLoading,
    isBuilding,
    error,
    hasMore,
    loadMore,
    buildThreads,
  }
}

// =============================================================================
// RECENT THREADS HOOK (cross-contact overview)
// =============================================================================

export function useRecentThreads(limit = 10) {
  const [threads, setThreads] = useState<ConversationThread[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecent = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: rpcError } = await supabase.rpc('get_recent_threads', {
        p_user_id: user.id,
        p_limit: limit,
      })

      if (rpcError) throw rpcError
      setThreads((data || []) as ConversationThread[])
    } catch (err) {
      log.error('Failed to fetch recent threads:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar threads recentes')
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchRecent()
  }, [fetchRecent])

  return { threads, isLoading, error, refresh: fetchRecent }
}

export default useConversationThreads
