/**
 * IntervalsEditor Component
 *
 * Editor for cardio interval exercise structure:
 * - Multiple intervals with distance/duration/rest/intensity
 * - Add/remove intervals
 * - Total distance/time calculations
 * - Visual timeline preview
 */

import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { ExerciseStructure, IntervalSet } from '../../types/flow';

interface IntervalsEditorProps {
  structure: ExerciseStructure | undefined;
  onChange: (structure: ExerciseStructure) => void;
}

const DEFAULT_INTERVAL: IntervalSet = {
  duration: 300, // 5 minutes or 500m
  intensity: 80, // percentage
  rest: 60, // seconds
  repetitions: 1,
};

export default function IntervalsEditor({ structure, onChange }: IntervalsEditorProps) {
  const intervals = structure?.intervals || [DEFAULT_INTERVAL];

  const handleAddInterval = () => {
    onChange({
      ...structure,
      intervals: [...intervals, { ...DEFAULT_INTERVAL }],
    });
  };

  const handleRemoveInterval = (index: number) => {
    if (intervals.length === 1) return; // Keep at least one interval
    onChange({
      ...structure,
      intervals: intervals.filter((_, i) => i !== index),
    });
  };

  const handleChangeInterval = (index: number, field: keyof IntervalSet, value: number) => {
    const updated = [...intervals];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange({
      ...structure,
      intervals: updated,
    });
  };

  // Calculate totals
  const totalDistance = intervals.reduce((sum, interval) => {
    return sum + interval.duration * interval.repetitions;
  }, 0);

  const totalTime = intervals.reduce((sum, interval) => {
    // Approximate time based on duration + rest
    return sum + (interval.duration + interval.rest) * interval.repetitions;
  }, 0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 ceramic-inset rounded-lg">
          <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider mb-1">
            Intervalos
          </p>
          <p className="text-lg font-bold text-ceramic-text-primary">{intervals.length}</p>
        </div>
        <div className="p-3 ceramic-inset rounded-lg">
          <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider mb-1">
            Dist. Total
          </p>
          <p className="text-lg font-bold text-ceramic-text-primary">
            {totalDistance >= 1000 ? `${(totalDistance / 1000).toFixed(1)}km` : `${totalDistance}m`}
          </p>
        </div>
        <div className="p-3 ceramic-inset rounded-lg">
          <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider mb-1">
            Tempo Aprox.
          </p>
          <p className="text-lg font-bold text-ceramic-text-primary">{formatTime(totalTime)}</p>
        </div>
      </div>

      {/* Intervals List */}
      <div className="space-y-3">
        {intervals.map((interval, index) => (
          <div
            key={index}
            className="p-4 ceramic-card border-l-4"
            style={{
              borderLeftColor:
                interval.intensity >= 90
                  ? '#ef4444'
                  : interval.intensity >= 75
                  ? '#f59e0b'
                  : '#10b981',
            }}
          >
            {/* Interval Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-ceramic-text-secondary" />
                <span className="text-sm font-bold text-ceramic-text-primary">
                  Intervalo {index + 1}
                </span>
              </div>
              {intervals.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveInterval(index)}
                  className="p-1 hover:bg-ceramic-error/10 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-ceramic-error" />
                </button>
              )}
            </div>

            {/* Interval Fields */}
            <div className="grid grid-cols-2 gap-3">
              {/* Duration */}
              <div>
                <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">
                  Duração (seg ou metros)
                </label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={interval.duration}
                  onChange={(e) =>
                    handleChangeInterval(index, 'duration', parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                />
              </div>

              {/* Intensity */}
              <div>
                <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">
                  Intensidade (%)
                </label>
                <input
                  type="number"
                  min="40"
                  max="120"
                  value={interval.intensity}
                  onChange={(e) =>
                    handleChangeInterval(index, 'intensity', parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                />
              </div>

              {/* Rest */}
              <div>
                <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">
                  Descanso (seg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={interval.rest}
                  onChange={(e) =>
                    handleChangeInterval(index, 'rest', parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                />
              </div>

              {/* Repetitions */}
              <div>
                <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">
                  Repetições
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={interval.repetitions}
                  onChange={(e) =>
                    handleChangeInterval(index, 'repetitions', parseInt(e.target.value) || 1)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                />
              </div>
            </div>

            {/* Interval Preview */}
            <div className="mt-2 p-2 bg-white/30 rounded text-xs text-ceramic-text-secondary">
              {interval.repetitions}x {interval.duration}
              {interval.duration > 600 ? 'm' : 's'} @ {interval.intensity}% (
              {interval.rest}s descanso)
            </div>
          </div>
        ))}
      </div>

      {/* Add Interval Button */}
      <button
        type="button"
        onClick={handleAddInterval}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 ceramic-inset hover:bg-white/50 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4 text-ceramic-accent" />
        <span className="text-sm font-medium text-ceramic-text-primary">Adicionar Intervalo</span>
      </button>

      {/* Visual Timeline (simplified) */}
      <div className="p-4 ceramic-card">
        <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider mb-2">
          Timeline Visual
        </p>
        <div className="flex items-center gap-1 overflow-x-auto">
          {intervals.map((interval, index) => (
            <React.Fragment key={index}>
              {/* Work Block */}
              <div
                className="flex-shrink-0 h-8 rounded"
                style={{
                  width: `${Math.max(20, interval.duration / 10)}px`,
                  backgroundColor:
                    interval.intensity >= 90
                      ? '#ef4444'
                      : interval.intensity >= 75
                      ? '#f59e0b'
                      : '#10b981',
                }}
                title={`${interval.duration}s @ ${interval.intensity}%`}
              />
              {/* Rest Block */}
              {interval.rest > 0 && (
                <div
                  className="flex-shrink-0 h-8 bg-ceramic-text-secondary/20 rounded"
                  style={{ width: `${Math.max(10, interval.rest / 10)}px` }}
                  title={`${interval.rest}s rest`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
