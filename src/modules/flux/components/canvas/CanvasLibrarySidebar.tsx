/**
 * CanvasLibrarySidebar
 *
 * Left sidebar for the Canvas editor: modality tabs + template library.
 * Templates are draggable into the grid.
 */

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useWorkoutTemplates } from '../../hooks/useWorkoutTemplates';
import type { WorkoutTemplate } from '../../types/flow';
import type { Athlete } from '../../types/flux';

// ============================================
// Constants
// ============================================

const MODALITY_ICONS: Record<string, string> = {
  swimming: '\u{1F3CA}',
  running: '\u{1F3C3}',
  cycling: '\u{1F6B4}',
  strength: '\u{1F4AA}',
  walking: '\u{1F6B6}',
};

const MODALITY_PT_LABELS: Record<string, string> = {
  swimming: 'Natacao',
  running: 'Corrida',
  cycling: 'Ciclismo',
  strength: 'Musculacao',
  walking: 'Caminhada',
};

const ZONE_OPTIONS = [
  { key: 'all', label: 'Todas' },
  { key: 'Z1', label: 'Z1' },
  { key: 'Z2', label: 'Z2' },
  { key: 'Z3', label: 'Z3' },
  { key: 'Z4', label: 'Z4' },
  { key: 'Z5', label: 'Z5' },
];

const VOLUME_OPTIONS = [
  { key: 'all', label: 'Todos', min: 0, max: Infinity },
  { key: 'short', label: '< 30min', min: 0, max: 30 },
  { key: 'medium', label: '30-60min', min: 30, max: 60 },
  { key: 'long', label: '> 60min', min: 60, max: Infinity },
];

const INTENSITY_COLORS: Record<string, string> = {
  low: 'bg-[#6B7B5C]/15 text-[#6B7B5C]',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-[#9B4D3A]/15 text-[#9B4D3A]',
};

// ============================================
// Template Library (internal)
// ============================================

interface TemplateLibraryProps {
  modality: string;
  onTemplateSelect: (template: WorkoutTemplate) => void;
}

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ modality, onTemplateSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedVolume, setSelectedVolume] = useState('all');
  const { templates, isLoading } = useWorkoutTemplates(
    modality ? { modality: modality as 'swimming' | 'running' | 'cycling' | 'strength' | 'walking' } : undefined
  );

  const filtered = useMemo(() => {
    let result = templates;

    // Zone filter: match against intensity mapping (Z1-Z2 = low, Z3 = medium, Z4-Z5 = high)
    if (selectedZone !== 'all') {
      const zoneIntensityMap: Record<string, string[]> = {
        Z1: ['low'],
        Z2: ['low'],
        Z3: ['medium'],
        Z4: ['high'],
        Z5: ['high'],
      };
      const intensities = zoneIntensityMap[selectedZone] || [];
      result = result.filter((t) => intensities.includes(t.intensity));
    }

    // Volume filter
    if (selectedVolume !== 'all') {
      const vol = VOLUME_OPTIONS.find((v) => v.key === selectedVolume);
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
  }, [templates, selectedZone, selectedVolume, searchQuery]);

  return (
    <div className="w-full h-full bg-ceramic-base flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-ceramic-text-secondary/10 space-y-3">
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

        {/* Zone Filter */}
        <div>
          <p className="text-[9px] text-ceramic-text-tertiary font-bold uppercase tracking-wider mb-1.5">
            Zona de Treino
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ZONE_OPTIONS.map((zone) => (
              <button
                key={zone.key}
                onClick={() => setSelectedZone(zone.key)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  selectedZone === zone.key
                    ? 'bg-ceramic-base text-ceramic-text-primary'
                    : 'text-ceramic-text-secondary hover:bg-ceramic-text-secondary/5'
                }`}
                style={
                  selectedZone === zone.key
                    ? {
                        boxShadow:
                          '2px 2px 5px rgba(163,158,145,0.12), -2px -2px 5px rgba(255,255,255,0.9)',
                      }
                    : {}
                }
              >
                {zone.label}
              </button>
            ))}
          </div>
        </div>

        {/* Volume Filter */}
        <div>
          <p className="text-[9px] text-ceramic-text-tertiary font-bold uppercase tracking-wider mb-1.5">
            Volume
          </p>
          <div className="flex flex-wrap gap-1.5">
            {VOLUME_OPTIONS.map((vol) => (
              <button
                key={vol.key}
                onClick={() => setSelectedVolume(vol.key)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  selectedVolume === vol.key
                    ? 'bg-ceramic-base text-ceramic-text-primary'
                    : 'text-ceramic-text-secondary hover:bg-ceramic-text-secondary/5'
                }`}
                style={
                  selectedVolume === vol.key
                    ? {
                        boxShadow:
                          '2px 2px 5px rgba(163,158,145,0.12), -2px -2px 5px rgba(255,255,255,0.9)',
                      }
                    : {}
                }
              >
                {vol.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
      <div className="p-4 border-t border-ceramic-text-secondary/10">
        <div className="flex items-center justify-between text-xs text-ceramic-text-secondary">
          <span className="font-medium">{filtered.length} treino(s)</span>
          <span className="text-ceramic-text-tertiary">Arraste para o grid</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// CanvasLibrarySidebar (exported)
// ============================================

interface CanvasLibrarySidebarProps {
  athlete: Athlete;
  onTemplateSelect: (template: WorkoutTemplate) => void;
}

export const CanvasLibrarySidebar: React.FC<CanvasLibrarySidebarProps> = ({
  athlete,
  onTemplateSelect,
}) => {
  const [libraryModality, setLibraryModality] = useState<string | null>(null);

  return (
    <div className="flex flex-col w-96 h-full border-r border-ceramic-text-secondary/10">
      {/* Modality Selector */}
      <div className="px-3 py-2 border-b border-ceramic-text-secondary/10 bg-ceramic-base flex-shrink-0">
        <p className="text-[9px] text-ceramic-text-tertiary font-medium uppercase tracking-wider mb-1.5">
          Modalidade
        </p>
        <div className="flex flex-wrap gap-1">
          {[
            {
              key: athlete.modality,
              icon: MODALITY_ICONS[athlete.modality] || '\u{1F3C3}',
              label: MODALITY_PT_LABELS[athlete.modality] || athlete.modality,
            },
            ...Object.entries(MODALITY_ICONS)
              .filter(([k]) => k !== athlete.modality)
              .map(([k, icon]) => ({
                key: k,
                icon,
                label: MODALITY_PT_LABELS[k] || k,
              })),
          ].map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setLibraryModality(key === athlete.modality ? null : key)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                (libraryModality || athlete.modality) === key
                  ? 'bg-ceramic-base text-ceramic-text-primary'
                  : 'text-ceramic-text-tertiary hover:text-ceramic-text-secondary'
              }`}
              style={
                (libraryModality || athlete.modality) === key
                  ? {
                      boxShadow:
                        '2px 2px 5px rgba(163,158,145,0.12), -2px -2px 5px rgba(255,255,255,0.9)',
                    }
                  : {}
              }
              title={label}
            >
              <span className="text-xs">{icon}</span>
              <span className="uppercase tracking-wider">{label.substring(0, 3)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Template Library */}
      <div className="flex-1 overflow-hidden">
        <TemplateLibrary
          modality={libraryModality || athlete.modality}
          onTemplateSelect={onTemplateSelect}
        />
      </div>
    </div>
  );
};
