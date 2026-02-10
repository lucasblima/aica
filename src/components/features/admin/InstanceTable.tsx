/**
 * InstanceTable Component
 *
 * Sortable, filterable table of WhatsApp instances.
 * Supports admin actions (disconnect, reset errors).
 *
 * Issue: #129 - WhatsApp Instance Monitoring Dashboard
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Search,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Power,
  RefreshCw,
  AlertCircle,
  User,
  Phone,
  MessageSquare,
  Users,
} from 'lucide-react'
import type { AdminInstanceRow } from '@/types/adminWhatsApp'
import type { WhatsAppSessionStatus } from '@/types/whatsappSession'
import { STATUS_COLORS, STATUS_LABELS } from '@/types/adminWhatsApp'

interface InstanceTableProps {
  instances: AdminInstanceRow[]
  isLoading?: boolean
  onDisconnect?: (instanceName: string) => void
  onResetErrors?: (instanceName: string) => void
  actioningInstance?: string | null
  className?: string
}

type SortField = 'instance_name' | 'status' | 'last_activity_at' | 'contacts_count' | 'consecutive_errors'
type SortDirection = 'asc' | 'desc'

export function InstanceTable({
  instances,
  isLoading = false,
  onDisconnect,
  onResetErrors,
  actioningInstance,
  className = '',
}: InstanceTableProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('last_activity_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Filter and sort instances
  const filteredInstances = useMemo(() => {
    let result = [...instances]

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (i) =>
          i.instance_name.toLowerCase().includes(searchLower) ||
          i.user_email?.toLowerCase().includes(searchLower) ||
          i.phone_number?.includes(searchLower) ||
          i.profile_name?.toLowerCase().includes(searchLower)
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'instance_name':
          comparison = a.instance_name.localeCompare(b.instance_name)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'last_activity_at':
          comparison =
            new Date(a.last_activity_at ?? 0).getTime() -
            new Date(b.last_activity_at ?? 0).getTime()
          break
        case 'contacts_count':
          comparison = a.contacts_count - b.contacts_count
          break
        case 'consecutive_errors':
          comparison = a.consecutive_errors - b.consecutive_errors
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [instances, search, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    )
  }

  const StatusBadge = ({ status }: { status: WhatsAppSessionStatus }) => {
    const colors = STATUS_COLORS[status]
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
        {STATUS_LABELS[status]}
      </span>
    )
  }

  return (
    <div className={`bg-ceramic-base rounded-xl shadow-sm border border-ceramic-border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-ceramic-200">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-ceramic-900">Instâncias</h3>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-400" />
            <input
              type="text"
              placeholder="Buscar por instância, email, telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-ceramic-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ceramic-accent/30"
            />
          </div>

          <span className="text-sm text-ceramic-500">
            {filteredInstances.length} de {instances.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-ceramic-50">
            <tr>
              <th
                onClick={() => handleSort('instance_name')}
                className="px-4 py-3 text-left text-xs font-medium text-ceramic-500 uppercase tracking-wider cursor-pointer hover:bg-ceramic-100"
              >
                <div className="flex items-center gap-1">
                  Instância
                  <SortIcon field="instance_name" />
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="px-4 py-3 text-left text-xs font-medium text-ceramic-500 uppercase tracking-wider cursor-pointer hover:bg-ceramic-100"
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ceramic-500 uppercase tracking-wider">
                Usuário
              </th>
              <th
                onClick={() => handleSort('contacts_count')}
                className="px-4 py-3 text-left text-xs font-medium text-ceramic-500 uppercase tracking-wider cursor-pointer hover:bg-ceramic-100"
              >
                <div className="flex items-center gap-1">
                  Métricas
                  <SortIcon field="contacts_count" />
                </div>
              </th>
              <th
                onClick={() => handleSort('last_activity_at')}
                className="px-4 py-3 text-left text-xs font-medium text-ceramic-500 uppercase tracking-wider cursor-pointer hover:bg-ceramic-100"
              >
                <div className="flex items-center gap-1">
                  Última Atividade
                  <SortIcon field="last_activity_at" />
                </div>
              </th>
              <th
                onClick={() => handleSort('consecutive_errors')}
                className="px-4 py-3 text-left text-xs font-medium text-ceramic-500 uppercase tracking-wider cursor-pointer hover:bg-ceramic-100"
              >
                <div className="flex items-center gap-1">
                  Erros
                  <SortIcon field="consecutive_errors" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-ceramic-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ceramic-100">
            <AnimatePresence>
              {filteredInstances.map((instance) => (
                <motion.tr
                  key={instance.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`hover:bg-ceramic-50 ${
                    actioningInstance === instance.instance_name ? 'opacity-50' : ''
                  }`}
                >
                  {/* Instance */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ceramic-900">
                        {instance.instance_name}
                      </p>
                      {instance.phone_number && (
                        <p className="text-xs text-ceramic-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {instance.phone_number}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={instance.status} />
                  </td>

                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-ceramic-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-ceramic-500" />
                      </div>
                      <div>
                        <p className="text-sm text-ceramic-900 truncate max-w-[150px]">
                          {instance.profile_name ?? 'Sem nome'}
                        </p>
                        <p className="text-xs text-ceramic-500 truncate max-w-[150px]">
                          {instance.user_email ?? '-'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Metrics */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-xs text-ceramic-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {instance.contacts_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {instance.messages_synced_count}
                      </span>
                    </div>
                  </td>

                  {/* Last Activity */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-ceramic-600">
                      {instance.last_activity_at
                        ? formatDistanceToNow(new Date(instance.last_activity_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : '-'}
                    </p>
                  </td>

                  {/* Errors */}
                  <td className="px-4 py-3">
                    {instance.consecutive_errors > 0 ? (
                      <div className="flex items-center gap-1 text-ceramic-error">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">{instance.consecutive_errors}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-ceramic-400">-</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenuId(openMenuId === instance.id ? null : instance.id)
                        }
                        className="p-1 rounded-md hover:bg-ceramic-100"
                      >
                        <MoreVertical className="w-4 h-4 text-ceramic-500" />
                      </button>

                      {openMenuId === instance.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-ceramic-base rounded-lg shadow-lg border border-ceramic-border py-1 z-10">
                          {instance.status === 'connected' && (
                            <button
                              onClick={() => {
                                onDisconnect?.(instance.instance_name)
                                setOpenMenuId(null)
                              }}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-ceramic-50 flex items-center gap-2"
                            >
                              <Power className="w-4 h-4 text-ceramic-error" />
                              Desconectar
                            </button>
                          )}
                          {instance.consecutive_errors > 0 && (
                            <button
                              onClick={() => {
                                onResetErrors?.(instance.instance_name)
                                setOpenMenuId(null)
                              }}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-ceramic-50 flex items-center gap-2"
                            >
                              <RefreshCw className="w-4 h-4 text-amber-500" />
                              Resetar Erros
                            </button>
                          )}
                          {instance.error_message && (
                            <div className="px-4 py-2 text-xs text-ceramic-error border-t border-ceramic-border/50">
                              <p className="font-medium">Último erro:</p>
                              <p className="truncate">{instance.error_message}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {filteredInstances.length === 0 && !isLoading && (
          <div className="py-12 text-center text-ceramic-500">
            <p>Nenhuma instância encontrada</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default InstanceTable
