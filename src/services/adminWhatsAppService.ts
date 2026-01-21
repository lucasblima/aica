/**
 * Admin WhatsApp Service
 *
 * Service for admin-only WhatsApp monitoring operations.
 * All functions require the user to have is_admin=true in user_metadata.
 *
 * Issue: #129 - WhatsApp Instance Monitoring Dashboard
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 */

import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from './supabaseClient';

const log = createNamespacedLogger('AdminWhatsAppService');
import type {
  AdminInstanceStats,
  AdminInstanceRow,
  AdminErrorEntry,
  AdminInstanceFilters,
  AdminActionResponse,
} from '@/types/adminWhatsApp'

/**
 * Get aggregated instance statistics for dashboard
 * @throws Error if user is not an admin
 */
export async function getAdminInstanceStats(): Promise<AdminInstanceStats> {
  const { data, error } = await supabase.rpc('get_admin_instance_stats')

  if (error) {
    if (error.message.includes('Unauthorized')) {
      throw new Error('Acesso negado: permissão de administrador necessária')
    }
    throw new Error(`Erro ao buscar estatísticas: ${error.message}`)
  }

  return data as AdminInstanceStats
}

/**
 * Get all instances with user info (paginated)
 * @throws Error if user is not an admin
 */
export async function getAdminInstances(
  filters?: AdminInstanceFilters
): Promise<AdminInstanceRow[]> {
  const { data, error } = await supabase.rpc('get_admin_instances', {
    p_status: filters?.status ?? null,
    p_limit: filters?.limit ?? 100,
    p_offset: filters?.offset ?? 0,
  })

  if (error) {
    if (error.message.includes('Unauthorized')) {
      throw new Error('Acesso negado: permissão de administrador necessária')
    }
    throw new Error(`Erro ao buscar instâncias: ${error.message}`)
  }

  let instances = (data as AdminInstanceRow[]) ?? []

  // Client-side filtering for search and hasErrors
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    instances = instances.filter(
      (i) =>
        i.instance_name.toLowerCase().includes(searchLower) ||
        i.user_email?.toLowerCase().includes(searchLower) ||
        i.phone_number?.includes(searchLower) ||
        i.profile_name?.toLowerCase().includes(searchLower)
    )
  }

  if (filters?.hasErrors) {
    instances = instances.filter((i) => i.consecutive_errors > 0 || i.status === 'error')
  }

  return instances
}

/**
 * Get recent errors for the errors log
 * @throws Error if user is not an admin
 */
export async function getAdminRecentErrors(limit = 50): Promise<AdminErrorEntry[]> {
  const { data, error } = await supabase.rpc('get_admin_recent_errors', {
    p_limit: limit,
  })

  if (error) {
    if (error.message.includes('Unauthorized')) {
      throw new Error('Acesso negado: permissão de administrador necessária')
    }
    throw new Error(`Erro ao buscar erros: ${error.message}`)
  }

  return (data as AdminErrorEntry[]) ?? []
}

/**
 * Force disconnect an instance (admin action)
 * @throws Error if user is not an admin
 */
export async function adminDisconnectInstance(
  instanceName: string
): Promise<AdminActionResponse> {
  const { data, error } = await supabase.rpc('admin_disconnect_instance', {
    p_instance_name: instanceName,
  })

  if (error) {
    if (error.message.includes('Unauthorized')) {
      throw new Error('Acesso negado: permissão de administrador necessária')
    }
    throw new Error(`Erro ao desconectar instância: ${error.message}`)
  }

  return data as AdminActionResponse
}

/**
 * Reset instance errors (admin action)
 * @throws Error if user is not an admin
 */
export async function adminResetInstanceErrors(
  instanceName: string
): Promise<AdminActionResponse> {
  const { data, error } = await supabase.rpc('admin_reset_instance_errors', {
    p_instance_name: instanceName,
  })

  if (error) {
    if (error.message.includes('Unauthorized')) {
      throw new Error('Acesso negado: permissão de administrador necessária')
    }
    throw new Error(`Erro ao resetar erros: ${error.message}`)
  }

  return data as AdminActionResponse
}

/**
 * Check if current user is an admin
 */
export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')

  if (error) {
    log.error('Error checking admin status:', { error });
    return false;
  }

  return data === true
}

/**
 * Generate health alerts based on current stats
 */
export function generateHealthAlerts(
  stats: AdminInstanceStats,
  instances: AdminInstanceRow[]
): Array<{
  id: string
  type: 'capacity_warning' | 'capacity_critical' | 'high_error_rate' | 'instance_banned' | 'mass_disconnect'
  severity: 'warning' | 'error' | 'critical'
  message: string
  timestamp: string
}> {
  const alerts: Array<{
    id: string
    type: 'capacity_warning' | 'capacity_critical' | 'high_error_rate' | 'instance_banned' | 'mass_disconnect'
    severity: 'warning' | 'error' | 'critical'
    message: string
    timestamp: string
  }> = []

  const now = new Date().toISOString()

  // Capacity alerts
  if (stats.capacityPercent >= 90) {
    alerts.push({
      id: 'capacity-critical',
      type: 'capacity_critical',
      severity: 'critical',
      message: `Capacidade crítica: ${stats.capacityPercent}% utilizado. Considere escalar o servidor.`,
      timestamp: now,
    })
  } else if (stats.capacityPercent >= 75) {
    alerts.push({
      id: 'capacity-warning',
      type: 'capacity_warning',
      severity: 'warning',
      message: `Alerta de capacidade: ${stats.capacityPercent}% utilizado.`,
      timestamp: now,
    })
  }

  // High error rate
  const errorRate = stats.total > 0 ? (stats.withErrors / stats.total) * 100 : 0
  if (errorRate > 20) {
    alerts.push({
      id: 'high-error-rate',
      type: 'high_error_rate',
      severity: 'error',
      message: `Taxa de erro alta: ${errorRate.toFixed(1)}% das instâncias com erros.`,
      timestamp: now,
    })
  }

  // Banned instances
  const bannedCount = stats.byStatus?.banned ?? 0
  if (bannedCount > 0) {
    alerts.push({
      id: 'instances-banned',
      type: 'instance_banned',
      severity: 'critical',
      message: `${bannedCount} instância(s) banida(s) pelo WhatsApp.`,
      timestamp: now,
    })
  }

  // Mass disconnect detection (more than 30% disconnected in last 24h)
  const disconnectedRecently = instances.filter((i) => {
    if (i.status !== 'disconnected' || !i.disconnected_at) return false
    const disconnectedAt = new Date(i.disconnected_at)
    const hoursAgo = (Date.now() - disconnectedAt.getTime()) / (1000 * 60 * 60)
    return hoursAgo < 24
  }).length

  if (stats.total > 5 && disconnectedRecently / stats.total > 0.3) {
    alerts.push({
      id: 'mass-disconnect',
      type: 'mass_disconnect',
      severity: 'error',
      message: `Alerta: ${disconnectedRecently} instâncias desconectadas nas últimas 24h.`,
      timestamp: now,
    })
  }

  return alerts
}
