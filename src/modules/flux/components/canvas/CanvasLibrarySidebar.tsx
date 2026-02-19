/**
 * CanvasLibrarySidebar
 *
 * Left sidebar for the Canvas editor: modality tabs + template library.
 * Templates are draggable into the grid.
 */

import React, { useState, useMemo } from 'react';
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

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  warmup: { label: 'Aquecimento', icon: '\u{1F525}' },
  main: { label: 'Principal', icon: '\u{1F4AA}' },
  cooldown: { label: 'Desaquecimento', icon: '\u{2744}\uFE0F' },
};

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { templates, isLoading } = useWorkoutTemplates(
    modality ? { modality: modality as 'swimming' | 'running' | 'cycling' | 'strength' | 'walking' } : undefined
  );

  const filtered = useMemo(() => {
    if (selectedCategory === 'all') return templates;
    return templates.filter((t) => t.category === selectedCategory);
  }, [templates, selectedCategory]);

  return (
    <div className="w-full h-full bg-ceramic-base flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-ceramic-text-secondary/10">
        <div className="flex items-center gap-3 mb-3">
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

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              selectedCategory === 'all'
                ? 'bg-ceramic-base text-ceramic-text-primary'
                : 'text-ceramic-text-secondary hover:bg-ceramic-text-secondary/5'
            }`}
            style={
              selectedCategory === 'all'
                ? {
                    boxShadow:
                      '2px 2px 5px rgba(163,158,145,0.12), -2px -2px 5px rgba(255,255,255,0.9)',
                  }
                : {}
            }
          >
            Todos
          </button>
          {Object.entries(CATEGORY_LABELS).map(([cat, cfg]) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                selectedCategory === cat
                  ? 'bg-ceramic-base text-ceramic-text-primary'
                  : 'text-ceramic-text-secondary hover:bg-ceramic-text-secondary/5'
              }`}
              style={
                selectedCategory === cat
                  ? {
                      boxShadow:
                        '2px 2px 5px rgba(163,158,145,0.12), -2px -2px 5px rgba(255,255,255,0.9)',
                    }
                  : {}
              }
            >
              <span className="text-xs">{cfg.icon}</span>
              {cfg.label}
            </button>
          ))}
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
              Nenhum template nesta categoria
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
                {CATEGORY_LABELS[template.category]?.label || template.category}
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
          <span className="font-medium">{filtered.length} template(s)</span>
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
    <div className="flex flex-col w-80 h-full border-r border-ceramic-text-secondary/10">
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
