/**
 * useContactIntelligence Hook
 * Orchestrates on-demand AI processing pipeline for a contact.
 *
 * Tri-state: pristine → processing → completed
 * - Pristine: contact has no dossier, shows CTA
 * - Processing: pipeline running (dossier → threads → entities)
 * - Completed: all data available, show intelligence cards
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'
import type { ContactNetwork } from '@/types/memoryTypes'
import type { ContactDossier } from './useContactDossier'
import type { ConversationThread } from './useConversationThreads'

const log = createNamespacedLogger('useContactIntelligence')

// =============================================================================
// TYPES
// =============================================================================

export type IntelligenceState = 'pristine' | 'processing' | 'completed'

export type ProcessingDepth = 'quick' | 'standard' | 'full'

export type ProcessingStage =
  | 'enabling'
  | 'dossier'
  | 'threads'
  | 'entities'
  | 'fetching'

export interface ProcessingProgress {
  stage: ProcessingStage
  stageIndex: number
  totalStages: number
  label: string
}

export interface UseContactIntelligenceReturn {
  state: IntelligenceState
  progress: ProcessingProgress | null
  dossier: ContactDossier | null
  threads: ConversationThread[]
  error: string | null
  activate: (depth: ProcessingDepth) => Promise<void>
  refreshAll: () => Promise<void>
}

const DEPTH_MESSAGE_LIMITS: Record<ProcessingDepth, number | undefined> = {
  quick: 50,
  standard: 200,
  full: undefined, // no limit
}

const STAGE_LABELS: Record<ProcessingStage, string> = {
  enabling: 'Ativando processamento...',
  dossier: 'Gerando dossiê do contato...',
  threads: 'Agrupando conversas...',
  entities: 'Detectando ações e tarefas...',
  fetching: 'Carregando resultados...',
}

// =============================================================================
// HOOK
// =============================================================================

export function useContactIntelligence(
  contact: ContactNetwork | null,
  isOpen: boolean
): UseContactIntelligenceReturn {
  const [state, setState] = useState<IntelligenceState>('pristine')
  const [progress, setProgress] = useState<ProcessingProgress | null>(null)
  const [dossier, setDossier] = useState<ContactDossier | null>(null)
  const [threads, setThreads] = useState<ConversationThread[]>([])
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)

  // Determine initial state when contact changes or sheet opens
  useEffect(() => {
    if (!contact || !isOpen) {
      setState('pristine')
      setDossier(null)
      setThreads([])
      setProgress(null)
      setError(null)
      return
    }

    // If contact already has dossier data, go straight to completed
    if (contact.dossier_summary) {
      setState('completed')
      fetchCompletedData(contact.id)
    } else {
      setState('pristine')
      setDossier(null)
      setThreads([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id, isOpen])

  const fetchCompletedData = useCallback(async (contactId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch dossier and threads in parallel
      const [dossierResult, threadsResult] = await Promise.all([
        supabase.rpc('get_contact_dossier', {
          p_user_id: user.id,
          p_contact_id: contactId,
        }),
        supabase.rpc('get_contact_threads', {
          p_user_id: user.id,
          p_contact_id: contactId,
          p_limit: 20,
          p_offset: 0,
        }),
      ])

      if (dossierResult.data?.length > 0) {
        setDossier(dossierResult.data[0] as ContactDossier)
      }
      if (threadsResult.data) {
        setThreads(threadsResult.data as ConversationThread[])
      }
    } catch (err) {
      log.error('Failed to fetch completed data:', err)
    }
  }, [])

  // On-demand pipeline activation
  const activate = useCallback(async (depth: ProcessingDepth) => {
    if (!contact) return

    abortRef.current = false
    setState('processing')
    setError(null)

    const totalStages = 4
    const messageLimit = DEPTH_MESSAGE_LIMITS[depth]

    const updateProgress = (stage: ProcessingStage, stageIndex: number) => {
      if (abortRef.current) return
      setProgress({
        stage,
        stageIndex,
        totalStages,
        label: STAGE_LABELS[stage],
      })
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Stage 1: Enable AI processing in DB
      updateProgress('enabling', 0)
      const { error: rpcError } = await supabase.rpc('enable_contact_ai_processing', {
        p_user_id: user.id,
        p_contact_id: contact.id,
        p_depth: depth,
      })
      if (rpcError) throw rpcError
      if (abortRef.current) return

      // Stage 2: Build dossier
      updateProgress('dossier', 1)
      const { error: dossierError } = await supabase.functions.invoke('build-contact-dossier', {
        body: {
          userId: user.id,
          contactId: contact.id,
          ...(messageLimit && { messageLimit }),
        },
      })
      if (dossierError) {
        log.error('Dossier build failed:', dossierError)
        // Continue pipeline — dossier failure is non-fatal
      }
      if (abortRef.current) return

      // Stage 3: Build conversation threads
      updateProgress('threads', 2)
      const { error: threadsError } = await supabase.functions.invoke('build-conversation-threads', {
        body: {
          userId: user.id,
          contactId: contact.id,
          ...(messageLimit && { messageLimit }),
        },
      })
      if (threadsError) {
        log.error('Threads build failed:', threadsError)
      }
      if (abortRef.current) return

      // Stage 4: Route entities
      updateProgress('entities', 3)
      const { error: entitiesError } = await supabase.functions.invoke('route-entities-to-modules', {
        body: {
          userId: user.id,
        },
      })
      if (entitiesError) {
        log.error('Entity routing failed:', entitiesError)
      }
      if (abortRef.current) return

      // Fetch all results
      updateProgress('fetching', 3)
      await fetchCompletedData(contact.id)

      setState('completed')
      setProgress(null)
    } catch (err) {
      log.error('Intelligence pipeline failed:', err)
      setError(err instanceof Error ? err.message : 'Erro ao processar contato')
      setState('pristine')
      setProgress(null)
    }
  }, [contact, fetchCompletedData])

  // Refresh all data for an already-completed contact
  const refreshAll = useCallback(async () => {
    if (!contact) return
    setState('processing')
    await activate(
      (contact.ai_processing_depth as ProcessingDepth) || 'standard'
    )
  }, [contact, activate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  return {
    state,
    progress,
    dossier,
    threads,
    error,
    activate,
    refreshAll,
  }
}

export default useContactIntelligence
