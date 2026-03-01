/**
 * EthicalGuardrailsBanner — Combined Ethical Guardrails Display
 * Sprint 7 — Cross-Module Intelligence
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Meta-component that combines:
 * - GoodhartAlert (if any unacknowledged)
 * - DigitalSabbaticalPrompt (if eligible)
 * - Spiral alert from existing spiralDetectionService
 *
 * Intended to be placed at the top of the Life Score dashboard as a priority banner.
 */

import React from 'react';
import {
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { GoodhartAlert } from './GoodhartAlert';
import { DigitalSabbaticalPrompt } from './DigitalSabbaticalPrompt';
import type { GoodhartAlert as GoodhartAlertType, SabbaticalState, SabbaticalSuggestion } from '@/hooks/useCrossModuleIntelligence';
import type { SpiralAlert } from '@/services/scoring/types';

// ============================================================================
// TYPES
// ============================================================================

interface EthicalGuardrailsBannerProps {
  /** Goodhart divergence alerts */
  goodhartAlerts?: GoodhartAlertType[];
  /** Callback to acknowledge a Goodhart alert */
  onAcknowledgeAlert?: (alertId: string) => void;
  /** Sabbatical state */
  sabbatical?: SabbaticalState | null;
  /** Sabbatical suggestion */
  sabbaticalSuggestion?: SabbaticalSuggestion | null;
  /** Start sabbatical callback */
  onStartSabbatical?: (days: number) => Promise<void>;
  /** End sabbatical callback */
  onEndSabbatical?: () => Promise<void>;
  /** Spiral alert from Life Score computation */
  spiralAlert?: SpiralAlert | null;
  /** Compact mode */
  compact?: boolean;
}

// ============================================================================
// SPIRAL BANNER (INLINE)
// ============================================================================

function SpiralBanner({ alert }: { alert: SpiralAlert }) {
  if (!alert.detected) return null;

  const isCritical = alert.severity === 'critical';
  const bgClass = isCritical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const textClass = isCritical ? 'text-red-800' : 'text-amber-800';
  const iconClass = isCritical ? 'text-red-600' : 'text-amber-600';

  return (
    <div className={`${bgClass} border rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className={`${iconClass} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium ${textClass}`}>
            {isCritical ? 'Espiral Negativa Detectada' : 'Atenção: Declínio Correlacionado'}
          </h4>
          <p className={`text-xs mt-1 ${textClass} opacity-80`}>
            {alert.message}
          </p>
          {alert.decliningDomains.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {alert.decliningDomains.map(domain => (
                <span
                  key={domain}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${textClass} bg-white/50`}
                >
                  {domain}
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
// MAIN COMPONENT
// ============================================================================

export function EthicalGuardrailsBanner({
  goodhartAlerts = [],
  onAcknowledgeAlert,
  sabbatical,
  sabbaticalSuggestion,
  onStartSabbatical,
  onEndSabbatical,
  spiralAlert,
  compact = false,
}: EthicalGuardrailsBannerProps) {
  const unacknowledgedAlerts = goodhartAlerts.filter(a => !a.acknowledged);
  const hasSpiralAlert = spiralAlert?.detected === true;
  const hasGoodhartAlerts = unacknowledgedAlerts.length > 0;
  const hasSabbaticalContent = sabbatical?.isOnSabbatical || sabbaticalSuggestion?.eligible;

  // Don't render anything if there's nothing to show
  if (!hasSpiralAlert && !hasGoodhartAlerts && !hasSabbaticalContent) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header — only show if multiple guardrails are active */}
      {(hasSpiralAlert || hasGoodhartAlerts) && hasSabbaticalContent && !compact && (
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-ceramic-text-secondary" />
          <span className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wide">
            Guardiões Éticos
          </span>
        </div>
      )}

      {/* Spiral Alert — highest priority */}
      {hasSpiralAlert && spiralAlert && (
        <SpiralBanner alert={spiralAlert} />
      )}

      {/* Goodhart Alerts */}
      {hasGoodhartAlerts && (
        <div className="space-y-2">
          {unacknowledgedAlerts.slice(0, compact ? 1 : 3).map(alert => (
            <GoodhartAlert
              key={alert.id}
              alert={alert}
              onAcknowledge={onAcknowledgeAlert}
              compact={compact}
            />
          ))}
          {compact && unacknowledgedAlerts.length > 1 && (
            <p className="text-xs text-ceramic-text-secondary pl-2">
              +{unacknowledgedAlerts.length - 1} {unacknowledgedAlerts.length - 1 === 1 ? 'alerta' : 'alertas'}
            </p>
          )}
        </div>
      )}

      {/* Sabbatical Prompt */}
      {hasSabbaticalContent && onStartSabbatical && onEndSabbatical && (
        <DigitalSabbaticalPrompt
          sabbatical={sabbatical ?? null}
          suggestion={sabbaticalSuggestion ?? null}
          onStartSabbatical={onStartSabbatical}
          onEndSabbatical={onEndSabbatical}
          compact={compact}
        />
      )}
    </div>
  );
}

export default EthicalGuardrailsBanner;
