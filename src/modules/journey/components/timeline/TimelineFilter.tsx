/**
 * TimelineFilter Component
 * Filter controls for unified timeline (sources and date range)
 * Uses Digital Ceramic design system
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChatBubbleLeftIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  ChartBarIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { UnifiedEventSource, TimelineFilter as TimelineFilterType } from '../../types/unifiedEvent'

export interface TimelineFilterProps {
  filters: TimelineFilterType
  onFilterChange: (filters: Partial<TimelineFilterType>) => void
  stats?: {
    whatsapp: number
    moment: number
    task: number
    approval: number
    activity: number
    question: number
    summary: number
  }
}

/**
 * Source configuration with icons and labels
 */
const SOURCE_CONFIG: Record<
  UnifiedEventSource,
  { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; color: string }
> = {
  whatsapp: {
    icon: ChatBubbleLeftIcon,
    label: 'WhatsApp',
    color: '#10b981',
  },
  moment: {
    icon: PencilSquareIcon,
    label: 'Momentos',
    color: '#f59e0b',
  },
  task: {
    icon: CheckCircleIcon,
    label: 'Tarefas',
    color: '#3b82f6',
  },
  approval: {
    icon: DocumentCheckIcon,
    label: 'Aprovações',
    color: '#8b5cf6',
  },
  activity: {
    icon: ChartBarIcon,
    label: 'Atividades',
    color: '#ec4899',
  },
  question: {
    icon: QuestionMarkCircleIcon,
    label: 'Perguntas',
    color: '#06b6d4',
  },
  summary: {
    icon: DocumentTextIcon,
    label: 'Resumos',
    color: '#f97316',
  },
}

const DATE_RANGE_OPTIONS = [
  { value: 'last7' as const, label: 'Últimos 7 dias' },
  { value: 'last30' as const, label: 'Últimos 30 dias' },
  { value: 'last90' as const, label: 'Últimos 90 dias' },
  { value: 'all' as const, label: 'Todo o período' },
]

export function TimelineFilter({ filters, onFilterChange, stats }: TimelineFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const allSources: UnifiedEventSource[] = [
    'whatsapp',
    'moment',
    'task',
    'approval',
    'activity',
    'question',
    'summary',
  ]

  const selectedCount = filters.sources.length
  const totalSources = allSources.length
  const isAllSelected = selectedCount === totalSources
  const isNoneSelected = selectedCount === 0

  const handleToggleSource = (source: UnifiedEventSource) => {
    const newSources = filters.sources.includes(source)
      ? filters.sources.filter((s) => s !== source)
      : [...filters.sources, source]

    onFilterChange({ sources: newSources })
  }

  const handleSelectAll = () => {
    onFilterChange({ sources: allSources })
  }

  const handleClearAll = () => {
    onFilterChange({ sources: [] })
  }

  const handleDateRangeChange = (dateRange: TimelineFilterType['dateRange']) => {
    onFilterChange({ dateRange })
  }

  const handleReset = () => {
    onFilterChange({
      sources: allSources,
      dateRange: 'last30',
      searchTerm: undefined,
      sentiments: undefined,
      tags: undefined,
    })
  }

  const hasActiveFilters =
    !isAllSelected ||
    filters.dateRange !== 'last30' ||
    filters.searchTerm ||
    (filters.sentiments && filters.sentiments.length > 0) ||
    (filters.tags && filters.tags.length > 0)

  return (
    <div className="ceramic-tray p-4 mb-6">
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-[#948D82]" />
          <h3 className="text-sm font-semibold text-[#5C554B]">Filtros</h3>
          {hasActiveFilters && (
            <span className="ceramic-inset-shallow px-2 py-0.5 text-xs text-[#C4A574] rounded-full">
              Ativos
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="text-xs text-[#948D82] hover:text-[#5C554B] transition-colors flex items-center gap-1"
            >
              <XMarkIcon className="h-4 w-4" />
              Limpar
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ceramic-inset px-3 py-1 text-xs text-[#5C554B] hover:bg-[#E0DDD5] transition-all rounded-full"
          >
            {isExpanded ? 'Ocultar' : 'Expandir'}
          </button>
        </div>
      </div>

      {/* Compact view - Date range only */}
      {!isExpanded && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#948D82]">Período:</span>
          <select
            value={filters.dateRange}
            onChange={(e) =>
              handleDateRangeChange(e.target.value as TimelineFilterType['dateRange'])
            }
            className="ceramic-inset px-3 py-1.5 text-xs text-[#5C554B] rounded-lg border-none focus:ring-2 focus:ring-[#C4A574] transition-all cursor-pointer"
          >
            {DATE_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <span className="text-xs text-[#948D82]">
            {selectedCount}/{totalSources} fontes
          </span>
        </div>
      )}

      {/* Expanded view */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Date Range Selector */}
            <div>
              <label className="text-xs font-medium text-[#5C554B] mb-2 block">
                Período
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DATE_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleDateRangeChange(option.value)}
                    className={`
                      px-3 py-2 text-xs rounded-lg transition-all
                      ${
                        filters.dateRange === option.value
                          ? 'ceramic-tile text-[#5C554B] font-medium shadow-md'
                          : 'ceramic-inset text-[#948D82] hover:text-[#5C554B]'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Toggles */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[#5C554B]">
                  Fontes ({selectedCount}/{totalSources})
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    disabled={isAllSelected}
                    className="text-xs text-[#948D82] hover:text-[#5C554B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Todas
                  </button>
                  <span className="text-[#E0DDD5]">|</span>
                  <button
                    onClick={handleClearAll}
                    disabled={isNoneSelected}
                    className="text-xs text-[#948D82] hover:text-[#5C554B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Nenhuma
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {allSources.map((source) => {
                  const config = SOURCE_CONFIG[source]
                  const Icon = config.icon
                  const isSelected = filters.sources.includes(source)
                  const count = stats?.[source] || 0

                  return (
                    <motion.button
                      key={source}
                      onClick={() => handleToggleSource(source)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                        ${
                          isSelected
                            ? 'ceramic-tile shadow-md'
                            : 'ceramic-inset opacity-60 hover:opacity-100'
                        }
                      `}
                    >
                      <Icon
                        className="h-5 w-5 flex-shrink-0"
                        style={{ color: isSelected ? config.color : '#948D82' }}
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p
                          className={`text-xs font-medium truncate ${
                            isSelected ? 'text-[#5C554B]' : 'text-[#948D82]'
                          }`}
                        >
                          {config.label}
                        </p>
                        {count > 0 && (
                          <p className="text-xs text-[#948D82]">{count}</p>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Search (Optional) */}
            {filters.searchTerm !== undefined && (
              <div>
                <label className="text-xs font-medium text-[#5C554B] mb-2 block">
                  Buscar
                </label>
                <input
                  type="text"
                  value={filters.searchTerm || ''}
                  onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
                  placeholder="Digite para buscar..."
                  className="ceramic-inset w-full px-3 py-2 text-sm text-[#5C554B] rounded-lg border-none focus:ring-2 focus:ring-[#C4A574] transition-all"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
