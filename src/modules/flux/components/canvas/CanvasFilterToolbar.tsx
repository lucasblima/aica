/**
 * CanvasFilterToolbar
 *
 * Horizontal filter bar above the grid: Modality + Zone + Volume pills.
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
  triathlon: '\u{1F3C5}',
};

export const MODALITY_PT_LABELS: Record<string, string> = {
  swimming: 'Natacao',
  running: 'Corrida',
  cycling: 'Ciclismo',
  strength: 'Musculacao',
  walking: 'Caminhada',
  triathlon: 'Triatleta',
};

export const ZONE_OPTIONS = [
  { key: 'all', label: 'Todas' },
  { key: 'Z1', label: 'Z1' },
  { key: 'Z2', label: 'Z2' },
  { key: 'Z3', label: 'Z3' },
  { key: 'Z4', label: 'Z4' },
  { key: 'Z5', label: 'Z5' },
];

export const VOLUME_OPTIONS = [
  { key: 'all', label: 'Todos', min: 0, max: Infinity },
  { key: 'short', label: '< 30min', min: 0, max: 30 },
  { key: 'medium', label: '30-60min', min: 30, max: 60 },
  { key: 'long', label: '> 60min', min: 60, max: Infinity },
];

// ============================================
// Component
// ============================================

interface CanvasFilterToolbarProps {
  athleteModality?: string;
  libraryModality: string | null;
  onModalityChange: (mod: string | null) => void;
  zoneFilter: string;
  onZoneChange: (zone: string) => void;
  volumeFilter: string;
  onVolumeChange: (vol: string) => void;
}

export const CanvasFilterToolbar: React.FC<CanvasFilterToolbarProps> = ({
  athleteModality,
  libraryModality,
  onModalityChange,
  zoneFilter,
  onZoneChange,
  volumeFilter,
  onVolumeChange,
}) => {
  const activeModality = libraryModality || athleteModality;

  // Build modality list: athlete's modality first, then others
  const modalityItems = [
    ...(athleteModality
      ? [
          {
            key: athleteModality,
            icon: MODALITY_ICONS[athleteModality] || '\u{1F3C3}',
            label: MODALITY_PT_LABELS[athleteModality] || athleteModality,
          },
        ]
      : []),
    ...Object.entries(MODALITY_ICONS)
      .filter(([k]) => k !== athleteModality)
      .map(([k, icon]) => ({
        key: k,
        icon,
        label: MODALITY_PT_LABELS[k] || k,
      })),
  ];

  return (
    <div className="flex items-center gap-4 px-5 py-2 border-b border-ceramic-border/30 bg-ceramic-cool/30">
      {/* Modality pills */}
      <div className="flex items-center gap-1">
        {modalityItems.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => onModalityChange(key === athleteModality ? null : key)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
              activeModality === key
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

      {/* Zone pills */}
      <div className="flex items-center gap-1">
        {ZONE_OPTIONS.map((zone) => (
          <button
            key={zone.key}
            onClick={() => onZoneChange(zone.key)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              zoneFilter === zone.key
                ? 'bg-ceramic-base text-ceramic-text-primary shadow-sm'
                : 'text-ceramic-text-tertiary hover:text-ceramic-text-secondary'
            }`}
          >
            {zone.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-ceramic-border/30" />

      {/* Volume pills */}
      <div className="flex items-center gap-1">
        {VOLUME_OPTIONS.map((vol) => (
          <button
            key={vol.key}
            onClick={() => onVolumeChange(vol.key)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              volumeFilter === vol.key
                ? 'bg-ceramic-base text-ceramic-text-primary shadow-sm'
                : 'text-ceramic-text-tertiary hover:text-ceramic-text-secondary'
            }`}
          >
            {vol.label}
          </button>
        ))}
      </div>
    </div>
  );
};
