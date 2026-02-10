/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * IncentiveLawCard - Visual summary card for incentive laws
 * Issue #96 - Cadastro de leis de incentivo fiscal
 *
 * Componente de card para exibicao visual de leis de incentivo.
 * Mostra informacoes resumidas com cores e icones por jurisdicao.
 *
 * @module modules/grants/components/IncentiveLawCard
 */

import React from 'react';
import {
  Building2,
  MapPin,
  Landmark,
  ExternalLink,
  Percent,
  FileText,
  Scale,
  Info,
} from 'lucide-react';
import type {
  IncentiveLaw,
  IncentiveLawCardData,
  Jurisdiction,
} from '../types/incentiveLaws';
import {
  JURISDICTION_COLORS,
  TAX_TYPE_COLORS,
  toCardData,
} from '../types/incentiveLaws';

// =============================================================================
// TYPES
// =============================================================================

interface IncentiveLawCardProps {
  /** Lei de incentivo ou dados ja formatados */
  law: IncentiveLaw | IncentiveLawCardData;
  /** Callback ao clicar no card */
  onClick?: (lawId: string) => void;
  /** Se o card esta selecionado */
  selected?: boolean;
  /** Tamanho do card */
  size?: 'sm' | 'md' | 'lg';
  /** Classe CSS adicional */
  className?: string;
  /** Mostrar link externo */
  showExternalLink?: boolean;
  /** Mostrar descricao completa */
  showDescription?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function isCardData(data: IncentiveLaw | IncentiveLawCardData): data is IncentiveLawCardData {
  return 'jurisdictionLabel' in data;
}

function JurisdictionIcon({
  jurisdiction,
  size = 'md',
}: {
  jurisdiction: Jurisdiction;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  const color = JURISDICTION_COLORS[jurisdiction];

  switch (jurisdiction) {
    case 'federal':
      return <Landmark className={sizeClass} style={{ color }} />;
    case 'state':
      return <MapPin className={sizeClass} style={{ color }} />;
    case 'municipal':
      return <Building2 className={sizeClass} style={{ color }} />;
    default:
      return null;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function IncentiveLawCard({
  law,
  onClick,
  selected = false,
  size = 'md',
  className = '',
  showExternalLink = true,
  showDescription = true,
}: IncentiveLawCardProps) {
  // Convert to card data if needed
  const cardData: IncentiveLawCardData = isCardData(law) ? law : toCardData(law);

  const handleClick = () => {
    if (onClick) {
      onClick(cardData.id);
    }
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cardData.official_url) {
      window.open(cardData.official_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Size-based styles
  const sizeStyles = {
    sm: {
      padding: 'p-3',
      gap: 'gap-2',
      titleSize: 'text-sm',
      textSize: 'text-xs',
      badgeSize: 'text-xs px-1.5 py-0.5',
    },
    md: {
      padding: 'p-4',
      gap: 'gap-3',
      titleSize: 'text-base',
      textSize: 'text-sm',
      badgeSize: 'text-xs px-2 py-1',
    },
    lg: {
      padding: 'p-5',
      gap: 'gap-4',
      titleSize: 'text-lg',
      textSize: 'text-sm',
      badgeSize: 'text-sm px-2.5 py-1',
    },
  }[size];

  return (
    <div
      onClick={handleClick}
      className={`
        relative bg-ceramic-base dark:bg-ceramic-cool rounded-xl border
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600' : ''}
        ${selected
          ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
          : 'border-ceramic-border dark:border-ceramic-border'
        }
        ${sizeStyles.padding}
        ${className}
      `}
    >
      {/* Header */}
      <div className={`flex items-start justify-between ${sizeStyles.gap}`}>
        {/* Left: Icon + Title */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Jurisdiction icon */}
          <div
            className="flex-shrink-0 p-2 rounded-lg"
            style={{ backgroundColor: `${cardData.jurisdictionColor}15` }}
          >
            <JurisdictionIcon jurisdiction={cardData.jurisdiction} size={size} />
          </div>

          {/* Title & Law number */}
          <div className="min-w-0 flex-1">
            <h3 className={`font-semibold text-ceramic-text-primary dark:text-ceramic-text-primary truncate ${sizeStyles.titleSize}`}>
              {cardData.short_name}
            </h3>
            <p className={`text-ceramic-text-secondary dark:text-ceramic-text-secondary truncate ${sizeStyles.textSize}`}>
              {cardData.name}
            </p>
            {cardData.law_number && (
              <p className={`text-ceramic-text-secondary dark:text-ceramic-text-secondary flex items-center gap-1 mt-0.5 ${sizeStyles.textSize}`}>
                <Scale className="w-3 h-3" />
                {cardData.law_number}
              </p>
            )}
          </div>
        </div>

        {/* External link */}
        {showExternalLink && cardData.official_url && (
          <button
            onClick={handleExternalClick}
            className="flex-shrink-0 p-1.5 rounded-lg text-ceramic-text-secondary hover:text-amber-600 hover:bg-ceramic-base dark:hover:bg-ceramic-cool transition-colors"
            title="Abrir site oficial"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Badges */}
      <div className={`flex flex-wrap gap-2 mt-3`}>
        {/* Jurisdiction badge */}
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeStyles.badgeSize}`}
          style={{
            backgroundColor: `${cardData.jurisdictionColor}15`,
            color: cardData.jurisdictionColor,
          }}
        >
          {cardData.jurisdictionLabel}
          {cardData.location !== cardData.jurisdictionLabel && (
            <span className="opacity-75">- {cardData.location}</span>
          )}
        </span>

        {/* Tax type badge */}
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeStyles.badgeSize}`}
          style={{
            backgroundColor: `${cardData.taxTypeColor}15`,
            color: cardData.taxTypeColor,
          }}
        >
          {cardData.taxTypeLabel}
        </span>

        {/* Deduction percentage badge */}
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-ceramic-success-bg text-ceramic-success dark:bg-ceramic-success/20 dark:text-ceramic-success ${sizeStyles.badgeSize}`}
        >
          <Percent className="w-3 h-3" />
          {cardData.deductionLabel}
        </span>
      </div>

      {/* Description */}
      {showDescription && cardData.benefits_summary && (
        <div className={`mt-3 pt-3 border-t border-ceramic-border dark:border-ceramic-border`}>
          <p className={`text-ceramic-text-secondary dark:text-ceramic-text-secondary line-clamp-2 ${sizeStyles.textSize}`}>
            {cardData.benefits_summary}
          </p>
        </div>
      )}

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT VARIANT
// =============================================================================

interface IncentiveLawCardCompactProps {
  law: IncentiveLaw | IncentiveLawCardData;
  onClick?: (lawId: string) => void;
  selected?: boolean;
  className?: string;
}

/**
 * Versao compacta do card para listas e selecao
 */
export function IncentiveLawCardCompact({
  law,
  onClick,
  selected = false,
  className = '',
}: IncentiveLawCardCompactProps) {
  const cardData: IncentiveLawCardData = isCardData(law) ? law : toCardData(law);

  return (
    <div
      onClick={() => onClick?.(cardData.id)}
      className={`
        flex items-center gap-3 p-3 rounded-lg border
        transition-all duration-150
        ${onClick ? 'cursor-pointer hover:bg-ceramic-base dark:hover:bg-ceramic-cool' : ''}
        ${selected
          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
          : 'border-ceramic-border dark:border-ceramic-border bg-ceramic-base dark:bg-ceramic-cool'
        }
        ${className}
      `}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 p-1.5 rounded-md"
        style={{ backgroundColor: `${cardData.jurisdictionColor}15` }}
      >
        <JurisdictionIcon jurisdiction={cardData.jurisdiction} size="sm" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-ceramic-text-primary dark:text-ceramic-text-primary text-sm">
            {cardData.short_name}
          </span>
          <span className="text-xs text-ceramic-text-secondary">
            {cardData.location}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-ceramic-text-secondary">{cardData.taxTypeLabel}</span>
          <span className="text-xs text-ceramic-success font-medium">{cardData.deductionLabel}</span>
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500" />
      )}
    </div>
  );
}

// =============================================================================
// LIST COMPONENT
// =============================================================================

interface IncentiveLawCardListProps {
  laws: (IncentiveLaw | IncentiveLawCardData)[];
  selectedId?: string | null;
  onSelect?: (lawId: string) => void;
  variant?: 'card' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  emptyMessage?: string;
}

/**
 * Lista de cards de leis de incentivo
 */
export function IncentiveLawCardList({
  laws,
  selectedId,
  onSelect,
  variant = 'card',
  size = 'md',
  className = '',
  emptyMessage = 'Nenhuma lei de incentivo encontrada',
}: IncentiveLawCardListProps) {
  if (laws.length === 0) {
    return (
      <div className={`text-center py-8 text-ceramic-text-secondary dark:text-ceramic-text-secondary ${className}`}>
        <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const CardComponent = variant === 'compact' ? IncentiveLawCardCompact : IncentiveLawCard;

  return (
    <div className={`space-y-3 ${className}`}>
      {laws.map(law => {
        const id = isCardData(law) ? law.id : law.id;
        return (
          <CardComponent
            key={id}
            law={law}
            onClick={onSelect}
            selected={selectedId === id}
            {...(variant === 'card' ? { size } : {})}
          />
        );
      })}
    </div>
  );
}

export default IncentiveLawCard;
