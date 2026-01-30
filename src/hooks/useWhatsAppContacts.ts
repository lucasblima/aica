/**
 * useWhatsAppContacts Hook
 *
 * Hook for managing WhatsApp contacts synchronization:
 * - Sync contacts from Evolution API
 * - Fetch contacts from database
 * - Track sync status and progress
 *
 * @example
 * const {
 *   contacts,
 *   syncStatus,
 *   syncContacts,
 *   isLoading,
 * } = useWhatsAppContacts()
 *
 * Issue: #92 - Contacts list integration
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useWhatsAppContacts')

export interface WhatsAppContact {
  id: string
  user_id: string
  name: string
  phone: string
  whatsapp_id: string | null
  whatsapp_phone: string | null
  whatsapp_name: string | null
  whatsapp_profile_pic_url: string | null
  sync_source: string | null
  whatsapp_message_count: number
  last_whatsapp_message_at: string | null
  created_at: string
  updated_at: string
}

// Contact sorting options
export type ContactSortField = 'name' | 'message_count' | 'last_activity'
export type ContactSortOrder = 'asc' | 'desc'

export interface SyncResult {
  success: boolean
  synced: number
  skipped: number
  total: number
  duration_ms: number
  error?: string
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'completed' | 'error'
  progress: number
  message: string
  result?: SyncResult
}

interface UseWhatsAppContactsReturn {
  /** List of WhatsApp contacts */
  contacts: WhatsAppContact[]
  /** Total contacts count */
  totalCount: number
  /** Groups count (from contact_network with is_group flag) */
  groupsCount: number
  /** Current sync status */
  syncStatus: SyncStatus
  /** Whether data is loading */
  isLoading: boolean
  /** Error message */
  error: string | null
  /** Sync contacts from Evolution API */
  syncContacts: () => Promise<SyncResult | null>
  /** Fetch contacts from database */
  fetchContacts: (sortBy?: ContactSortField, sortOrder?: ContactSortOrder) => Promise<void>
  /** Last sync timestamp */
  lastSyncAt: string | null
}

export function useWhatsAppContacts(): UseWhatsAppContactsReturn {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [groupsCount, setGroupsCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    progress: 0,
    message: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)

  /**
   * Fetch contacts from database with optional sorting
   */
  const fetchContacts = useCallback(async (
    sortBy: ContactSortField = 'name',
    sortOrder: ContactSortOrder = 'asc'
  ) => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('User not authenticated')
      }

      // Build query with sorting
      const query = supabase
        .from('contact_network')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id)
        .eq('sync_source', 'whatsapp')

      // Apply sorting based on sortBy field
      switch (sortBy) {
        case 'message_count':
          query.order('whatsapp_message_count', {
            ascending: sortOrder === 'asc',
            nullsFirst: false,
          })
          break
        case 'last_activity':
          query.order('last_whatsapp_message_at', {
            ascending: sortOrder === 'asc',
            nullsFirst: false,
          })
          break
        case 'name':
        default:
          query.order('whatsapp_name', { ascending: sortOrder === 'asc' })
          break
      }

      const { data, error: fetchError, count } = await query

      if (fetchError) {
        throw fetchError
      }

      setContacts(data || [])
      setTotalCount(count || 0)

      // Count groups separately (assuming there's a way to identify groups)
      // Groups in WhatsApp typically have IDs ending in @g.us
      const groups = (data || []).filter(c =>
        c.whatsapp_id?.includes('@g.us') || c.whatsapp_id?.includes('-')
      )
      setGroupsCount(groups.length)

      // Get last sync time
      const { data: syncLogs } = await supabase
        .from('whatsapp_sync_logs')
        .select('completed_at')
        .eq('user_id', session.user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)

      if (syncLogs && syncLogs.length > 0) {
        setLastSyncAt(syncLogs[0].completed_at)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contacts'
      setError(errorMessage)
      log.error('Fetch error:', { error: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Sync contacts from Evolution API
   */
  const syncContacts = useCallback(async (): Promise<SyncResult | null> => {
    try {
      setSyncStatus({
        status: 'syncing',
        progress: 10,
        message: 'Iniciando sincronização...',
      })
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('User not authenticated. Please log in again.')
      }

      setSyncStatus({
        status: 'syncing',
        progress: 30,
        message: 'Conectando ao WhatsApp...',
      })

      // Call sync-whatsapp-contacts Edge Function
      const response = await supabase.functions.invoke('sync-whatsapp-contacts', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.error) {
        throw new Error(response.error.message || 'Failed to sync contacts')
      }

      const result = response.data as {
        success: boolean
        synced?: number
        skipped?: number
        total?: number
        duration_ms?: number
        error?: string
      }

      if (!result.success) {
        throw new Error(result.error || 'Sync failed')
      }

      setSyncStatus({
        status: 'syncing',
        progress: 80,
        message: 'Salvando contatos...',
      })

      // Refresh contacts list
      await fetchContacts()

      const syncResult: SyncResult = {
        success: true,
        synced: result.synced || 0,
        skipped: result.skipped || 0,
        total: (result.synced || 0) + (result.skipped || 0),
        duration_ms: result.duration_ms || 0,
      }

      setSyncStatus({
        status: 'completed',
        progress: 100,
        message: `Sincronização completa! ${syncResult.synced} contatos sincronizados.`,
        result: syncResult,
      })

      return syncResult

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed'
      setError(errorMessage)
      setSyncStatus({
        status: 'error',
        progress: 0,
        message: errorMessage,
      })
      log.error('Sync error:', { error: errorMessage })
      return null
    }
  }, [fetchContacts])

  // Fetch contacts on mount
  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  return {
    contacts,
    totalCount,
    groupsCount,
    syncStatus,
    isLoading,
    error,
    syncContacts,
    fetchContacts,
    lastSyncAt,
  }
}

export default useWhatsAppContacts
