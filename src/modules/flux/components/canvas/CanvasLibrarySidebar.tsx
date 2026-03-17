/**
 * CanvasLibrarySidebar
 *
 * Left sidebar for the Canvas editor: search bar + template library.
 * Templates are draggable into the grid.
 *
 * Filters (modality, zone) have been moved to CanvasFilterToolbar (#698).
 */

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useWorkoutTemplates } from '../../hooks/useWorkoutTemplates';
import type { WorkoutTemplate } from '../../types/flow';
import type { Athlete } from '../../types/flux';
import type { ExerciseStructureV2, CyclingSeries } from '../../types/series';

// ============================================
// Constants
// ============================================

const INTENSITY_COLORS: Record<string, string> = {
  low: 'bg-[#6B7B5C]/15 text-[#6B7B5C]',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-[#9B4D3A]/15 text-[#9B4D3A]',
};

const MODALITY_ICONS: Record<string, string> = {
  swimming: '🏊',
  running: '🏃',
  cycling: '🚴',
  strength: '💪',
  walking: '🚶',
  triathlon: '🏅',
};

const MODALITY_BORDER_COLORS: Record<string, string> = {
  swimming: '#60A5FA',
  running: '#FB923C',
  cycling: '#34D399',
  strength: '#C084FC',
  walking: '#38BDF8',
  triathlon: '#FB7185',
};

// ============================================
// Exercise structure summary (Aq. / P. / Des.)
// ============================================

function formatWork(s: any): string {
  const reps = s.repetitions && s.repetitions > 1 ? `${s.repetitions}x` : '';
  let work = '';
  if (s.exercise_name) work = s.exercise_name;
  else if (s.reps) work = `${s.reps}rep${s.load_kg ? ` ${s.load_kg}kg` : ''}`;
  else if (s.distance_meters) work = s.distance_meters >= 1000 ? `${(s.distance_meters / 1000).toFixed(1).replace('.0', '')}km` : `${s.distance_meters}m`;
  else if (s.work_value) {
    if (s.work_unit === 'minutes' || s.unit_detail === 'minutes') {
      work = s.work_value >= 60 ? `${Math.floor(s.work_value / 60)}h${s.work_value % 60 ? ` ${s.work_value % 60}min` : ''}` : `${s.work_value}min`;
    } else if (s.work_unit === 'seconds' || s.unit_detail === 'seconds') {
      work = `${s.work_value}s`;
    } else {
      work = `${s.work_value}m`;
    }
  } else work = 'série';
  const rest = (s.rest_minutes || s.rest_seconds)
    ? ` int ${s.rest_minutes ? `${s.rest_minutes}'` : ''}${s.rest_seconds ? `${s.rest_seconds}"` : ''}`
    : '';
  return `${reps}${work}${rest}`;
}

const ExerciseStructureSummary: React.FC<{ structure: ExerciseStructureV2 }> = ({ structure }) => {
  if (!structure?.series?.length) return null;
  return (
    <div className="space-y-0.5 text-[10px] text-ceramic-text-secondary mt-1">
      {structure.warmup && (
        <div className="flex items-start gap-1 leading-tight">
          <span className="text-amber-600 font-bold shrink-0">Aq.</span>
          <span className="line-clamp-1">{structure.warmup}</span>
        </div>
      )}
      <div className="flex items-start gap-1 leading-tight">
        <span className="text-amber-800 font-bold shrink-0">P.</span>
        <span className="line-clamp-2">{structure.series.map(formatWork).join(' + ')}</span>
      </div>
      {structure.cooldown && (
        <div className="flex items-start gap-1 leading-tight">
          <span className="text-sky-600 font-bold shrink-0">Des.</span>
          <span className="line-clamp-1">{structure.cooldown}</span>
        </div>
      )}
    </div>
  );
};

// ============================================
// CanvasLibrarySidebar (exported)
// ============================================

interface CanvasLibrarySidebarProps {
  athlete: Athlete;
  onTemplateSelect: (template: WorkoutTemplate) => void;
  // Filter state lifted to parent
  modalityFilter: string[];
  zoneFilter: string[];
}

export const CanvasLibrarySidebar: React.FC<CanvasLibrarySidebarProps> = ({
  athlete,
  onTemplateSelect,
  modalityFilter,
  zoneFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // When no modality filter, use athlete's modality for template fetching
  // When modalities selected, fetch all and filter client-side
  const fetchModality = modalityFilter.length === 0 ? athlete.modality : undefined;

  const { templates, isLoading } = useWorkoutTemplates(
    fetchModality ? { modality: fetchModality as 'swimming' | 'running' | 'cycling' | 'strength' | 'walking' } : undefined
  );

  const filtered = useMemo(() => {
    let result = templates;

    // Modality filter: multi-select toggle (empty = show all)
    if (modalityFilter.length > 0) {
      result = result.filter((t) => modalityFilter.includes(t.modality));
    }

    // Zone filter: multi-select toggle (empty = show all)
    if (zoneFilter.length > 0) {
      const zoneIntensityMap: Record<string, string[]> = {
        Z1: ['low'],
        Z2: ['low'],
        Z3: ['medium'],
        Z4: ['high'],
        Z5: ['high'],
      };
      const allowedIntensities = new Set(zoneFilter.flatMap((z) => zoneIntensityMap[z] || []));
      result = result.filter((t) => allowedIntensities.has(t.intensity));
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.category && t.category.toLowerCase().includes(q))
      );
    }

    return result;
  }, [templates, modalityFilter, zoneFilter, searchQuery]);

  return (
    <div className="flex flex-col w-80 h-full border-r border-ceramic-text-secondary/10">
      {/* Search */}
      <div className="p-4 border-b border-ceramic-text-secondary/10 bg-ceramic-base flex-shrink-0">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar treino..."
            className="w-full pl-9 pr-3 py-2 rounded-[12px] text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 bg-transparent focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            style={{
              boxShadow:
                'inset 2px 2px 5px rgba(163,158,145,0.2), inset -2px -2px 5px rgba(255,255,255,0.9)',
            }}
          />
        </div>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-ceramic-base">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-[16px] bg-ceramic-text-secondary/8 animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="p-6 rounded-[16px] text-center"
            style={{
              boxShadow:
                'inset 2px 2px 5px rgba(163,158,145,0.15), inset -2px -2px 5px rgba(255,255,255,0.85)',
            }}
          >
            <p className="text-sm text-ceramic-text-secondary">
              Nenhum treino encontrado
            </p>
          </div>
        ) : (
          filtered.map((template) => (
            <div
              key={template.id}
              onClick={() => onTemplateSelect(template)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('templateId', template.id);
                e.dataTransfer.setData('text/plain', JSON.stringify(template));
              }}
              className="group relative flex flex-col gap-2 rounded-[16px] p-3 cursor-grab active:cursor-grabbing transition-all overflow-hidden"
              style={{
                background: '#F0EFE9',
                boxShadow:
                  '3px 3px 8px rgba(163,158,145,0.12), -3px -3px 8px rgba(255,255,255,0.9)',
                borderLeft: `3px solid ${MODALITY_BORDER_COLORS[template.modality] || '#A39E91'}`,
              }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider text-ceramic-text-tertiary">
                {template.category}
              </span>
              <h4 className="font-semibold text-ceramic-text-primary text-sm leading-tight line-clamp-2">
                {MODALITY_ICONS[template.modality] && (
                  <span className="mr-1">{MODALITY_ICONS[template.modality]}</span>
                )}
                {template.name}
              </h4>
              {template.exercise_structure && (
                <ExerciseStructureSummary structure={template.exercise_structure as ExerciseStructureV2} />
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-ceramic-text-secondary font-medium">
                  {template.duration} min
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                    INTENSITY_COLORS[template.intensity] || ''
                  }`}
                >
                  {template.intensity === 'low'
                    ? 'Leve'
                    : template.intensity === 'medium'
                      ? 'Media'
                      : 'Alta'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-ceramic-text-secondary/10 bg-ceramic-base">
        <div className="flex items-center justify-between">
          <span className="text-xs text-ceramic-text-secondary font-medium">{filtered.length} treino(s)</span>
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
            <span className="text-sm">👆</span> Arraste para a agenda
          </span>
        </div>
      </div>
    </div>
  );
};
