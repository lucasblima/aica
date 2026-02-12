/**
 * DistanceTimeEditor Component
 *
 * Editor for continuous endurance/recovery exercise structure:
 * - Distance (meters/km)
 * - Target time (seconds/minutes)
 * - Auto-calculate pace/speed
 * - Description field
 */

import React from 'react';
import type { ExerciseStructure } from '../../types/flow';

interface DistanceTimeEditorProps {
  structure: ExerciseStructure | undefined;
  onChange: (structure: ExerciseStructure) => void;
  modality?: string; // For unit conversion
}

export default function DistanceTimeEditor({
  structure,
  onChange,
  modality,
}: DistanceTimeEditorProps) {
  const distance = structure?.distance || 5000; // meters
  const targetTime = structure?.target_time || 1800; // seconds (30 min)
  const description = structure?.description || '';

  const handleChange = (field: keyof ExerciseStructure, value: any) => {
    onChange({
      ...structure,
      [field]: value,
    });
  };

  // Calculate pace (min/km for running, min/100m for swimming)
  const calculatePace = (): string => {
    if (!distance || !targetTime) return '—';

    if (modality === 'swimming') {
      // Pace per 100m
      const paceSeconds = (targetTime / distance) * 100;
      const mins = Math.floor(paceSeconds / 60);
      const secs = Math.round(paceSeconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}/100m`;
    } else {
      // Pace per km (running/cycling)
      const paceSeconds = (targetTime / distance) * 1000;
      const mins = Math.floor(paceSeconds / 60);
      const secs = Math.round(paceSeconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}/km`;
    }
  };

  // Calculate speed (km/h for running/cycling, m/min for swimming)
  const calculateSpeed = (): string => {
    if (!distance || !targetTime) return '—';

    if (modality === 'swimming') {
      const metersPerMin = (distance / targetTime) * 60;
      return `${metersPerMin.toFixed(1)} m/min`;
    } else {
      const kmPerHour = (distance / targetTime) * 3.6;
      return `${kmPerHour.toFixed(1)} km/h`;
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min ${secs}s`;
  };

  const distanceInKm = distance / 1000;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="p-4 ceramic-inset rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ceramic-text-secondary">Distância</span>
          <span className="text-lg font-bold text-ceramic-text-primary">
            {distanceInKm >= 1 ? `${distanceInKm.toFixed(2)} km` : `${distance} m`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-ceramic-text-secondary">Tempo Alvo</span>
          <span className="text-lg font-bold text-ceramic-text-primary">
            {formatTime(targetTime)}
          </span>
        </div>
        <div className="pt-2 border-t border-ceramic-text-secondary/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-ceramic-text-secondary">Ritmo</span>
            <span className="text-sm font-medium text-ceramic-accent">{calculatePace()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ceramic-text-secondary">Velocidade</span>
            <span className="text-sm font-medium text-ceramic-accent">{calculateSpeed()}</span>
          </div>
        </div>
      </div>

      {/* Distance Input */}
      <div>
        <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
          Distância <span className="text-ceramic-error">*</span>
        </label>

        {/* Quick Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          {modality === 'swimming'
            ? [500, 1000, 1500, 2000].map((meters) => (
                <button
                  key={meters}
                  type="button"
                  onClick={() => handleChange('distance', meters)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    distance === meters
                      ? 'bg-ceramic-accent text-white'
                      : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
                  }`}
                >
                  {meters}m
                </button>
              ))
            : [5000, 10000, 21097, 42195].map((meters) => (
                <button
                  key={meters}
                  type="button"
                  onClick={() => handleChange('distance', meters)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    distance === meters
                      ? 'bg-ceramic-accent text-white'
                      : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
                  }`}
                >
                  {meters >= 1000 ? `${meters / 1000}km` : `${meters}m`}
                </button>
              ))}
        </div>

        {/* Custom Input */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="100"
            step="100"
            value={distance}
            onChange={(e) => handleChange('distance', parseInt(e.target.value) || 0)}
            className="flex-1 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
          />
          <span className="text-sm text-ceramic-text-secondary">metros</span>
        </div>
      </div>

      {/* Target Time Input */}
      <div>
        <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
          Tempo Alvo <span className="text-ceramic-error">*</span>
        </label>

        {/* Quick Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          {[1800, 2700, 3600, 5400].map((seconds) => (
            <button
              key={seconds}
              type="button"
              onClick={() => handleChange('target_time', seconds)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                targetTime === seconds
                  ? 'bg-ceramic-accent text-white'
                  : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
              }`}
            >
              {formatTime(seconds)}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-ceramic-text-secondary mb-1">Minutos</label>
            <input
              type="number"
              min="0"
              max="600"
              value={Math.floor(targetTime / 60)}
              onChange={(e) => {
                const mins = parseInt(e.target.value) || 0;
                const secs = targetTime % 60;
                handleChange('target_time', mins * 60 + secs);
              }}
              className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            />
          </div>
          <div>
            <label className="block text-xs text-ceramic-text-secondary mb-1">Segundos</label>
            <input
              type="number"
              min="0"
              max="59"
              value={targetTime % 60}
              onChange={(e) => {
                const mins = Math.floor(targetTime / 60);
                const secs = parseInt(e.target.value) || 0;
                handleChange('target_time', mins * 60 + secs);
              }}
              className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
          Instruções Adicionais{' '}
          <span className="text-ceramic-text-secondary text-xs">(opcional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Ex: Manter ritmo constante, focar na técnica..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none"
        />
      </div>
    </div>
  );
}
