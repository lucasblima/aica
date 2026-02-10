/**
 * ContactFilters Component
 * Filter chips and sort options for contact list
 *
 * Issue #92: feat(whatsapp): Exibir lista de contatos sincronizados com UI rica
 */

import React from 'react';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ContactFilterType,
  ContactSortField,
  ContactSortOrder,
} from '../hooks/useContactFilters';

export interface ContactFiltersProps {
  /** Active filter */
  activeFilter: ContactFilterType;
  /** Sort field */
  sortField: ContactSortField;
  /** Sort order */
  sortOrder: ContactSortOrder;
  /** Stats for badge counts */
  stats: {
    total: number;
    filtered: number;
    favorites: number;
    recent: number;
    atRisk: number;
    inactive: number;
  };
  /** Callback when filter changes */
  onFilterChange: (filter: ContactFilterType) => void;
  /** Callback when sort field changes */
  onSortChange: (field: ContactSortField) => void;
  /** Callback when sort order toggles */
  onSortOrderToggle: () => void;
  /** Additional CSS classes */
  className?: string;
}

interface FilterChipProps {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  variant?: 'default' | 'warning' | 'danger';
}

function FilterChip({ label, count, isActive, onClick, variant = 'default' }: FilterChipProps) {
  const variantClasses = {
    default: isActive
      ? 'bg-ceramic-info-bg text-ceramic-info border-ceramic-info/30'
      : 'bg-ceramic-base text-ceramic-text-secondary border-ceramic-border hover:bg-ceramic-base',
    warning: isActive
      ? 'bg-ceramic-warning/10 text-ceramic-warning border-ceramic-warning/30'
      : 'bg-ceramic-base text-ceramic-text-secondary border-ceramic-border hover:bg-ceramic-warning/5',
    danger: isActive
      ? 'bg-ceramic-error-bg text-ceramic-error border-ceramic-error/30'
      : 'bg-ceramic-base text-ceramic-text-secondary border-ceramic-border hover:bg-ceramic-error-bg',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors',
        variantClasses[variant]
      )}
      aria-pressed={isActive}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs',
            isActive ? 'bg-white/50' : 'bg-ceramic-base'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

const FILTER_OPTIONS: {
  value: ContactFilterType;
  label: string;
  variant?: FilterChipProps['variant'];
  statsKey: keyof ContactFiltersProps['stats'];
}[] = [
  { value: 'all', label: 'Todos', statsKey: 'total' },
  { value: 'favorites', label: 'Favoritos', statsKey: 'favorites' },
  { value: 'recent', label: 'Recentes', statsKey: 'recent' },
  { value: 'at_risk', label: 'Em Risco', variant: 'warning', statsKey: 'atRisk' },
  { value: 'inactive', label: 'Inativos', variant: 'danger', statsKey: 'inactive' },
];

const SORT_OPTIONS: { value: ContactSortField; label: string }[] = [
  { value: 'name', label: 'Nome' },
  { value: 'health_score', label: 'Score' },
  { value: 'last_interaction', label: 'Ultima Interacao' },
  { value: 'relationship_type', label: 'Tipo' },
];

export function ContactFilters({
  activeFilter,
  sortField,
  sortOrder,
  stats,
  onFilterChange,
  onSortChange,
  onSortOrderToggle,
  className,
}: ContactFiltersProps) {
  const [showSortMenu, setShowSortMenu] = React.useState(false);

  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === sortField)?.label || 'Ordenar';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            count={stats[option.statsKey]}
            isActive={activeFilter === option.value}
            onClick={() => onFilterChange(option.value)}
            variant={option.variant}
          />
        ))}
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2">
        {/* Sort field dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ceramic-border
                       bg-ceramic-base text-sm text-ceramic-text-secondary hover:bg-ceramic-base transition-colors"
            aria-expanded={showSortMenu}
            aria-haspopup="listbox"
          >
            <span>Ordenar: {activeSortLabel}</span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', showSortMenu && 'rotate-180')} />
          </button>

          {showSortMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSortMenu(false)}
              />
              <div
                className="absolute left-0 top-full mt-1 z-20 bg-ceramic-base rounded-lg border border-ceramic-border
                           shadow-lg py-1 min-w-[160px]"
                role="listbox"
              >
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value);
                      setShowSortMenu(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-ceramic-base transition-colors',
                      sortField === option.value && 'bg-ceramic-info-bg text-ceramic-info'
                    )}
                    role="option"
                    aria-selected={sortField === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sort order toggle */}
        <button
          onClick={onSortOrderToggle}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-ceramic-border
                     bg-ceramic-base text-sm text-ceramic-text-secondary hover:bg-ceramic-base transition-colors"
          aria-label={sortOrder === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}
        >
          <ArrowUpDown className="w-4 h-4" />
          <span className="text-xs">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
        </button>

        {/* Results count */}
        <span className="text-sm text-ceramic-text-secondary ml-auto">
          {stats.filtered} de {stats.total} contatos
        </span>
      </div>
    </div>
  );
}

export default ContactFilters;
