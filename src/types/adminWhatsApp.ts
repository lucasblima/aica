/**
 * Admin WhatsApp Monitoring Types
 *
 * Types for the admin WhatsApp monitoring dashboard.
 * Issue: #129 - WhatsApp Instance Monitoring Dashboard
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 */

import type { WhatsAppSessionStatus } from './whatsappSession'

/**
 * Instance row for admin table view
 */
export interface AdminInstanceRow {
  id: string
  instance_name: string
  instance_display_name: string | null
  user_id: string
  user_email: string | null
  status: WhatsAppSessionStatus
  phone_number: string | null
  phone_country_code: string | null
  profile_name: string | null
  profile_picture_url: string | null
  connected_at: string | null
  disconnected_at: string | null
  last_activity_at: string | null
  contacts_count: number
  groups_count: number
  messages_synced_count: number
  consecutive_errors: number
  error_message: string | null
  error_code: string | null
  pairing_attempts: number
  messages_sent_today: number
  created_at: string
  updated_at: string
}

/**
 * Aggregated instance statistics from get_admin_instance_stats()
 */
export interface AdminInstanceStats {
  total: number
  byStatus: Partial<Record<WhatsAppSessionStatus, number>>
  connectedLast24h: number
  withErrors: number
  totalContacts: number
  totalGroups: number
  totalMessages: number
  capacityPercent: number
  timestamp: string
}

/**
 * Error entry for the errors log
 */
export interface AdminErrorEntry {
  id: string
  instance_name: string
  user_id: string
  user_email: string | null
  status: WhatsAppSessionStatus
  error_message: string | null
  error_code: string | null
  consecutive_errors: number
  last_activity_at: string | null
  disconnected_at: string | null
  updated_at: string
}

/**
 * Health alert for the dashboard
 */
export interface AdminHealthAlert {
  id: string
  type: 'capacity_warning' | 'capacity_critical' | 'high_error_rate' | 'instance_banned' | 'mass_disconnect'
  severity: 'warning' | 'error' | 'critical'
  message: string
  timestamp: string
  instanceName?: string
  metadata?: Record<string, unknown>
}

/**
 * Capacity thresholds for dashboard gauges
 */
export interface CapacityThresholds {
  warning: number  // Default: 75%
  critical: number // Default: 90%
  maxInstances: number // Based on server RAM
}

/**
 * Filter options for instance table
 */
export interface AdminInstanceFilters {
  status?: WhatsAppSessionStatus | null
  search?: string
  hasErrors?: boolean
  limit?: number
  offset?: number
}

/**
 * Admin action response
 */
export interface AdminActionResponse {
  success: boolean
  instance_name?: string
  new_status?: WhatsAppSessionStatus
  error?: string
}

/**
 * Status color mapping for UI
 */
export const STATUS_COLORS: Record<WhatsAppSessionStatus, { bg: string; text: string; dot: string }> = {
  connected: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  connecting: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-400' },
  disconnected: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  error: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  banned: { bg: 'bg-red-100', text: 'text-red-900', dot: 'bg-red-700' },
}

/**
 * Status labels in Portuguese
 */
export const STATUS_LABELS: Record<WhatsAppSessionStatus, string> = {
  connected: 'Conectado',
  connecting: 'Conectando',
  pending: 'Pendente',
  disconnected: 'Desconectado',
  error: 'Erro',
  banned: 'Banido',
}
