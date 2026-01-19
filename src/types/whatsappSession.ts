/**
 * WhatsApp Session Types
 *
 * Types for whatsapp_sessions table and related structures.
 * Schema: supabase/migrations/20260113_whatsapp_sessions_multi_instance.sql
 *
 * Issue: #123 - Database Schema for whatsapp_sessions
 */

export type WhatsAppSessionStatus =
  | 'pending'      // Instance created but not yet connected
  | 'connecting'   // Pairing in progress
  | 'connected'    // Successfully connected
  | 'disconnected' // Was connected, now disconnected
  | 'error'        // Connection error
  | 'banned'       // Number banned by WhatsApp

/**
 * WhatsApp session record from database
 */
export interface WhatsAppSession {
  id: string
  user_id: string

  // Instance identification
  instance_name: string
  instance_display_name: string | null

  // Connection status
  status: WhatsAppSessionStatus

  // Phone information (populated after connection)
  phone_number: string | null
  phone_country_code: string | null
  profile_name: string | null
  profile_picture_url: string | null

  // Pairing information
  pairing_code: string | null
  pairing_code_expires_at: string | null
  pairing_attempts: number
  last_pairing_attempt_at: string | null

  // Connection timestamps
  connected_at: string | null
  disconnected_at: string | null
  last_activity_at: string | null

  // Sync information
  last_sync_at: string | null
  contacts_count: number
  groups_count: number
  messages_synced_count: number

  // Error tracking
  error_message: string | null
  error_code: string | null
  consecutive_errors: number

  // Rate limiting
  messages_sent_today: number
  messages_sent_reset_at: string

  // Metadata
  evolution_instance_id: string | null
  webhook_url: string | null
  created_at: string
  updated_at: string
}

/**
 * Minimal session info for UI display
 */
export interface WhatsAppSessionInfo {
  instance_name: string
  status: WhatsAppSessionStatus
  phone_number: string | null
  profile_name: string | null
  connected_at: string | null
  last_activity_at: string | null
}

/**
 * Response from create-user-instance Edge Function
 */
export interface CreateInstanceResponse {
  success: boolean
  session?: WhatsAppSession
  instanceCreated?: boolean
  error?: string
}

/**
 * Real-time subscription event payload
 */
export interface WhatsAppSessionChangeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: WhatsAppSession | null
  old: WhatsAppSession | null
}
