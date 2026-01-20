/**
 * HealthAlerts Component
 *
 * Displays health alerts for the WhatsApp monitoring dashboard.
 * Shows capacity warnings, error rates, banned instances, etc.
 *
 * Issue: #129 - WhatsApp Instance Monitoring Dashboard
 */

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, AlertCircle, XCircle, Info, X } from 'lucide-react'
import type { AdminHealthAlert } from '@/types/adminWhatsApp'

interface HealthAlertsProps {
  alerts: AdminHealthAlert[]
  onDismiss?: (alertId: string) => void
  className?: string
}

const SEVERITY_CONFIG = {
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    iconColor: 'text-amber-500',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconColor: 'text-red-500',
  },
  critical: {
    icon: XCircle,
    bg: 'bg-red-100',
    border: 'border-red-300',
    text: 'text-red-900',
    iconColor: 'text-red-600',
  },
}

export function HealthAlerts({
  alerts,
  onDismiss,
  className = '',
}: HealthAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Sistema saudável</p>
            <p className="text-sm text-green-600">
              Todas as métricas estão dentro dos parâmetros normais
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Sort by severity (critical first)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { critical: 0, error: 1, warning: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  return (
    <div className={`space-y-3 ${className}`}>
      <AnimatePresence>
        {sortedAlerts.map((alert, index) => {
          const config = SEVERITY_CONFIG[alert.severity]
          const Icon = config.icon

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-4 rounded-xl border ${config.bg} ${config.border}`}
              role="alert"
              aria-live={alert.severity === 'critical' ? 'assertive' : 'polite'}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />

                <div className="flex-1">
                  <p className={`font-medium ${config.text}`}>{alert.message}</p>

                  {alert.instanceName && (
                    <p className="text-sm text-ceramic-600 mt-1">
                      Instância: {alert.instanceName}
                    </p>
                  )}

                  <p className="text-xs text-ceramic-500 mt-2">
                    {new Date(alert.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>

                {onDismiss && (
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="flex-shrink-0 p-1 rounded-md hover:bg-white/50 transition-colors"
                    aria-label="Dispensar alerta"
                  >
                    <X className="w-4 h-4 text-ceramic-500" />
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default HealthAlerts
