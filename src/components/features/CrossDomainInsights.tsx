/**
 * CrossDomainInsights — Cross-Domain Intelligence Panel
 * Sprint 7 — Cross-Module Intelligence
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Ceramic design panel showing:
 * - Correlation Matrix: significant domain correlations with strength indicators
 * - Spiral Alert: warning banner when correlated domains decline
 * - Goodhart Alerts: unacknowledged divergence alerts
 */

import React from 'react';
import {
  GitBranch,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  CheckCircle,
} from 'lucide-react';
import type { CorrelationResult, GoodhartAlert } from '@/hooks/useCrossModuleIntelligence';
import type { SpiralAlert } from '@/services/scoring/types';
import { DOMAIN_LABELS } from '@/services/scoring/lifeScoreService';
import type { AicaDomain } from '@/services/scoring/types';

// ============================================================================
// TYPES
// ============================================================================

interface CrossDomainInsightsProps {
  /** Domain correlations */
  correlations: CorrelationResult[];
  /** Spiral alert (from detectSpiral) */
  spiralAlert?: SpiralAlert | null;
  /** Goodhart divergence alerts */
  goodhartAlerts?: GoodhartAlert[];
  /** Callback to acknowledge a Goodhart alert */
  onAcknowledgeAlert?: (alertId: string) => void;
  /** Compact mode (less padding, fewer details) */
  compact?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getDomainLabel(domain: string): string {
  return DOMAIN_LABELS[domain as AicaDomain] ?? domain;
}

function getStrengthColor(strength: CorrelationResult['strength'], direction: CorrelationResult['direction']): string {
  if (strength === 'negligible') return 'text-ceramic-text-secondary';
  if (direction === 'positive') {
    if (strength === 'strong') return 'text-green-700';
    if (strength === 'moderate') return 'text-green-600';
    return 'text-green-500';
  }
  // negative
  if (strength === 'strong') return 'text-red-700';
  if (strength === 'moderate') return 'text-red-600';
  return 'text-red-500';
}

function getStrengthBg(strength: CorrelationResult['strength'], direction: CorrelationResult['direction']): string {
  if (strength === 'negligible') return 'bg-ceramic-cool/50';
  if (direction === 'positive') {
    if (strength === 'strong') return 'bg-green-50';
    return 'bg-green-50/60';
  }
  if (strength === 'strong') return 'bg-red-50';
  return 'bg-red-50/60';
}

function getStrengthLabel(strength: CorrelationResult['strength']): string {
  switch (strength) {
    case 'strong': return 'Forte';
    case 'moderate': return 'Moderada';
    case 'weak': return 'Fraca';
    case 'negligible': return 'Insignificante';
  }
}

function getSeverityStyles(severity: 'info' | 'warning' | 'critical'): { bg: string; border: string; icon: string } {
  switch (severity) {
    case 'critical':
      return { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600' };
    case 'warning':
      return { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600' };
    default:
      return { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' };
  }
}

// ============================================================================
// CORRELATION ITEM
// ============================================================================

function CorrelationItem({ correlation }: { correlation: CorrelationResult }) {
  const colorClass = getStrengthColor(correlation.strength, correlation.direction);
  const bgClass = getStrengthBg(correlation.strength, correlation.direction);
  const DirectionIcon = correlation.direction === 'positive' ? TrendingUp : TrendingDown;

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${bgClass}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <ArrowRightLeft size={14} className="text-ceramic-text-secondary flex-shrink-0" />
        <span className="text-sm text-ceramic-text-primary truncate">
          {getDomainLabel(correlation.domainA)}
        </span>
        <span className="text-xs text-ceramic-text-secondary">↔</span>
        <span className="text-sm text-ceramic-text-primary truncate">
          {getDomainLabel(correlation.domainB)}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <DirectionIcon size={14} className={colorClass} />
        <span className={`text-xs font-medium ${colorClass}`}>
          {getStrengthLabel(correlation.strength)}
        </span>
        <span className="text-xs text-ceramic-text-secondary">
          ({(correlation.coefficient * 100).toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// SPIRAL ALERT SECTION
// ============================================================================

function SpiralAlertSection({ alert }: { alert: SpiralAlert }) {
  if (!alert.detected) return null;

  const severityStyles = alert.severity === 'critical'
    ? { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-600' }
    : { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-600' };

  return (
    <div className={`${severityStyles.bg} border ${severityStyles.border} rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className={`${severityStyles.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium ${severityStyles.text}`}>
            {alert.severity === 'critical' ? 'Espiral Negativa Detectada' : 'Atenção: Declínio Correlacionado'}
          </h4>
          <p className={`text-xs mt-1 ${severityStyles.text} opacity-80`}>
            {alert.message}
          </p>
          {alert.decliningDomains.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {alert.decliningDomains.map(domain => (
                <span
                  key={domain}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${severityStyles.text} bg-white/50`}
                >
                  {getDomainLabel(domain)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GOODHART ALERT ITEM
// ============================================================================

function GoodhartAlertItem({
  alert,
  onAcknowledge,
}: {
  alert: GoodhartAlert;
  onAcknowledge?: (id: string) => void;
}) {
  const styles = getSeverityStyles(alert.severity);

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-lg p-3`}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className={`${styles.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-ceramic-text-primary">{alert.message}</p>
          {alert.affectedDomains.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {alert.affectedDomains.map(domain => (
                <span
                  key={domain}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-ceramic-text-secondary bg-white/50"
                >
                  {getDomainLabel(domain)}
                </span>
              ))}
            </div>
          )}
        </div>
        {onAcknowledge && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="flex-shrink-0 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors px-2 py-1 rounded hover:bg-white/50"
            title="Reconhecer alerta"
          >
            <CheckCircle size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CrossDomainInsights({
  correlations,
  spiralAlert,
  goodhartAlerts = [],
  onAcknowledgeAlert,
  compact = false,
}: CrossDomainInsightsProps) {
  const significantCorrelations = correlations.filter(c => c.isSignificant && c.strength !== 'negligible');
  const unacknowledgedAlerts = goodhartAlerts.filter(a => !a.acknowledged);
  const hasContent = significantCorrelations.length > 0 || spiralAlert?.detected || unacknowledgedAlerts.length > 0;

  if (!hasContent && compact) return null;

  return (
    <div className={`bg-ceramic-50 rounded-xl shadow-ceramic-emboss ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <GitBranch size={18} className="text-ceramic-text-secondary" />
        <h3 className="text-sm font-medium text-ceramic-text-primary">
          Inteligência Cross-Domínio
        </h3>
      </div>

      <div className="space-y-4">
        {/* Spiral Alert */}
        {spiralAlert?.detected && (
          <SpiralAlertSection alert={spiralAlert} />
        )}

        {/* Goodhart Alerts */}
        {unacknowledgedAlerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wide">
              Alertas de Divergência
            </h4>
            {unacknowledgedAlerts.map(alert => (
              <GoodhartAlertItem
                key={alert.id}
                alert={alert}
                onAcknowledge={onAcknowledgeAlert}
              />
            ))}
          </div>
        )}

        {/* Correlation Matrix */}
        {significantCorrelations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wide">
              Correlações entre Domínios
            </h4>
            <div className="space-y-1.5">
              {significantCorrelations
                .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
                .slice(0, compact ? 3 : 10)
                .map((correlation, idx) => (
                  <CorrelationItem key={idx} correlation={correlation} />
                ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasContent && (
          <div className="text-center py-6">
            <GitBranch size={24} className="text-ceramic-text-secondary mx-auto mb-2 opacity-50" />
            <p className="text-xs text-ceramic-text-secondary">
              Nenhuma correlação significativa encontrada ainda.
            </p>
            <p className="text-xs text-ceramic-text-secondary mt-1">
              Continue usando o AICA para gerar dados suficientes para análise.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CrossDomainInsights;
