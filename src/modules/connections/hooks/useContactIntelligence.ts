/**
 * useContactIntelligence Hook
 * Orchestrates on-demand AI processing pipeline for a contact.
 *
 * States: pristine → processing → completed
 * Supports depth escalation: quick → standard → full
 * After completing at a given depth, user can upgrade to a deeper analysis.
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
  currentDepth: ProcessingDepth | null
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

const DEPTH_ORDER: ProcessingDepth[] = ['quick', 'standard', 'full']

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
  const [currentDepth, setCurrentDepth] = useState<ProcessingDepth | null>(null)
  const [progress, setProgress] = useState<ProcessingProgress | null>(null)
  const [dossier, setDossier] = useState<ContactDossier | null>(null)
  const [threads, setThreads] = useState<ConversationThread[]>([])
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)

  // Determine initial state when contact changes or sheet opens
  // Always probe the DB — don't rely on stale parent prop for dossier_summary
  useEffect(() => {
    if (!contact || !isOpen) {
      // Only reset progress/error on close — preserve dossier/threads for quick re-open
      setProgress(null)
      setError(null)
      return
    }

    // Always check DB for existing dossier (parent list may be stale)
    const checkAndFetch = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase.rpc('get_contact_dossier', {
          p_user_id: user.id,
          p_contact_id: contact.id,
        })

        if (data?.length > 0 && data[0].dossier_summary) {
          setState('completed')
          setCurrentDepth((contact.ai_processing_depth as ProcessingDepth) || 'quick')
          await fetchCompletedData(contact.id)
        } else {
          setState('pristine')
          setCurrentDepth(null)
          setDossier(null)
          setThreads([])
        }
      } catch (err) {
        log.error('Failed to check existing dossier:', err)
        setState('pristine')
        setCurrentDepth(null)
        setDossier(null)
        setThreads([])
      }
    }

    checkAndFetch()
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
      const { data: dossierResponse, error: dossierError } = await supabase.functions.invoke('build-contact-dossier', {
        body: {
          userId: user.id,
          contactId: contact.id,
          ...(messageLimit && { messageLimit }),
        },
      })
      if (dossierError) {
        log.error('Dossier build failed:', dossierError)
        setError('Falha ao gerar dossiê. Tente novamente.')
        // Don't stop pipeline — threads and entities can still work
      } else if (dossierResponse && !dossierResponse.success) {
        log.error('Dossier build returned error:', dossierResponse.error)
        setError(`Dossiê: ${dossierResponse.error}`)
      } else if (dossierResponse?.dossier) {
        // Use dossier from Edge Function response immediately (faster than re-fetching)
        setDossier(dossierResponse.dossier as ContactDossier)
      }
      if (abortRef.current) return

      // Stage 3: Build conversation threads
      updateProgress('threads', 2)
      const { data: threadsResponse, error: threadsError } = await supabase.functions.invoke('build-conversation-threads', {
        body: {
          userId: user.id,
          contactId: contact.id,
          ...(messageLimit && { messageLimit }),
        },
      })
      if (threadsError) {
        log.error('Threads build failed:', threadsError)
        // Append to existing error if any
        setError(prev => prev ? `${prev} | Threads também falharam.` : 'Falha ao agrupar conversas.')
      } else if (threadsResponse && !threadsResponse.success) {
        log.error('Threads build returned error:', threadsResponse.error)
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

      setCurrentDepth(depth)
      setState('completed')
      setProgress(null)
    } catch (err) {
      log.error('Intelligence pipeline failed:', err)
      setError(err instanceof Error ? err.message : 'Erro ao processar contato')
      setState(currentDepth ? 'completed' : 'pristine')
      setProgress(null)
    }
  }, [contact, currentDepth, fetchCompletedData])

  // Refresh all data for an already-completed contact
  const refreshAll = useCallback(async () => {
    if (!contact) return
    await activate(currentDepth || (contact.ai_processing_depth as ProcessingDepth) || 'standard')
  }, [contact, currentDepth, activate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  return {
    state,
    currentDepth,
    progress,
    dossier,
    threads,
    error,
    activate,
    refreshAll,
  }
}

export default useContactIntelligence
