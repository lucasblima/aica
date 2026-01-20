/**
 * ErrorsLog Component
 *
 * Scrollable list of recent WhatsApp errors and problematic sessions.
 *
 * Issue: #129 - WhatsApp Instance Monitoring Dashboard
 */

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertCircle, AlertTriangle, Ban, WifiOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AdminErrorEntry } from '@/types/adminWhatsApp'
import type { WhatsAppSessionStatus } from '@/types/whatsappSession'

interface ErrorsLogProps {
  errors: AdminErrorEntry[]
  maxHeight?: string
  className?: string
}

const getErrorIcon = (status: WhatsAppSessionStatus, hasError: boolean) => {
  if (status === 'banned') return <Ban className="w-4 h-4 text-red-700" />
  if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />
  if (status === 'disconnected') return <WifiOff className="w-4 h-4 text-gray-500" />
  if (hasError) return <AlertTriangle className="w-4 h-4 text-amber-500" />
  return <AlertCircle className="w-4 h-4 text-gray-400" />
}

const getSeverityColor = (status: WhatsAppSessionStatus, consecutiveErrors: number) => {
  if (status === 'banned') return 'border-l-red-700 bg-red-50'
  if (status === 'error' || consecutiveErrors >= 5) return 'border-l-red-500 bg-red-50'
  if (consecutiveErrors >= 3) return 'border-l-amber-500 bg-amber-50'
  if (status === 'disconnected') return 'border-l-gray-400 bg-gray-50'
  return 'border-l-gray-300 bg-white'
}

export function ErrorsLog({
  errors,
  maxHeight = '400px',
  className = '',
}: ErrorsLogProps) {
  if (errors.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-ceramic-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-ceramic-900 mb-4">Erros Recentes</h3>
        <div className="flex flex-col items-center justify-center py-8 text-ceramic-400">
          <AlertCircle className="w-12 h-12 mb-2" />
          <p>Nenhum erro recente</p>
          <p className="text-sm">Todas as instâncias estão funcionando normalmente</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-ceramic-200 ${className}`}>
      <div className="p-4 border-b border-ceramic-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ceramic-900">Erros Recentes</h3>
        <span className="text-sm text-ceramic-500">{errors.length} registros</span>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight }}>
        <AnimatePresence>
          {errors.map((error, index) => (
            <motion.div
              key={error.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 border-l-4 border-b border-ceramic-100 last:border-b-0 ${getSeverityColor(
                error.status,
                error.consecutive_errors
              )}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getErrorIcon(error.status, !!error.error_message)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ceramic-900 truncate">
                      {error.instance_name}
                    </p>
                    <span className="text-xs text-ceramic-500 flex-shrink-0">
                      {error.updated_at
                        ? formatDistanceToNow(new Date(error.updated_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : '-'}
                    </span>
                  </div>

                  {error.user_email && (
                    <p className="text-xs text-ceramic-500 truncate">{error.user_email}</p>
                  )}

                  {error.error_message && (
                    <p className="mt-1 text-sm text-red-600 line-clamp-2">
                      {error.error_message}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        error.status === 'banned'
                          ? 'bg-red-100 text-red-700'
                          : error.status === 'error'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {error.status}
                    </span>

                    {error.consecutive_errors > 0 && (
                      <span className="text-amber-600">
                        {error.consecutive_errors} erros consecutivos
                      </span>
                    )}

                    {error.error_code && (
                      <span className="text-ceramic-400">Código: {error.error_code}</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default ErrorsLog
