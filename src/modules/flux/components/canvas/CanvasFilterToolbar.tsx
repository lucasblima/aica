/**
 * CanvasFilterToolbar
 *
 * Horizontal filter bar above the grid: Modality + Zone pills.
 * Extracted from CanvasLibrarySidebar for better layout (#698).
 */

import React from 'react';

// ============================================
// Shared constants (also used by CanvasLibrarySidebar)
// ============================================

export const MODALITY_ICONS: Record<string, string> = {
  swimming: '\u{1F3CA}',
  running: '\u{1F3C3}',
  cycling: '\u{1F6B4}',
  strength: '\u{1F4AA}',
  walking: '\u{1F6B6}',
};

export const MODALITY_PT_LABELS: Record<string, string> = {
  swimming: 'Natacao',
  running: 'Corrida',
  cycling: 'Ciclismo',
  strength: 'Musculacao',
  walking: 'Caminhada',
};

export const ZONE_OPTIONS = [
  { key: 'Z1', label: 'Z1' },
  { key: 'Z2', label: 'Z2' },
  { key: 'Z3', label: 'Z3' },
  { key: 'Z4', label: 'Z4' },
  { key: 'Z5', label: 'Z5' },
];

// ============================================
// Component
// ============================================

interface CanvasFilterToolbarProps {
  modalityFilter: string[];
  onModalityToggle: (mod: string) => void;
  zoneFilter: string[];
  onZoneToggle: (zone: string) => void;
  // Week tabs (moved from CanvasEditorDrawer #783)
  currentWeek: number;
  onWeekChange: (week: number) => void;
  viewMode: 'weekly' | 'microcycle';
}

export const CanvasFilterToolbar: React.FC<CanvasFilterToolbarProps> = ({
  modalityFilter,
  onModalityToggle,
  zoneFilter,
  onZoneToggle,
  currentWeek,
  onWeekChange,
  viewMode,
}) => {
  const modalityItems = Object.entries(MODALITY_ICONS).map(([k, icon]) => ({
    key: k,
    icon,
    label: MODALITY_PT_LABELS[k] || k,
  }));

  return (
    <div className="flex items-center gap-4 px-5 py-2 border-b border-ceramic-border/30 bg-ceramic-cool/30">
      {/* Week tabs (only in weekly mode) */}
      {viewMode === 'weekly' && (
        <>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((week) => (
              <button
                key={week}
                onClick={() => onWeekChange(week)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  currentWeek === week
                    ? 'bg-ceramic-base text-ceramic-text-primary shadow-sm border-b-2 border-amber-400'
                    : 'text-ceramic-text-tertiary hover:text-ceramic-text-secondary'
                }`}
              >
                Sem {week}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-ceramic-border/30" />
        </>
      )}

      {/* Modality pills (multi-select toggle: empty = show all) */}
      <div className="flex items-center gap-1">
        {modalityItems.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => onModalityToggle(key)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
              modalityFilter.includes(key)
                ? 'bg-ceramic-base text-ceramic-text-primary shadow-sm'
                : 'text-ceramic-text-tertiary hover:text-ceramic-text-secondary'
            }`}
            title={label}
          >
            <span className="text-xs">{icon}</span>
            <span className="uppercase tracking-wider">{label.substring(0, 3)}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-ceramic-border/30" />

      {/* Zone pills (multi-select toggle: empty = show all) */}
      <div className="flex items-center gap-1">
        {ZONE_OPTIONS.map((zone) => (
          <button
            key={zone.key}
            onClick={() => onZoneToggle(zone.key)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              zoneFilter.includes(zone.key)
                ? 'bg-ceramic-base text-ceramic-text-primary shadow-sm'
                : 'text-ceramic-text-tertiary hover:text-ceramic-text-secondary'
            }`}
          >
            {zone.label}
          </button>
        ))}
      </div>
    </div>
  );
};
