/**
 * CanvasLibrarySidebar
 *
 * Left sidebar for the Canvas editor: search bar + template library.
 * Templates are draggable into the grid.
 *
 * Filters (modality, zone, volume) have been moved to CanvasFilterToolbar (#698).
 */

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useWorkoutTemplates } from '../../hooks/useWorkoutTemplates';
import { MODALITY_ICONS, MODALITY_PT_LABELS, VOLUME_OPTIONS } from './CanvasFilterToolbar';
import type { WorkoutTemplate } from '../../types/flow';
import type { Athlete } from '../../types/flux';

// ============================================
// Constants
// ============================================

const INTENSITY_COLORS: Record<string, string> = {
  low: 'bg-[#6B7B5C]/15 text-[#6B7B5C]',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-[#9B4D3A]/15 text-[#9B4D3A]',
};

// ============================================
// CanvasLibrarySidebar (exported)
// ============================================

interface CanvasLibrarySidebarProps {
  athlete: Athlete;
  onTemplateSelect: (template: WorkoutTemplate) => void;
  // Filter state lifted to parent
  libraryModality: string | null;
  zoneFilter: string;
  volumeFilter: string;
}

export const CanvasLibrarySidebar: React.FC<CanvasLibrarySidebarProps> = ({
  athlete,
  onTemplateSelect,
  libraryModality,
  zoneFilter,
  volumeFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const modality = libraryModality || athlete.modality;

  const { templates, isLoading } = useWorkoutTemplates(
    modality ? { modality: modality as 'swimming' | 'running' | 'cycling' | 'strength' | 'walking' } : undefined
  );

  const filtered = useMemo(() => {
    let result = templates;

    // Zone filter: match against intensity mapping (Z1-Z2 = low, Z3 = medium, Z4-Z5 = high)
    if (zoneFilter !== 'all') {
      const zoneIntensityMap: Record<string, string[]> = {
        Z1: ['low'],
        Z2: ['low'],
        Z3: ['medium'],
        Z4: ['high'],
        Z5: ['high'],
      };
      const intensities = zoneIntensityMap[zoneFilter] || [];
      result = result.filter((t) => intensities.includes(t.intensity));
    }

    // Volume filter
    if (volumeFilter !== 'all') {
      const vol = VOLUME_OPTIONS.find((v) => v.key === volumeFilter);
      if (vol) {
        result = result.filter((t) => t.duration >= vol.min && t.duration < vol.max);
      }
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
  }, [templates, zoneFilter, volumeFilter, searchQuery]);

  return (
    <div className="flex flex-col w-80 h-full border-r border-ceramic-text-secondary/10">
      {/* Header + Search */}
      <div className="p-4 border-b border-ceramic-text-secondary/10 space-y-3 bg-ceramic-base flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-[12px]"
            style={{
              boxShadow:
                'inset 2px 2px 5px rgba(163,158,145,0.2), inset -2px -2px 5px rgba(255,255,255,0.9)',
            }}
          >
            <span className="text-xl">{MODALITY_ICONS[modality] || '\u{1F3C3}'}</span>
          </div>
          <div>
            <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider">
              Biblioteca
            </p>
            <h3 className="text-lg font-bold text-ceramic-text-primary capitalize">
              {MODALITY_PT_LABELS[modality] || modality}
            </h3>
          </div>
        </div>

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
              className="group relative flex flex-col gap-2 rounded-[16px] p-3 cursor-grab active:cursor-grabbing transition-all"
              style={{
                background: '#F0EFE9',
                boxShadow:
                  '3px 3px 8px rgba(163,158,145,0.12), -3px -3px 8px rgba(255,255,255,0.9)',
              }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider text-ceramic-text-tertiary">
                {template.category}
              </span>
              <h4 className="font-semibold text-ceramic-text-primary text-sm leading-tight line-clamp-2">
                {template.name}
              </h4>
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
        <div className="flex items-center justify-between text-xs text-ceramic-text-secondary">
          <span className="font-medium">{filtered.length} treino(s)</span>
          <span className="text-ceramic-text-tertiary">Arraste para o grid</span>
        </div>
      </div>
    </div>
  );
};
