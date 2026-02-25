/**
 * SeriesEditor Component (V4)
 *
 * Unified editor for all workout series with modality-specific forms.
 *
 * V4 Changes:
 * - #430: Exercise name input per series, "Repetições" renamed to "Séries"
 * - #427: Cycling distance mode now also shows duration (hours:minutes)
 * - #428: Km/M toggle for distance inputs (swimming, cycling, interval)
 * - #429: Intervalo supports time OR distance mode
 *
 * Field order: Nome do Exercício → Séries → Tipo de Trabalho → Duração/Distância → Zona → Intervalo
 * Duration and Interval use simple min + seg inputs (no unit toggle).
 * "Descanso" renamed to "Intervalo".
 */

import React, { useState } from 'react';
import { Plus, X, Clock, Zap, Ruler } from 'lucide-react';
import type { TrainingModality } from '../../types/flow';
import type {
  WorkoutSeries,
  RunningSeries,
  SwimmingSeries,
  CyclingSeries,
  StrengthSeries,
  IntensityZone,
} from '../../types/series';
import { ZONE_CONFIGS, createEmptySeries } from '../../types/series';

// ============================================================================
// TYPES FOR UI-ONLY STATE (not persisted in series types)
// ============================================================================

type DistanceDisplayUnit = 'km' | 'm';
type IntervalMode = 'time' | 'distance';

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
    onChange(series.map((s) => (s.id === id ? { ...s, ...updates } as WorkoutSeries : s)));
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
  // Local UI state for interval mode (time vs distance)
  const [intervalMode, setIntervalMode] = useState<IntervalMode>(() => {
    // Detect if interval was previously set as distance
    return series.rest_distance_meters && series.rest_distance_meters > 0 ? 'distance' : 'time';
  });

  // Local UI state for interval distance unit
  const [intervalDistUnit, setIntervalDistUnit] = useState<DistanceDisplayUnit>('m');

  return (
    <div className="ceramic-card p-4 relative">
      {/* Header with exercise name input (#430) */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-ceramic-accent text-white flex items-center justify-center text-sm font-bold shrink-0">
            {index + 1}
          </div>
          <input
            type="text"
            value={series.exercise_name || ''}
            onChange={(e) => onUpdate({ exercise_name: e.target.value } as Partial<WorkoutSeries>)}
            placeholder={`Exercício ${index + 1}`}
            className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-sm font-medium text-ceramic-text-primary placeholder:text-ceramic-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
          />
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-ceramic-error/10 text-ceramic-error transition-colors ml-2 shrink-0"
            title="Remover série"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Modality-specific form */}
      <div className="space-y-3">
        {/* Séries count (was "Repetições") — ALL modalities (#430) */}
        <SeriesCountInput
          value={series.repetitions ?? 1}
          onChange={(v) => onUpdate({ repetitions: v })}
        />

        {(modality === 'running' || modality === 'walking') && (
          <RunningFields series={series as RunningSeries} onUpdate={onUpdate} />
        )}
        {modality === 'swimming' && (
          <SwimmingFields series={series as SwimmingSeries} onUpdate={onUpdate} />
        )}
        {modality === 'cycling' && (
          <CyclingFields series={series as CyclingSeries} onUpdate={onUpdate} />
        )}
        {modality === 'strength' && (
          <StrengthFields series={series as StrengthSeries} onUpdate={onUpdate} />
        )}

        {/* Intervalo with time/distance toggle (#429) */}
        <IntervalInput
          minutes={series.rest_minutes ?? 0}
          seconds={series.rest_seconds ?? 0}
          distanceMeters={series.rest_distance_meters || 0}
          intervalMode={intervalMode}
          intervalDistUnit={intervalDistUnit}
          onMinutesChange={(v) => onUpdate({ rest_minutes: v })}
          onSecondsChange={(v) => onUpdate({ rest_seconds: v })}
          onDistanceChange={(meters) => onUpdate({ rest_distance_meters: meters } as Partial<WorkoutSeries>)}
          onModeChange={(mode) => setIntervalMode(mode)}
          onDistUnitChange={(unit) => setIntervalDistUnit(unit)}
          modality={modality}
        />
      </div>
    </div>
  );
}

// ============================================================================
// SHARED: SERIES COUNT INPUT (renamed from "Repetições" — #430)
// ============================================================================

function SeriesCountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Séries</label>
      <input
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 1)}
        className="w-24 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 text-center font-bold"
      />
    </div>
  );
}

// ============================================================================
// SHARED: DISTANCE INPUT WITH Km/M TOGGLE (#428)
// ============================================================================

function DistanceInput({
  label,
  meters,
  onChange,
  stepMeters,
}: {
  label: string;
  meters: number;
  onChange: (meters: number) => void;
  stepMeters: number;
}) {
  const [displayUnit, setDisplayUnit] = useState<DistanceDisplayUnit>('m');

  const displayValue = displayUnit === 'km' ? meters / 1000 : meters;
  const step = displayUnit === 'km' ? 0.1 : stepMeters;

  const handleValueChange = (val: number) => {
    // Always store in meters internally
    const inMeters = displayUnit === 'km' ? Math.round(val * 1000) : val;
    onChange(inMeters);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step={step}
          value={displayValue || ''}
          onChange={(e) => handleValueChange(parseFloat(e.target.value) || 0)}
          placeholder="0"
          className="w-28 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 text-center"
        />
        {/* Unit toggle pills */}
        <div className="flex rounded-lg overflow-hidden border border-ceramic-text-secondary/20">
          <button
            type="button"
            onClick={() => setDisplayUnit('m')}
            className={`px-2.5 py-1.5 text-xs font-medium transition-all ${
              displayUnit === 'm'
                ? 'bg-ceramic-accent text-white'
                : 'bg-white/50 text-ceramic-text-secondary hover:bg-white/80'
            }`}
          >
            M
          </button>
          <button
            type="button"
            onClick={() => setDisplayUnit('km')}
            className={`px-2.5 py-1.5 text-xs font-medium transition-all ${
              displayUnit === 'km'
                ? 'bg-ceramic-accent text-white'
                : 'bg-white/50 text-ceramic-text-secondary hover:bg-white/80'
            }`}
          >
            Km
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SHARED: DURATION INPUT (min + seg)
// ============================================================================

function DurationInput({
  label,
  minutes,
  seconds,
  onMinutesChange,
  onSecondsChange,
}: {
  label: string;
  minutes: number;
  seconds: number;
  onMinutesChange: (v: number) => void;
  onSecondsChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            step="1"
            value={minutes}
            onChange={(e) => onMinutesChange(parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 text-center"
          />
          <span className="text-xs text-ceramic-text-secondary font-medium">min</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            max="59"
            step="1"
            value={seconds}
            onChange={(e) => onSecondsChange(Math.min(59, parseInt(e.target.value) || 0))}
            className="w-16 px-2 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 text-center"
          />
          <span className="text-xs text-ceramic-text-secondary font-medium">seg</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SHARED: HOURS + MINUTES DURATION INPUT (for cycling distance mode — #427)
// ============================================================================

function HoursMinutesDuration({
  label,
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
}: {
  label: string;
  hours: number;
  minutes: number;
  onHoursChange: (v: number) => void;
  onMinutesChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            step="1"
            value={hours}
            onChange={(e) => onHoursChange(parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 text-center"
          />
          <span className="text-xs text-ceramic-text-secondary font-medium">h</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            max="59"
            step="1"
            value={minutes}
            onChange={(e) => onMinutesChange(Math.min(59, parseInt(e.target.value) || 0))}
            className="w-16 px-2 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 text-center"
          />
          <span className="text-xs text-ceramic-text-secondary font-medium">min</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SHARED: INTERVAL INPUT with time/distance toggle (#429)
// ============================================================================

function IntervalInput({
  minutes,
  seconds,
  distanceMeters,
  intervalMode,
  intervalDistUnit,
  onMinutesChange,
  onSecondsChange,
  onDistanceChange,
  onModeChange,
  onDistUnitChange,
  modality,
}: {
  minutes: number;
  seconds: number;
  distanceMeters: number;
  intervalMode: IntervalMode;
  intervalDistUnit: DistanceDisplayUnit;
  onMinutesChange: (v: number) => void;
  onSecondsChange: (v: number) => void;
  onDistanceChange: (meters: number) => void;
  onModeChange: (mode: IntervalMode) => void;
  onDistUnitChange: (unit: DistanceDisplayUnit) => void;
  modality: TrainingModality;
}) {
  // Determine step for distance based on modality
  const distStep = modality === 'swimming' ? 25 : 100;

  const distDisplayValue = intervalDistUnit === 'km' ? distanceMeters / 1000 : distanceMeters;
  const distDisplayStep = intervalDistUnit === 'km' ? 0.1 : distStep;

  const handleDistValueChange = (val: number) => {
    const inMeters = intervalDistUnit === 'km' ? Math.round(val * 1000) : val;
    onDistanceChange(inMeters);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Intervalo</label>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => onModeChange('time')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
            intervalMode === 'time'
              ? 'bg-ceramic-accent text-white'
              : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Tempo
        </button>
        <button
          type="button"
          onClick={() => onModeChange('distance')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
            intervalMode === 'distance'
              ? 'bg-ceramic-accent text-white'
              : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          Distância
        </button>
      </div>

      {/* Time mode */}
      {intervalMode === 'time' ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              step="1"
              value={minutes}
              onChange={(e) => onMinutesChange(parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 text-center"
            />
            <span className="text-xs text-ceramic-text-secondary font-medium">min</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="59"
              step="1"
              value={seconds}
              onChange={(e) => onSecondsChange(Math.min(59, parseInt(e.target.value) || 0))}
              className="w-16 px-2 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 text-center"
            />
            <span className="text-xs text-ceramic-text-secondary font-medium">seg</span>
          </div>
        </div>
      ) : (
        /* Distance mode */
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step={distDisplayStep}
            value={distDisplayValue || ''}
            onChange={(e) => handleDistValueChange(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-28 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 text-center"
          />
          {/* Unit toggle pills */}
          <div className="flex rounded-lg overflow-hidden border border-ceramic-text-secondary/20">
            <button
              type="button"
              onClick={() => onDistUnitChange('m')}
              className={`px-2.5 py-1.5 text-xs font-medium transition-all ${
                intervalDistUnit === 'm'
                  ? 'bg-ceramic-accent text-white'
                  : 'bg-white/50 text-ceramic-text-secondary hover:bg-white/80'
              }`}
            >
              M
            </button>
            <button
              type="button"
              onClick={() => onDistUnitChange('km')}
              className={`px-2.5 py-1.5 text-xs font-medium transition-all ${
                intervalDistUnit === 'km'
                  ? 'bg-ceramic-accent text-white'
                  : 'bg-white/50 text-ceramic-text-secondary hover:bg-white/80'
              }`}
            >
              Km
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ZONE SELECTOR (Shared for cardio)
// ============================================================================

function ZoneSelector({ zone, onChange }: { zone: IntensityZone; onChange: (z: IntensityZone) => void }) {
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
// RUNNING/WALKING FIELDS (Duration -> Zone)
// ============================================================================

function RunningFields({ series, onUpdate }: { series: RunningSeries; onUpdate: (u: Partial<RunningSeries>) => void }) {
  // Convert legacy work_value to min/seg
  const durationMin = series.work_unit === 'minutes' ? Math.floor(series.work_value) : Math.floor(series.work_value / 60);
  const durationSec = series.work_unit === 'minutes' ? 0 : Math.round(series.work_value % 60);

  return (
    <>
      <DurationInput
        label="Duração"
        minutes={durationMin}
        seconds={durationSec}
        onMinutesChange={(min) => onUpdate({ work_value: min, work_unit: 'minutes' })}
        onSecondsChange={(sec) => {
          // Store total seconds
          onUpdate({ work_value: durationMin * 60 + sec, work_unit: 'seconds' });
        }}
      />
      <ZoneSelector zone={series.zone} onChange={(zone) => onUpdate({ zone })} />
    </>
  );
}

// ============================================================================
// SWIMMING FIELDS (Distance -> Zone) with Km/M toggle (#428)
// ============================================================================

function SwimmingFields({ series, onUpdate }: { series: SwimmingSeries; onUpdate: (u: Partial<SwimmingSeries>) => void }) {
  return (
    <>
      <DistanceInput
        label="Distância"
        meters={series.distance_meters || 0}
        onChange={(meters) => onUpdate({ distance_meters: meters })}
        stepMeters={25}
      />
      <ZoneSelector zone={series.zone} onChange={(zone) => onUpdate({ zone })} />
    </>
  );
}

// ============================================================================
// CYCLING FIELDS (Work Type -> Duration/Distance -> Zone) with #427 + #428
// ============================================================================

function CyclingFields({ series, onUpdate }: { series: CyclingSeries; onUpdate: (u: Partial<CyclingSeries>) => void }) {
  const isTime = series.work_unit === 'time';

  // Duration in min/seg for time mode
  const durationMin = isTime && series.unit_detail === 'minutes'
    ? Math.floor(series.work_value)
    : isTime ? Math.floor(series.work_value / 60) : 0;
  const durationSec = isTime && series.unit_detail === 'minutes'
    ? 0
    : isTime ? Math.round(series.work_value % 60) : 0;

  // For distance mode: read cycling duration from extra fields (#427)
  const cyclingSeries = series as CyclingSeries;
  const cyclingDurationHours = cyclingSeries.cycling_duration_hours || 0;
  const cyclingDurationMinutes = cyclingSeries.cycling_duration_minutes || 0;

  return (
    <>
      {/* Work Type Toggle */}
      <div>
        <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Tipo de Trabalho</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onUpdate({ work_unit: 'time', unit_detail: 'minutes' })}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              isTime
                ? 'bg-ceramic-accent text-white'
                : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
            }`}
          >
            <Clock className="w-4 h-4" />
            Tempo
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ work_unit: 'distance', unit_detail: 'meters' })}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              !isTime
                ? 'bg-ceramic-accent text-white'
                : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
            }`}
          >
            <Zap className="w-4 h-4" />
            Distância
          </button>
        </div>
      </div>

      {/* Duration (time mode) or Distance + Duration (distance mode) */}
      {isTime ? (
        <DurationInput
          label="Duração"
          minutes={durationMin}
          seconds={durationSec}
          onMinutesChange={(min) => onUpdate({ work_value: min, unit_detail: 'minutes' })}
          onSecondsChange={(sec) => {
            onUpdate({ work_value: durationMin * 60 + sec, unit_detail: 'seconds' });
          }}
        />
      ) : (
        <>
          {/* Distance with Km/M toggle (#428) */}
          <DistanceInput
            label="Distância"
            meters={series.work_value || 0}
            onChange={(meters) => onUpdate({ work_value: meters })}
            stepMeters={100}
          />

          {/* Duration alongside distance (#427) */}
          <HoursMinutesDuration
            label="Tempo"
            hours={cyclingDurationHours}
            minutes={cyclingDurationMinutes}
            onHoursChange={(h) => onUpdate({ cycling_duration_hours: h } as Partial<CyclingSeries>)}
            onMinutesChange={(m) => onUpdate({ cycling_duration_minutes: m } as Partial<CyclingSeries>)}
          />
        </>
      )}

      <ZoneSelector zone={series.zone} onChange={(zone) => onUpdate({ zone })} />
    </>
  );
}

// ============================================================================
// STRENGTH FIELDS (Reps -> Load)
// ============================================================================

function StrengthFields({ series, onUpdate }: { series: StrengthSeries; onUpdate: (u: Partial<StrengthSeries>) => void }) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Reps do Exercício</label>
        <input
          type="number"
          min="0"
          step="1"
          value={series.reps || ''}
          onChange={(e) => onUpdate({ reps: parseInt(e.target.value) || 0 })}
          placeholder="0"
          className="w-24 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 text-center"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Carga (kg)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.5"
            value={series.load_kg || ''}
            onChange={(e) => onUpdate({ load_kg: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className="w-24 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 text-center"
          />
          <span className="text-xs text-ceramic-text-secondary font-medium">kg</span>
        </div>
      </div>
    </>
  );
}
