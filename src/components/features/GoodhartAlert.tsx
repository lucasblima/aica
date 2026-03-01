/**
 * GoodhartAlert — Goodhart's Law Divergence Alert Banner
 * Sprint 7 — Cross-Module Intelligence
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Small alert banner shown when Life Score diverges from health indicators.
 * "When a measure becomes a target, it ceases to be a good measure."
 *
 * Severity colors:
 * - info: ceramic-info (blue)
 * - warning: ceramic-warning (amber)
 * - critical: ceramic-error (red)
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, X, Info } from 'lucide-react';
import type { GoodhartAlert as GoodhartAlertType } from '@/hooks/useCrossModuleIntelligence';

// ============================================================================
// TYPES
// ============================================================================

interface GoodhartAlertProps {
  /** The alert data */
  alert: GoodhartAlertType;
  /** Callback when user acknowledges the alert */
  onAcknowledge?: (alertId: string) => void;
  /** Callback when user dismisses (hides) the alert without acknowledging */
  onDismiss?: (alertId: string) => void;
  /** Compact mode (single line, no details) */
  compact?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getSeverityConfig(severity: GoodhartAlertType['severity']) {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        textMuted: 'text-red-600',
        buttonBg: 'bg-red-100 hover:bg-red-200 text-red-700',
        Icon: AlertTriangle,
      };
    case 'warning':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        textMuted: 'text-amber-600',
        buttonBg: 'bg-amber-100 hover:bg-amber-200 text-amber-700',
        Icon: AlertTriangle,
      };
    case 'info':
    default:
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        textMuted: 'text-blue-600',
        buttonBg: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
        Icon: Info,
      };
  }
}

function getSeverityLabel(severity: GoodhartAlertType['severity']): string {
  switch (severity) {
    case 'critical': return 'Divergência Crítica';
    case 'warning': return 'Atenção';
    case 'info': return 'Informação';
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GoodhartAlert({
  alert,
  onAcknowledge,
  onDismiss,
  compact = false,
}: GoodhartAlertProps) {
  const [acknowledging, setAcknowledging] = useState(false);
  const config = getSeverityConfig(alert.severity);
  const { Icon } = config;

  const handleAcknowledge = async () => {
    if (!onAcknowledge) return;
    setAcknowledging(true);
    try {
      onAcknowledge(alert.id);
    } finally {
      setAcknowledging(false);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg} border ${config.border}`}>
        <Icon size={14} className={config.textMuted} />
        <span className={`text-xs ${config.text} flex-1 truncate`}>
          {alert.message}
        </span>
        {onAcknowledge && (
          <button
            onClick={handleAcknowledge}
            disabled={acknowledging}
            className={`text-xs px-2 py-0.5 rounded ${config.buttonBg} transition-colors disabled:opacity-50`}
          >
            Entendi
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${config.bg} border ${config.border} rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Icon size={18} className={config.textMuted} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium uppercase tracking-wide ${config.textMuted}`}>
              {getSeverityLabel(alert.severity)}
            </span>
          </div>
          <p className={`text-sm mt-1 ${config.text}`}>
            {alert.message}
          </p>

          {/* Affected Domains */}
          {alert.affectedDomains.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {alert.affectedDomains.map(domain => (
                <span
                  key={domain}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${config.textMuted} bg-white/50`}
                >
                  {domain}
                </span>
              ))}
            </div>
          )}

          {/* Acknowledge Button */}
          {onAcknowledge && (
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${config.buttonBg} transition-colors disabled:opacity-50`}
            >
              <CheckCircle size={14} />
              {acknowledging ? 'Processando...' : 'Entendi'}
            </button>
          )}
        </div>

        {/* Dismiss */}
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className={`flex-shrink-0 ${config.textMuted} hover:opacity-70 transition-opacity`}
            title="Dispensar"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export default GoodhartAlert;
