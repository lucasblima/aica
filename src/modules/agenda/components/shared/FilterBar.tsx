import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { CeramicFilterTab } from '@/components/ui';
import { getTagColor } from '@/lib/utils/tagColors';
import type { TaskStatusFilter, TaskPriorityFilter, TaskSortBy, TaskFilters } from '@/hooks/useTaskFilters';

interface TaskFilterBarProps {
  filters: TaskFilters;
  taskCounts: Record<string, number>;
  availableTags: string[];
  activeFilterCount: number;
  onStatusChange: (status: TaskStatusFilter) => void;
  onPriorityChange: (priority: TaskPriorityFilter) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sortBy: TaskSortBy) => void;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}

const STATUS_OPTIONS: { key: TaskStatusFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'todo', label: 'A Fazer' },
  { key: 'in_progress', label: 'Em Progresso' },
  { key: 'completed', label: 'Concluidas' },
];

const PRIORITY_OPTIONS: { key: TaskPriorityFilter; label: string; emoji: string }[] = [
  { key: 'all', label: 'Todas', emoji: '' },
  { key: 'urgent-important', label: 'Urgente & Importante', emoji: '' },
  { key: 'important', label: 'Importante', emoji: '' },
  { key: 'urgent', label: 'Urgente', emoji: '' },
  { key: 'low', label: 'Baixa', emoji: '' },
];

const SORT_OPTIONS: { key: TaskSortBy; label: string }[] = [
  { key: 'created_at', label: 'Data de Criação' },
  { key: 'due_date', label: 'Data de Vencimento' },
  { key: 'priority', label: 'Prioridade' },
  { key: 'title', label: 'Título' },
];

export const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  filters,
  taskCounts,
  availableTags,
  activeFilterCount,
  onStatusChange,
  onPriorityChange,
  onSearchChange,
  onSortChange,
  onToggleTag,
  onClear,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.searchQuery);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  return (
    <div className="space-y-3">
      {/* Top row: Status pills + search */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STATUS_OPTIONS.map(opt => (
          <CeramicFilterTab
            key={opt.key}
            label={opt.label}
            count={taskCounts[opt.key]}
            isActive={filters.status === opt.key}
            onClick={() => onStatusChange(opt.key)}
            size="sm"
          />
        ))}

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1 px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
            expanded || activeFilterCount > 0
              ? 'ceramic-card bg-ceramic-base shadow-md text-amber-700'
              : 'ceramic-inset hover:bg-white/50 text-[#948D82]'
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Buscar tarefas..."
          className="w-full pl-10 pr-10 py-2.5 ceramic-inset rounded-xl text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        />
        {localSearch && (
          <button
            onClick={() => { setLocalSearch(''); onSearchChange(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ceramic-text-secondary hover:text-ceramic-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="ceramic-tray p-4 rounded-2xl space-y-4">
          {/* Priority filter */}
          <div>
            <label className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-widest mb-2 block">
              Prioridade
            </label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => onPriorityChange(opt.key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filters.priority === opt.key
                      ? 'ceramic-card shadow-sm text-amber-700 bg-ceramic-base'
                      : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tag filter */}
          {availableTags.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-widest mb-2 block">
                Etiquetas
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => onToggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      filters.tags.includes(tag)
                        ? getTagColor(tag) + ' ring-2 ring-amber-400/50'
                        : 'border-ceramic-border text-ceramic-text-secondary hover:border-amber-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sort */}
          <div>
            <label className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-widest mb-2 block">
              Ordenar por
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => onSortChange(e.target.value as TaskSortBy)}
              className="px-3 py-2 rounded-xl ceramic-inset text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Clear */}
          {activeFilterCount > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-ceramic-text-secondary hover:text-amber-700 font-medium underline"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
};
