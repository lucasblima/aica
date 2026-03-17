/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * IncentiveLawSelector - Dropdown for selecting incentive laws
 * Issue #96 - Cadastro de leis de incentivo fiscal
 *
 * Componente de selecao de leis de incentivo fiscal.
 * Exibe lista de leis com icones de jurisdicao e tipo de imposto.
 *
 * @module modules/grants/components/IncentiveLawSelector
 */

import React, { useMemo } from 'react';
import { ChevronDown, Building2, MapPin, Landmark, AlertCircle } from 'lucide-react';
import { useIncentiveLawSummaries } from '../hooks/useIncentiveLaws';
import {
  JURISDICTION_LABELS,
  TAX_TYPE_LABELS,
  JURISDICTION_COLORS,
  formatLawLocation,
  type IncentiveLawSummary,
  type Jurisdiction,
} from '../types/incentiveLaws';

// =============================================================================
// TYPES
// =============================================================================

interface IncentiveLawSelectorProps {
  /** ID da lei selecionada */
  value: string | null;
  /** Callback quando uma lei e selecionada */
  onChange: (lawId: string | null) => void;
  /** Placeholder quando nenhuma lei selecionada */
  placeholder?: string;
  /** Label do campo */
  label?: string;
  /** Se o campo e obrigatório */
  required?: boolean;
  /** Se o campo esta desabilitado */
  disabled?: boolean;
  /** Classe CSS adicional */
  className?: string;
  /** Mensagem de erro */
  error?: string;
  /** Filtrar por jurisdicao */
  jurisdictionFilter?: Jurisdiction;
  /** Mostrar apenas leis com determinado tipo de imposto */
  taxTypeFilter?: string;
}

// =============================================================================
// JURISDICTION ICON
// =============================================================================

function JurisdictionIcon({ jurisdiction }: { jurisdiction: Jurisdiction }) {
  const color = JURISDICTION_COLORS[jurisdiction];

  switch (jurisdiction) {
    case 'federal':
      return <Landmark className="w-4 h-4" style={{ color }} />;
    case 'state':
      return <MapPin className="w-4 h-4" style={{ color }} />;
    case 'municipal':
      return <Building2 className="w-4 h-4" style={{ color }} />;
    default:
      return null;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function IncentiveLawSelector({
  value,
  onChange,
  placeholder = 'Selecione uma lei de incentivo',
  label,
  required = false,
  disabled = false,
  className = '',
  error,
  jurisdictionFilter,
  taxTypeFilter,
}: IncentiveLawSelectorProps) {
  const { summaries, isLoading, error: fetchError } = useIncentiveLawSummaries();

  // Filter summaries based on props
  const filteredSummaries = useMemo(() => {
    let result = summaries;

    if (jurisdictionFilter) {
      result = result.filter(s => s.jurisdiction === jurisdictionFilter);
    }

    if (taxTypeFilter) {
      result = result.filter(s => s.tax_type === taxTypeFilter);
    }

    return result;
  }, [summaries, jurisdictionFilter, taxTypeFilter]);

  // Group by jurisdiction for better UX
  const groupedSummaries = useMemo(() => {
    const groups: Record<Jurisdiction, IncentiveLawSummary[]> = {
      federal: [],
      state: [],
      municipal: [],
    };

    filteredSummaries.forEach(summary => {
      groups[summary.jurisdiction].push(summary);
    });

    return groups;
  }, [filteredSummaries]);

  // Find selected law
  const selectedLaw = useMemo(() => {
    return summaries.find(s => s.id === value) || null;
  }, [summaries, value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    onChange(newValue === '' ? null : newValue);
  };

  const hasError = !!error || !!fetchError;
  const errorMessage = error || fetchError;

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-ceramic-text-primary dark:text-ceramic-text-primary">
          {label}
          {required && <span className="text-ceramic-error ml-1">*</span>}
        </label>
      )}

      {/* Select wrapper */}
      <div className="relative">
        <select
          value={value || ''}
          onChange={handleChange}
          disabled={disabled || isLoading}
          className={`
            w-full appearance-none rounded-lg border bg-ceramic-base dark:bg-ceramic-cool
            pl-3 pr-10 py-2.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-offset-0
            transition-colors
            ${hasError
              ? 'border-ceramic-error focus:border-ceramic-error focus:ring-ceramic-error'
              : 'border-ceramic-border dark:border-ceramic-border focus:border-amber-500 focus:ring-amber-500'
            }
            ${disabled ? 'bg-ceramic-base dark:bg-ceramic-cool cursor-not-allowed' : 'cursor-pointer'}
            ${isLoading ? 'animate-pulse' : ''}
          `}
        >
          <option value="">{isLoading ? 'Carregando...' : placeholder}</option>

          {/* Federal laws */}
          {groupedSummaries.federal.length > 0 && (
            <optgroup label="Federal">
              {groupedSummaries.federal.map(law => (
                <option key={law.id} value={law.id}>
                  {law.short_name} - {law.name}
                  {law.max_deduction_percentage && ` (${law.max_deduction_percentage}% ${law.tax_type})`}
                </option>
              ))}
            </optgroup>
          )}

          {/* State laws */}
          {groupedSummaries.state.length > 0 && (
            <optgroup label="Estadual">
              {groupedSummaries.state.map(law => (
                <option key={law.id} value={law.id}>
                  {law.short_name} ({law.state}) - {law.name}
                  {law.max_deduction_percentage && ` (${law.max_deduction_percentage}% ${law.tax_type})`}
                </option>
              ))}
            </optgroup>
          )}

          {/* Municipal laws */}
          {groupedSummaries.municipal.length > 0 && (
            <optgroup label="Municipal">
              {groupedSummaries.municipal.map(law => (
                <option key={law.id} value={law.id}>
                  {law.short_name} ({law.city}) - {law.name}
                  {law.max_deduction_percentage && ` (${law.max_deduction_percentage}% ${law.tax_type})`}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Chevron icon */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDown className="h-5 w-5 text-ceramic-text-secondary" />
        </div>
      </div>

      {/* Selected law preview */}
      {selectedLaw && !hasError && (
        <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-ceramic-base dark:bg-ceramic-cool rounded-lg text-sm">
          <JurisdictionIcon jurisdiction={selectedLaw.jurisdiction} />
          <span className="text-ceramic-text-secondary dark:text-ceramic-text-secondary">
            {JURISDICTION_LABELS[selectedLaw.jurisdiction]}
            {selectedLaw.state && ` - ${formatLawLocation(selectedLaw)}`}
          </span>
          <span className="mx-1 text-ceramic-text-secondary">|</span>
          <span className="text-ceramic-text-secondary dark:text-ceramic-text-secondary">
            {TAX_TYPE_LABELS[selectedLaw.tax_type]}
          </span>
          {selectedLaw.max_deduction_percentage && (
            <>
              <span className="mx-1 text-ceramic-text-secondary">|</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Ate {selectedLaw.max_deduction_percentage}%
              </span>
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <div className="flex items-center gap-1.5 text-sm text-ceramic-error dark:text-ceramic-error">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

export default IncentiveLawSelector;
