/**
 * SeriesEditor Component
 *
 * Unified editor for all workout series types with modality-specific forms.
 * Dynamically displays appropriate form fields based on selected modality.
 *
 * Features:
 * - Add/remove series dynamically
 * - Modality-specific forms (Running, Swimming, Cycling, Strength)
 * - Zone selection for cardio modalities
 * - Visual series cards with index numbers
 */

import React from 'react';
import { Plus, X, Clock, Zap } from 'lucide-react';
import type { TrainingModality } from '../../types/flow';
import type {
  WorkoutSeries,
  RunningSeries,
  SwimmingSeries,
  CyclingSeries,
  StrengthSeries,
  IntensityZone,
  TimeUnit,
  DistanceUnit,
  CyclingUnit,
} from '../../types/series';
import { ZONE_CONFIGS, createEmptySeries } from '../../types/series';

interface SeriesEditorProps {
  modality: TrainingModality | '';
  series: WorkoutSeries[];
  onChange: (series: WorkoutSeries[]) => void;
}

export default function SeriesEditor({ modality, series, onChange }: SeriesEditorProps) {
  const handleAddSeries = () => {
    if (!modality) return;
    const newSeries = createEmptySeries(modality);
    onChange([...series, newSeries]);
  };

  const handleRemoveSeries = (id: string) => {
    onChange(series.filter((s) => s.id !== id));
  };

  const handleUpdateSeries = (id: string, updates: Partial<WorkoutSeries>) => {
    onChange(series.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  if (!modality) {
    return (
      <div className="p-4 ceramic-inset rounded-lg text-center">
        <p className="text-sm text-ceramic-text-secondary">
          Selecione uma modalidade para adicionar séries
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {series.map((s, idx) => (
        <SeriesCard
          key={s.id}
          series={s}
          index={idx}
          modality={modality}
          onUpdate={(updates) => handleUpdateSeries(s.id, updates)}
          onRemove={() => handleRemoveSeries(s.id)}
          canRemove={series.length > 1}
        />
      ))}

      <button
        type="button"
        onClick={handleAddSeries}
        className="w-full flex items-center justify-center gap-2 p-3 ceramic-card hover:bg-white/50 rounded-lg transition-colors border-2 border-dashed border-ceramic-text-secondary/20"
      >
        <Plus className="w-5 h-5 text-ceramic-accent" />
        <span className="font-medium text-ceramic-text-primary">Adicionar Série</span>
      </button>
    </div>
  );
}

// ============================================================================
// SERIES CARD WRAPPER
// ============================================================================

interface SeriesCardProps {
  series: WorkoutSeries;
  index: number;
  modality: TrainingModality;
  onUpdate: (updates: Partial<WorkoutSeries>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function SeriesCard({ series, index, modality, onUpdate, onRemove, canRemove }: SeriesCardProps) {
  return (
    <div className="ceramic-card p-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-ceramic-accent text-white flex items-center justify-center text-sm font-bold">
            {index + 1}
          </div>
          <span className="text-sm font-medium text-ceramic-text-secondary">Série</span>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-ceramic-error/10 text-ceramic-error transition-colors"
            title="Remover série"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Modality-specific form */}
      <div className="space-y-3">
        {(modality === 'running' || modality === 'walking') && (
          <RunningSeriesForm series={series as RunningSeries} onUpdate={onUpdate} />
        )}
        {modality === 'swimming' && <SwimmingSeriesForm series={series as SwimmingSeries} onUpdate={onUpdate} />}
        {modality === 'cycling' && <CyclingSeries series={series as CyclingSeries} onUpdate={onUpdate} />}
        {modality === 'strength' && <StrengthSeriesForm series={series as StrengthSeries} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}

// ============================================================================
// RUNNING/WALKING FORM
// ============================================================================

interface RunningSeriesFormProps {
  series: RunningSeries;
  onUpdate: (updates: Partial<RunningSeries>) => void;
}

function RunningSeriesForm({ series, onUpdate }: RunningSeriesFormProps) {
  return (
    <>
      {/* Work Value + Unit Selection */}
      <div>
        <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Trabalho</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="1"
            value={series.work_value}
            onChange={(e) => onUpdate({ work_value: parseFloat(e.target.value) || 0 })}
            className="flex-1 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
          />

          {/* Unit radio buttons */}
          <div className="flex gap-1">
            {(['minutes', 'seconds', 'meters'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => onUpdate({ work_unit: unit })}
                className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                  series.work_unit === unit
                    ? 'bg-ceramic-accent text-white'
                    : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
                }`}
              >
                {unit === 'minutes' ? 'min' : unit === 'seconds' ? 'seg' : 'm'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Selector */}
      <ZoneSelector zone={series.zone} onChange={(zone) => onUpdate({ zone })} />

      {/* Rest */}
      <RestInput
        value={series.rest_value}
        unit={series.rest_unit}
        onValueChange={(value) => onUpdate({ rest_value: value })}
        onUnitChange={(unit) => onUpdate({ rest_unit: unit })}
      />
    </>
  );
}

// ============================================================================
// SWIMMING FORM
// ============================================================================

interface SwimmingSeriesFormProps {
  series: SwimmingSeries;
  onUpdate: (updates: Partial<SwimmingSeries>) => void;
}

function SwimmingSeriesForm({ series, onUpdate }: SwimmingSeriesFormProps) {
  return (
    <>
      {/* Distance */}
      <div>
        <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Distância (metros)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="25"
            value={series.distance_meters}
            onChange={(e) => onUpdate({ distance_meters: parseFloat(e.target.value) || 0 })}
            className="flex-1 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
          />
          <span className="text-xs text-ceramic-text-secondary">m</span>
        </div>
      </div>

      {/* Zone Selector */}
      <ZoneSelector zone={series.zone} onChange={(zone) => onUpdate({ zone })} />

      {/* Rest */}
      <RestInput
        value={series.rest_value}
        unit={series.rest_unit}
        onValueChange={(value) => onUpdate({ rest_value: value })}
        onUnitChange={(unit) => onUpdate({ rest_unit: unit })}
      />
    </>
  );
}

// ============================================================================
// CYCLING FORM
// ============================================================================

interface CyclingSeriesProps {
  series: CyclingSeries;
  onUpdate: (updates: Partial<CyclingSeries>) => void;
}

function CyclingSeries({ series, onUpdate }: CyclingSeriesProps) {
  return (
    <>
      {/* Work Type (Time or Distance) */}
      <div>
        <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Tipo de Trabalho</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onUpdate({ work_unit: 'time', unit_detail: 'minutes' })}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              series.work_unit === 'time'
                ? 'bg-ceramic-accent text-white'
                : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
            }`}
          >
            <Clock className="w-4 h-4 mx-auto mb-1" />
            Tempo
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ work_unit: 'distance', unit_detail: 'meters' })}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              series.work_unit === 'distance'
                ? 'bg-ceramic-accent text-white'
                : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
            }`}
          >
            <Zap className="w-4 h-4 mx-auto mb-1" />
            Distância
          </button>
        </div>
      </div>

      {/* Work Value (conditional unit) */}
      <div>
        <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">
          {series.work_unit === 'time' ? 'Duração' : 'Distância'}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="1"
            value={series.work_value}
            onChange={(e) => onUpdate({ work_value: parseFloat(e.target.value) || 0 })}
            className="flex-1 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
          />

          {/* Conditional unit toggle */}
          {series.work_unit === 'time' ? (
            <div className="flex gap-1">
              {(['minutes', 'seconds'] as TimeUnit[]).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => onUpdate({ unit_detail: unit })}
                  className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                    series.unit_detail === unit
                      ? 'bg-ceramic-accent text-white'
                      : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
                  }`}
                >
                  {unit === 'minutes' ? 'min' : 'seg'}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs text-ceramic-text-secondary">m</span>
          )}
        </div>
      </div>

      {/* Zone Selector */}
      <ZoneSelector zone={series.zone} onChange={(zone) => onUpdate({ zone })} />

      {/* Rest */}
      <RestInput
        value={series.rest_value}
        unit={series.rest_unit}
        onValueChange={(value) => onUpdate({ rest_value: value })}
        onUnitChange={(unit) => onUpdate({ rest_unit: unit })}
      />
    </>
  );
}

// ============================================================================
// STRENGTH FORM
// ============================================================================

interface StrengthSeriesFormProps {
  series: StrengthSeries;
  onUpdate: (updates: Partial<StrengthSeries>) => void;
}

function StrengthSeriesForm({ series, onUpdate }: StrengthSeriesFormProps) {
  return (
    <>
      {/* Reps */}
      <div>
        <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Repetições</label>
        <input
          type="number"
          min="0"
          step="1"
          value={series.reps}
          onChange={(e) => onUpdate({ reps: parseInt(e.target.value) || 0 })}
          className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
        />
      </div>

      {/* Load (kg) */}
      <div>
        <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Carga (kg)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.5"
            value={series.load_kg}
            onChange={(e) => onUpdate({ load_kg: parseFloat(e.target.value) || 0 })}
            className="flex-1 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
          />
          <span className="text-xs text-ceramic-text-secondary">kg</span>
        </div>
      </div>

      {/* Rest */}
      <RestInput
        value={series.rest_value}
        unit={series.rest_unit}
        onValueChange={(value) => onUpdate({ rest_value: value })}
        onUnitChange={(unit) => onUpdate({ rest_unit: unit })}
      />
    </>
  );
}

// ============================================================================
// ZONE SELECTOR (Shared component for cardio)
// ============================================================================

interface ZoneSelectorProps {
  zone: IntensityZone;
  onChange: (zone: IntensityZone) => void;
}

function ZoneSelector({ zone, onChange }: ZoneSelectorProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Zona de Intensidade</label>
      <div className="grid grid-cols-5 gap-1.5">
        {(['Z1', 'Z2', 'Z3', 'Z4', 'Z5'] as IntensityZone[]).map((z) => {
          const config = ZONE_CONFIGS[z];
          return (
            <button
              key={z}
              type="button"
              onClick={() => onChange(z)}
              className={`px-2 py-3 rounded-lg text-xs font-bold transition-all ${config.color} ${
                zone === z ? 'ring-2 ring-ceramic-text-primary shadow-lg scale-105' : 'opacity-70 hover:opacity-100'
              } text-white`}
              title={`${z} (${config.range})`}
            >
              {z}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-ceramic-text-secondary">{ZONE_CONFIGS[zone].range}</p>
    </div>
  );
}

// ============================================================================
// REST INPUT (Shared component)
// ============================================================================

interface RestInputProps {
  value: number;
  unit: TimeUnit;
  onValueChange: (value: number) => void;
  onUnitChange: (unit: TimeUnit) => void;
}

function RestInput({ value, unit, onValueChange, onUnitChange }: RestInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Descanso</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
          className="flex-1 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
        />

        {/* Unit radio buttons */}
        <div className="flex gap-1">
          {(['minutes', 'seconds'] as TimeUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => onUnitChange(u)}
              className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                unit === u
                  ? 'bg-ceramic-accent text-white'
                  : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
              }`}
            >
              {u === 'minutes' ? 'min' : 'seg'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
