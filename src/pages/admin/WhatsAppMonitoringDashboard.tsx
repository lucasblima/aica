/**
 * WhatsApp Monitoring Dashboard
 *
 * Admin-only dashboard for monitoring WhatsApp instances.
 * Shows capacity, status breakdown, instance table, errors log, and health alerts.
 *
 * Issue: #129 - WhatsApp Instance Monitoring Dashboard
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 */

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Activity, Users, MessageSquare, AlertTriangle } from 'lucide-react'
import { useAdminInstanceStats } from '@/hooks/useAdminInstanceStats'
import { useAdminActions } from '@/hooks/useAdminActions'
import {
  CapacityGauge,
  StatusPieChart,
  InstanceTable,
  ErrorsLog,
  HealthAlerts,
} from '@/components/features/admin'
import type { WhatsAppSessionStatus } from '@/types/whatsappSession'

export function WhatsAppMonitoringDashboard() {
  const {
    stats,
    instances,
    recentErrors,
    alerts,
    isLoading,
    error,
    refresh,
    applyFilters,
    filters,
  } = useAdminInstanceStats()

  const {
    disconnectInstance,
    resetInstanceErrors,
    isActioning,
    currentAction,
  } = useAdminActions()

  const [selectedStatus, setSelectedStatus] = useState<WhatsAppSessionStatus | null>(null)

  // Handle status filter from pie chart
  const handleStatusClick = useCallback(
    (status: WhatsAppSessionStatus | null) => {
      setSelectedStatus(status)
      applyFilters({ ...filters, status })
    },
    [applyFilters, filters]
  )

  // Handle admin actions
  const handleDisconnect = useCallback(
    async (instanceName: string) => {
      await disconnectInstance(instanceName)
      refresh()
    },
    [disconnectInstance, refresh]
  )

  const handleResetErrors = useCallback(
    async (instanceName: string) => {
      await resetInstanceErrors(instanceName)
      refresh()
    },
    [resetInstanceErrors, refresh]
  )

  if (error) {
    return (
      <div className="min-h-screen bg-ceramic-base flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-ceramic-900 mb-2">Erro ao carregar dados</h2>
          <p className="text-ceramic-600 mb-4">{error.message}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ceramic-base">
      {/* Header */}
      <header className="bg-white border-b border-ceramic-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ceramic-900">
                WhatsApp Monitoring
              </h1>
              <p className="text-sm text-ceramic-500">
                Monitoramento de instâncias Evolution API
              </p>
            </div>

            <button
              onClick={refresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-ceramic-100 hover:bg-ceramic-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Health Alerts */}
        {alerts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <HealthAlerts alerts={alerts} />
          </motion.section>
        )}

        {/* Stats Cards */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-white rounded-xl p-4 shadow-sm border border-ceramic-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-ceramic-500">Total Instâncias</p>
                <p className="text-2xl font-bold text-ceramic-900">
                  {stats?.total ?? '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-ceramic-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-ceramic-500">Total Contatos</p>
                <p className="text-2xl font-bold text-ceramic-900">
                  {stats?.totalContacts?.toLocaleString('pt-BR') ?? '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-ceramic-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-ceramic-500">Mensagens Sync</p>
                <p className="text-2xl font-bold text-ceramic-900">
                  {stats?.totalMessages?.toLocaleString('pt-BR') ?? '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-ceramic-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-ceramic-500">Com Erros</p>
                <p className="text-2xl font-bold text-ceramic-900">
                  {stats?.withErrors ?? '-'}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Charts Row */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Capacity Gauge */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-ceramic-200">
            <h3 className="text-lg font-semibold text-ceramic-900 mb-4 text-center">
              Capacidade do Servidor
            </h3>
            <CapacityGauge
              current={stats?.total ?? 0}
              max={40}
              percentage={stats?.capacityPercent ?? 0}
            />
          </div>

          {/* Status Pie Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-ceramic-200">
            <h3 className="text-lg font-semibold text-ceramic-900 mb-4 text-center">
              Status das Instâncias
            </h3>
            <StatusPieChart
              byStatus={stats?.byStatus ?? {}}
              total={stats?.total ?? 0}
              onStatusClick={handleStatusClick}
              selectedStatus={selectedStatus}
            />
          </div>
        </motion.section>

        {/* Instance Table */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <InstanceTable
            instances={instances}
            isLoading={isLoading}
            onDisconnect={handleDisconnect}
            onResetErrors={handleResetErrors}
            actioningInstance={isActioning ? currentAction?.split(':')[1] : null}
          />
        </motion.section>

        {/* Errors Log */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ErrorsLog errors={recentErrors} maxHeight="400px" />
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-ceramic-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-ceramic-500">
            <p>
              Última atualização:{' '}
              {stats?.timestamp
                ? new Date(stats.timestamp).toLocaleString('pt-BR')
                : '-'}
            </p>
            <p>Auto-refresh: 30s</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default WhatsAppMonitoringDashboard
