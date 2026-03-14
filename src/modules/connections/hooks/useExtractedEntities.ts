/**
 * useExtractedEntities Hook
 * WhatsApp Conversation Intelligence — Phase 3
 *
 * Manages extracted entities: fetch pending suggestions, accept/reject routing.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useExtractedEntities')

// =============================================================================
// TYPES
// =============================================================================

export interface ExtractedEntity {
  entity_id: string
  entity_type: string
  entity_summary: string
  entity_details: Record<string, unknown>
  routed_to_module: string | null
  routing_status: string
  confidence: number
  source_context: string | null
  contact_name: string | null
  thread_topic: string | null
  created_at: string
}

export interface EntityStats {
  total_entities: number
  pending_count: number
  accepted_count: number
  rejected_count: number
  entities_by_type: Record<string, number>
}

export interface UseExtractedEntitiesReturn {
  entities: ExtractedEntity[]
  stats: EntityStats | null
  isLoading: boolean
  isExtracting: boolean
  error: string | null
  acceptEntity: (entityId: string) => Promise<void>
  rejectEntity: (entityId: string) => Promise<void>
  extractEntities: (threadIds?: string[]) => Promise<void>
  refresh: () => Promise<void>
}

// =============================================================================
// HOOK
// =============================================================================

export function useExtractedEntities(limit = 20): UseExtractedEntitiesReturn {
  const [entities, setEntities] = useState<ExtractedEntity[]>([])
  const [stats, setStats] = useState<EntityStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEntities = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Fetch pending entities
      const { data, error: rpcError } = await supabase.rpc('get_pending_entities', {
        p_user_id: user.id,
        p_limit: limit,
      })

      if (rpcError) throw rpcError
      setEntities((data || []) as ExtractedEntity[])

      // Fetch stats
      const { data: statsData, error: statsError } = await supabase.rpc('get_entity_stats', {
        p_user_id: user.id,
      })

      if (!statsError && statsData && statsData.length > 0) {
        setStats(statsData[0] as EntityStats)
      }
    } catch (err) {
      log.error('Failed to fetch entities:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar entidades')
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  const acceptEntity = useCallback(async (entityId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Accept + route to module atomically via route_accepted_entity RPC
      const { data, error: rpcError } = await supabase.rpc('route_accepted_entity', {
        p_user_id: user.id,
        p_entity_id: entityId,
      })

      if (rpcError) throw rpcError

      const result = data as { success: boolean; error?: string; created_item_id?: string; routed_to_module?: string }
      if (!result?.success) {
        throw new Error(result?.error || 'Falha ao rotear entidade')
      }

      log.info(`Entity ${entityId} routed to ${result.routed_to_module}`, result.created_item_id ? `item: ${result.created_item_id}` : '(no item created)')

      // Emit event for agent ecosystem (gamification + pattern updates)
      await supabase.from('module_events').insert({
        user_id: user.id,
        event_type: 'entity.confirmed',
        source_module: 'connections',
        payload: { entity_id: entityId, routed_to: result.routed_to_module },
      }).then(({ error: evtErr }) => {
        if (evtErr) log.debug('module_events insert skipped:', evtErr.message)
      })

      // Remove from local state
      setEntities(prev => prev.filter(e => e.entity_id !== entityId))
    } catch (err) {
      log.error('Failed to accept entity:', err)
      setError(err instanceof Error ? err.message : 'Erro ao aceitar entidade')
    }
  }, [])

  const rejectEntity = useCallback(async (entityId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: rpcError } = await supabase.rpc('resolve_entity', {
        p_user_id: user.id,
        p_entity_id: entityId,
        p_action: 'reject',
      })

      if (rpcError) throw rpcError

      // Remove from local state
      setEntities(prev => prev.filter(e => e.entity_id !== entityId))
    } catch (err) {
      log.error('Failed to reject entity:', err)
      setError(err instanceof Error ? err.message : 'Erro ao rejeitar entidade')
    }
  }, [])

  const extractEntities = useCallback(async (threadIds?: string[]) => {
    setIsExtracting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: fnError } = await supabase.functions.invoke('route-entities-to-modules', {
        body: { userId: user.id, threadIds },
      })

      if (fnError) throw fnError

      // Refetch
      await fetchEntities()
    } catch (err) {
      log.error('Failed to extract entities:', err)
      setError(err instanceof Error ? err.message : 'Erro ao extrair entidades')
    } finally {
      setIsExtracting(false)
    }
  }, [fetchEntities])

  useEffect(() => {
    fetchEntities()
  }, [fetchEntities])

  return {
    entities,
    stats,
    isLoading,
    isExtracting,
    error,
    acceptEntity,
    rejectEntity,
    extractEntities,
    refresh: fetchEntities,
  }
}

export default useExtractedEntities
