/**
 * useContactDossier Hook
 * WhatsApp Conversation Intelligence — Phase 1
 *
 * Manages contact dossier fetching, on-demand refresh, and batch processing.
 * Uses only intent_summary data (privacy-first, no raw text).
 *
 * @example
 * const { dossier, isLoading, refreshDossier } = useContactDossier(contactId)
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useContactDossier')

// =============================================================================
// TYPES
// =============================================================================

export interface ContactDossier {
  contact_id: string
  contact_name: string
  phone: string | null
  relationship_type: string
  dossier_summary: string | null
  dossier_topics: string[]
  dossier_pending_items: string[]
  dossier_context: DossierContext | null
  dossier_updated_at: string | null
  dossier_version: number
  health_score: number
  sentiment_trend: string
  interaction_count: number
  last_interaction_at: string | null
}

export interface DossierContext {
  relationship_nature: string
  communication_style: string
  key_dates: string[]
  notable_patterns: string[]
  preferred_topics: string[]
}

export interface UseContactDossierReturn {
  dossier: ContactDossier | null
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  refreshDossier: () => Promise<void>
  hasDossier: boolean
}

// =============================================================================
// HOOK
// =============================================================================

export function useContactDossier(contactId: string | null): UseContactDossierReturn {
  const [dossier, setDossier] = useState<ContactDossier | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch dossier from database
  const fetchDossier = useCallback(async () => {
    if (!contactId) {
      setDossier(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: rpcError } = await supabase.rpc('get_contact_dossier', {
        p_user_id: user.id,
        p_contact_id: contactId,
      })

      if (rpcError) throw rpcError

      if (data && data.length > 0) {
        setDossier(data[0] as ContactDossier)
      } else {
        setDossier(null)
      }
    } catch (err) {
      log.error('Failed to fetch dossier:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dossie')
    } finally {
      setIsLoading(false)
    }
  }, [contactId])

  // On-demand refresh: calls Edge Function to rebuild dossier
  const refreshDossier = useCallback(async () => {
    if (!contactId) return

    setIsRefreshing(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: fnError } = await supabase.functions.invoke('build-contact-dossier', {
        body: {
          userId: user.id,
          contactId,
        },
      })

      if (fnError) throw fnError

      if (data?.dossier) {
        setDossier(data.dossier as ContactDossier)
      } else {
        // Refetch from DB after build
        await fetchDossier()
      }
    } catch (err) {
      log.error('Failed to refresh dossier:', err)
      setError(err instanceof Error ? err.message : 'Erro ao atualizar dossie')
    } finally {
      setIsRefreshing(false)
    }
  }, [contactId, fetchDossier])

  // Fetch on mount and when contactId changes
  useEffect(() => {
    fetchDossier()
  }, [fetchDossier])

  return {
    dossier,
    isLoading,
    isRefreshing,
    error,
    refreshDossier,
    hasDossier: !!dossier?.dossier_summary,
  }
}

// =============================================================================
// BATCH HOOK (for admin/cron use)
// =============================================================================

export interface BatchDossierResult {
  processed: number
  succeeded: number
  failed: number
}

export function useContactDossierBatch() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<BatchDossierResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runBatch = useCallback(async (limit = 20) => {
    setIsProcessing(true)
    setError(null)
    setResult(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: fnError } = await supabase.functions.invoke('build-contact-dossier', {
        body: {
          userId: user.id,
          limit,
        },
      })

      if (fnError) throw fnError

      setResult({
        processed: data?.processed || 0,
        succeeded: data?.succeeded || 0,
        failed: data?.failed || 0,
      })
    } catch (err) {
      log.error('Batch dossier build failed:', err)
      setError(err instanceof Error ? err.message : 'Erro ao processar dossies em lote')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  return {
    isProcessing,
    result,
    error,
    runBatch,
  }
}

export default useContactDossier
