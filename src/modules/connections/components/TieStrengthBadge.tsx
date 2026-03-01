/**
 * TieStrengthBadge Component
 * Sprint 4: Connections — Small badge for contact cards
 *
 * Displays tie strength as a compact badge with color coding.
 * Shows the Granovetter-derived tie strength value.
 */

import React from 'react';
import { Link2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface TieStrengthBadgeProps {
  tieStrength: number | null;
  dunbarLayer?: number | null;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getTieLevel(strength: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (strength >= 0.75) {
    return {
      label: 'Forte',
      color: '#6B7B5C',   // ceramic-success
      bgColor: '#6B7B5C15',
    };
  }
  if (strength >= 0.50) {
    return {
      label: 'Moderado',
      color: '#D97706',   // amber-600 (ceramic accent)
      bgColor: '#D9770615',
    };
  }
  if (strength >= 0.25) {
    return {
      label: 'Fraco',
      color: '#C4883A',   // ceramic-warning
      bgColor: '#C4883A15',
    };
  }
  return {
    label: 'Tenue',
    color: '#948D82',     // ceramic-text-secondary
    bgColor: '#948D8215',
  };
}

function getDunbarLabel(layer: number): string {
  switch (layer) {
    case 5: return 'Intimo';
    case 15: return 'Proximo';
    case 50: return 'Regular';
    case 150: return 'Ativo';
    case 500: return 'Conhecido';
    default: return '';
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TieStrengthBadge({
  tieStrength,
  dunbarLayer,
  showLabel = false,
  size = 'sm',
  className = '',
}: TieStrengthBadgeProps) {
  if (tieStrength === null || tieStrength === undefined) {
    return null;
  }

  const { label, color, bgColor } = getTieLevel(tieStrength);
  const isSm = size === 'sm';

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full ${
        isSm ? 'px-2 py-0.5' : 'px-3 py-1'
      } ${className}`}
      style={{ backgroundColor: bgColor }}
      title={`Forca do vinculo: ${(tieStrength * 100).toFixed(0)}% (${label})`}
    >
      <Link2
        className={isSm ? 'w-3 h-3' : 'w-4 h-4'}
        style={{ color }}
      />
      <span
        className={`font-bold ${isSm ? 'text-[10px]' : 'text-xs'}`}
        style={{ color }}
      >
        {(tieStrength * 100).toFixed(0)}%
      </span>
      {showLabel && (
        <span
          className={`${isSm ? 'text-[10px]' : 'text-xs'}`}
          style={{ color }}
        >
          {label}
        </span>
      )}
      {dunbarLayer && (
        <span
          className={`${isSm ? 'text-[9px]' : 'text-[10px]'} opacity-70`}
          style={{ color }}
        >
          {getDunbarLabel(dunbarLayer)}
        </span>
      )}
    </div>
  );
}

export default TieStrengthBadge;
