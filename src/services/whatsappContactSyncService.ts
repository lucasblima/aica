/**
 * WhatsApp Contact Sync Service
 * Sprint 2: Contact Synchronization
 *
 * Handles synchronization of WhatsApp contacts to contact_network table
 * via Evolution API Edge Function
 */

import { supabase } from './supabaseClient'

// ============================================================================
// TYPES
// ============================================================================

export interface SyncContactsResponse {
  success: boolean
  contactsSynced: number
  contactsSkipped: number
  errors: string[]
  syncLogId?: string
  durationMs: number
}

export interface SyncStatus {
  isStale: boolean
  lastSyncAt: string | null
  contactCount: number
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Trigger WhatsApp contacts synchronization
 * Calls Edge Function to fetch contacts from Evolution API
 * and sync to contact_network table
 *
 * @param instanceName - Optional instance name (defaults to env var)
 * @returns Sync result with contacts synced count
 */
export async function syncWhatsAppContacts(
  instanceName?: string
): Promise<SyncContactsResponse> {
  console.log('[whatsappContactSyncService] Starting contact sync...')

  try {
    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      throw new Error('User not authenticated')
    }

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('sync-whatsapp-contacts', {
      body: { instanceName },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (error) {
      console.error('[whatsappContactSyncService] Edge Function error:', error)
      throw error
    }

    console.log('[whatsappContactSyncService] Sync completed:', data)

    return data as SyncContactsResponse
  } catch (error) {
    const err = error as Error
    console.error('[whatsappContactSyncService] Sync failed:', err.message)

    return {
      success: false,
      contactsSynced: 0,
      contactsSkipped: 0,
      errors: [err.message],
      durationMs: 0,
    }
  }
}

/**
 * Get sync status for current user
 * Checks last sync time and contact count
 *
 * @returns Sync status object
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  console.log('[whatsappContactSyncService] Getting sync status...')

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Get last sync time from sync logs
    const { data: lastSync, error: syncError } = await supabase
      .from('whatsapp_sync_logs')
      .select('completed_at, status')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    if (syncError && syncError.code !== 'PGRST116') {
      // Ignore "no rows" error
      console.error('[whatsappContactSyncService] Error fetching sync status:', syncError)
    }

    const lastSyncAt = lastSync?.completed_at || null

    // Check if sync is stale (> 24 hours ago)
    let isStale = true
    if (lastSyncAt) {
      const lastSyncTime = new Date(lastSyncAt).getTime()
      const now = Date.now()
      const hoursSinceSync = (now - lastSyncTime) / (1000 * 60 * 60)
      isStale = hoursSinceSync > 24
    }

    // Get WhatsApp contact count
    const { count, error: countError } = await supabase
      .from('contact_network')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('whatsapp_id', 'is', null)

    if (countError) {
      console.error('[whatsappContactSyncService] Error counting contacts:', countError)
    }

    return {
      isStale,
      lastSyncAt,
      contactCount: count || 0,
    }
  } catch (error) {
    const err = error as Error
    console.error('[whatsappContactSyncService] Error getting sync status:', err.message)

    return {
      isStale: true,
      lastSyncAt: null,
      contactCount: 0,
    }
  }
}

/**
 * Get recent sync logs for current user
 * Useful for debugging and showing sync history
 *
 * @param limit - Maximum number of logs to fetch (default: 10)
 * @returns Array of sync log entries
 */
export async function getSyncLogs(limit: number = 10) {
  console.log('[whatsappContactSyncService] Fetching sync logs...')

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('whatsapp_sync_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[whatsappContactSyncService] Error fetching sync logs:', error)
      throw error
    }

    return data || []
  } catch (error) {
    const err = error as Error
    console.error('[whatsappContactSyncService] Failed to fetch sync logs:', err.message)
    return []
  }
}

/**
 * Check if user has WhatsApp integration configured
 * (Has at least one synced WhatsApp contact)
 *
 * @returns true if user has WhatsApp contacts
 */
export async function hasWhatsAppIntegration(): Promise<boolean> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return false
    }

    const { count, error } = await supabase
      .from('contact_network')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('whatsapp_id', 'is', null)
      .limit(1)

    if (error) {
      console.error('[whatsappContactSyncService] Error checking integration:', error)
      return false
    }

    return (count || 0) > 0
  } catch (error) {
    console.error('[whatsappContactSyncService] Error checking integration:', error)
    return false
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  syncWhatsAppContacts,
  getSyncStatus,
  getSyncLogs,
  hasWhatsAppIntegration,
}
