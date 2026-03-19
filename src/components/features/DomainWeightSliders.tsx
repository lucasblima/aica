/**
 * DomainWeightSliders — Life Score Weight Configuration
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Lets users customize how much each AICA domain contributes to their Life Score.
 * Supports slider mode (quick) and AHP mode (scientific pairwise comparison).
 * Includes active/inactive domain toggles.
 * Follows Ceramic Design System.
 */

import React, { useState, useCallback } from 'react';
import { Sliders, Scale, RotateCcw } from 'lucide-react';
import type { AicaDomain } from '@/services/scoring/types';
import { ALL_AICA_DOMAINS, DEFAULT_DOMAIN_WEIGHTS, DEFAULT_ACTIVE_DOMAINS } from '@/services/scoring/types';
import { DOMAIN_LABELS } from '@/services/scoring/lifeScoreService';

// ============================================================================
// CONSTANTS
// ============================================================================

const DOMAIN_ICONS: Record<AicaDomain, string> = {
  atlas: '🎯',
  journey: '🧘',
  connections: '🤝',
  finance: '💰',
  grants: '🎓',
  studio: '🎙️',
  flux: '💪',
};

// ============================================================================
// COMPONENT
// ============================================================================

interface DomainWeightSlidersProps {
  /** Current weights */
  weights: Record<AicaDomain, number>;
  /** Callback when weights change */
  onWeightsChange: (weights: Record<AicaDomain, number>) => void;
  /** Callback when user saves */
  onSave?: (weights: Record<AicaDomain, number>) => void;
  /** Currently active domains */
  activeDomains: AicaDomain[];
  /** Callback when active domains change */
  onActiveDomainsChange: (domains: AicaDomain[]) => void;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const DomainWeightSliders: React.FC<DomainWeightSlidersProps> = ({
  weights,
  onWeightsChange,
  onSave,
  activeDomains,
  onActiveDomainsChange,
  isSaving = false,
  className = '',
}) => {
  const [localWeights, setLocalWeights] = useState<Record<AicaDomain, number>>({ ...weights });

  const handleSliderChange = useCallback((domain: AicaDomain, value: number) => {
    const updated = { ...localWeights, [domain]: value };
    setLocalWeights(updated);
    onWeightsChange(updated);
  }, [localWeights, onWeightsChange]);

  const handleToggleDomain = useCallback((domain: AicaDomain) => {
    const isActive = activeDomains.includes(domain);
    const updated = isActive
      ? activeDomains.filter(d => d !== domain)
      : [...activeDomains, domain];
    // Prevent deactivating all domains
    if (updated.length === 0) return;
    onActiveDomainsChange(updated);
  }, [activeDomains, onActiveDomainsChange]);

  const handleReset = useCallback(() => {
    const defaults = { ...DEFAULT_DOMAIN_WEIGHTS };
    setLocalWeights(defaults);
    onWeightsChange(defaults);
    onActiveDomainsChange([...DEFAULT_ACTIVE_DOMAINS]);
  }, [onWeightsChange, onActiveDomainsChange]);

  const handleSave = useCallback(() => {
    onSave?.(localWeights);
  }, [localWeights, onSave]);

  // Compute relative percentages for display (only active domains)
  const totalWeight = ALL_AICA_DOMAINS
    .filter(d => activeDomains.includes(d))
    .reduce((sum, d) => sum + (localWeights[d] ?? 1), 0);

  return (
    <div
      className={`bg-ceramic-50 rounded-xl p-4 shadow-ceramic-emboss ${className}`}
      data-testid="domain-weight-sliders"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sliders size={18} className="text-ceramic-accent" />
          <h3 className="text-sm font-medium text-ceramic-text-primary">
            Pesos do Life Score
          </h3>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          title="Restaurar pesos iguais e domínios padrão"
        >
          <RotateCcw size={12} />
          Restaurar
        </button>
      </div>

      <p className="text-xs text-ceramic-text-secondary mb-4">
        Ative ou desative áreas e ajuste a importância de cada uma para seu Life Score.
      </p>

      {/* Sliders */}
      <div className="space-y-3">
        {ALL_AICA_DOMAINS.map(domain => {
          const isActive = activeDomains.includes(domain);
          const weight = localWeights[domain] ?? 1;
          const percentage = isActive && totalWeight > 0
            ? ((weight / totalWeight) * 100).toFixed(0)
            : '—';

          return (
            <div
              key={domain}
              className={`flex items-center gap-3 transition-opacity ${isActive ? '' : 'opacity-40'}`}
            >
              {/* Toggle */}
              <button
                onClick={() => handleToggleDomain(domain)}
                className={`relative w-8 h-[18px] rounded-full transition-colors shrink-0 ${
                  isActive
                    ? 'bg-ceramic-accent'
                    : 'bg-ceramic-border'
                }`}
                aria-label={`${isActive ? 'Desativar' : 'Ativar'} ${DOMAIN_LABELS[domain]}`}
              >
                <span
                  className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${
                    isActive ? 'left-[16px]' : 'left-[2px]'
                  }`}
                />
              </button>

              <span className="text-base w-6 text-center" title={DOMAIN_LABELS[domain]}>
                {DOMAIN_ICONS[domain]}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-ceramic-text-primary">
                    {DOMAIN_LABELS[domain]}
                  </span>
                  <span className="text-xs text-ceramic-text-secondary">
                    {percentage}{isActive ? '%' : ''}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.1}
                  value={weight}
                  onChange={e => handleSliderChange(domain, parseFloat(e.target.value))}
                  disabled={!isActive}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                    bg-ceramic-border
                    disabled:cursor-not-allowed
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-ceramic-accent
                    [&::-webkit-slider-thumb]:shadow-sm
                    [&::-webkit-slider-thumb]:cursor-pointer
                    disabled:[&::-webkit-slider-thumb]:bg-ceramic-border
                    disabled:[&::-webkit-slider-thumb]:cursor-not-allowed"
                  aria-label={`Peso para ${DOMAIN_LABELS[domain]}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Save button */}
      {onSave && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="mt-4 w-full bg-ceramic-accent hover:bg-amber-600 disabled:opacity-50
            text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {isSaving ? 'Salvando...' : 'Salvar Pesos'}
        </button>
      )}

      {/* AHP teaser */}
      <div className="mt-3 pt-3 border-t border-ceramic-border">
        <div className="flex items-center gap-1.5 text-xs text-ceramic-text-secondary">
          <Scale size={12} />
          <span>
            Para pesos cientificamente consistentes, use o{' '}
            <button className="text-ceramic-accent hover:underline">
              método AHP (comparação pareada)
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};
